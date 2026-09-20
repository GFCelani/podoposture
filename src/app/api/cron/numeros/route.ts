import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { lerPublicados } from "@/lib/conteudo-db";
import { exigirSegredoDoCron, statusDoCron } from "@/lib/cron";
import { executarColeta, type MemoriaDoBanco, type Resumo } from "@/lib/execucao-do-cron";
import { coletarBusca, configDaBusca } from "@/lib/fonte-search-console";
import { coletarVercel, configDaVercel } from "@/lib/fonte-vercel";
import {
  diasSeguidosComFalha,
  falhasDeHoje,
  gravarLinhas,
  podarNumeros,
  primeiroDiaGuardado,
  registrarCachePulado,
  registrarColeta,
} from "@/lib/numeros-db";
import { janelaDaColeta, type Fonte } from "@/lib/numeros-tipos";
import { bancoConfigurado, lerComDisjuntor, podarDadosDoPainel } from "@/lib/painel-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * A coleta diaria dos numeros — e a unica porta por onde o site fala com a
 * Vercel e com o Google.
 *
 * Chamada pelo agendador da Vercel (`vercel.json`) todo dia as 9h UTC, 6h em
 * Brasilia. Sem parametro refaz os ultimos 5 dias; com `?desde=AAAA-MM-DD`
 * traz um lote do historico e responde `proximoDesde` para o lote seguinte.
 *
 * Cada fonte segue sozinha: sem credencial ela e pulada e registrada como
 * "nao-configurada" (nao e falha), e a falha de uma nao impede a outra. O
 * roteiro e os prazos de cada etapa estao em lib/execucao-do-cron.ts.
 */

/** Reserva, dentro dos 60 s, para montar e devolver a resposta quando o prazo total acaba. */
const FOLGA_PARA_RESPONDER_MS = 3_000;

/** O teto de espera pelo Telegram, quando o prazo do aviso ainda permite. */
const TEMPO_DO_TELEGRAM_MS = 5_000;

/** Vive enquanto a instancia vive, como a conexao do driver cuja espera ela explica. */
const memoriaDoBanco: MemoriaDoBanco = { recusouEm: null };

const NOME_DA_FONTE: Record<Fonte, string> = {
  vercel: "visitas (Vercel)",
  busca: "buscas no Google (Search Console)",
};

/**
 * Aviso secundario. O principal e a propria tela, que nao depende de
 * configuracao nenhuma. Este so dispara na SEGUNDA noite seguida de falha:
 * uma noite perdida se conserta sozinha na seguinte, e avisar nela treinaria
 * quem recebe a ignorar o aviso. Da terceira em diante tambem nao repete, e
 * uma segunda execucao na mesma noite (o agendador pode duplicar) tambem nao.
 */
async function avisarSeFalhouDuasNoites(resumos: Resumo[], prazo: number): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) return;

  const fontes: string[] = [];
  for (const resumo of resumos) {
    if (resumo.situacao !== "erro") continue;
    const [seguidos, hoje] = await Promise.all([
      diasSeguidosComFalha(resumo.fonte).catch(() => 0),
      falhasDeHoje(resumo.fonte).catch(() => 0),
    ]);
    if (seguidos === 2 && hoje === 1) fontes.push(NOME_DA_FONTE[resumo.fonte]);
  }
  if (fontes.length === 0) return;

  try {
    const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text:
          `Podoposture: a coleta de ${fontes.join(" e ")} falhou pela segunda noite seguida. ` +
          "Veja a aba Números do painel e o log da função /api/cron/numeros.",
      }),
      // Nunca alem do prazo do aviso: o que vem depois dele e a prova de leitura.
      signal: AbortSignal.timeout(Math.max(1, Math.min(TEMPO_DO_TELEGRAM_MS, prazo - Date.now()))),
    });
    if (!resposta.ok) console.error("[cron] Telegram respondeu", resposta.status);
  } catch (erro) {
    // So o nome do erro: a mensagem de falha de rede pode trazer o endereco,
    // e o endereco carrega o token do bot.
    console.error("[cron] aviso por Telegram falhou:", (erro as Error)?.name);
  }
}

export async function GET(req: Request) {
  const negado = exigirSegredoDoCron(req);
  if (negado) return negado;

  if (!bancoConfigurado()) {
    return NextResponse.json(
      { erro: "O banco de dados ainda não está configurado neste servidor." },
      { status: 503 },
    );
  }

  const inicio = Date.now();
  const janela = janelaDaColeta(new Date(inicio), new URL(req.url).searchParams.get("desde"));
  if ("erro" in janela) return NextResponse.json({ erro: janela.erro }, { status: 400 });

  // Prazo total abaixo do maxDuration. Com o banco travado (conexao aceita e
  // nenhuma resposta) cada gravacao esperava para sempre e a execucao levava
  // 80 s ate cair pelo limite da plataforma, sem resposta e sem log do motivo.
  const feito = await executarColeta({
    inicio,
    limiteMs: maxDuration * 1000 - FOLGA_PARA_RESPONDER_MS,
    historico: janela.historico,
    vercel: janela.vercel,
    busca: janela.busca,
    memoria: memoriaDoBanco,
    passos: {
      primeiroDiaGuardado,
      coletar: async (fonte, intervalo, { prazo, guardadoDesde }) => {
        if (fonte === "vercel") {
          const cfg = configDaVercel();
          return cfg ? coletarVercel(cfg, intervalo, { prazo, guardadoDesde }) : null;
        }
        const cfg = configDaBusca();
        return cfg ? coletarBusca(cfg, intervalo, { prazo }) : null;
      },
      gravarLinhas,
      registrarColeta,
      podarNumeros,
      podarDadosDoPainel,
      avisarSeFalhouDuasNoites,
      // A mesma leitura publica que a home faz, pelo mesmo disjuntor. Autocura
      // so na coleta da noite: o backfill roda em lotes seguidos, e invalidar o
      // site a cada lote seria desperdicio.
      provarLeitura: () => lerComDisjuntor(lerPublicados),
      // Chamado so no fim da execucao, e so se nada estourou nem falhou no banco.
      invalidar: () => revalidatePath("/", "layout"),
      anotarQuePulou: registrarCachePulado,
    },
  });

  const { cacheInvalidado, podaFalhou, resumos, prazoEsgotado, gravacaoFalhou } = feito;
  const coletaFalhou = prazoEsgotado || resumos.some((r) => r.situacao === "erro");
  return NextResponse.json(
    {
      fontes: resumos,
      historico: janela.historico,
      ajustadoAoTeto: janela.ajustadoAoTeto,
      // Lote que nao conseguiu gravar repete o proprio inicio: seguir com o
      // proximo deixaria esses dias de fora sem registro nenhum.
      proximoDesde: janela.historico && gravacaoFalhou ? (janela.vercel?.inicio ?? null) : janela.proximoDesde,
      // Na resposta, e nao so no diario: e o que aparece no log da execucao.
      cacheInvalidado,
      podaFalhou,
      prazoEsgotado,
    },
    // 502 deixa a falha visivel no painel de execucoes da Vercel, que olha o
    // status — a coleta que falhou, a gravacao que falhou, a autocura pulada e a
    // poda que falhou. A gravacao entra por fora de `coletaFalhou` porque o corte
    // com o banco recusando conexao nao deixa resumo nenhum para trair a falha.
    { status: statusDoCron({ coletaFalhou, cacheInvalidado, podaFalhou, gravacaoFalhou }) },
  );
}
