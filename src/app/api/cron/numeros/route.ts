import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { lerPublicados } from "@/lib/conteudo-db";
import { exigirSegredoDoCron, invalidarCacheSeOBancoResponde, statusDoCron } from "@/lib/cron";
import { PrazoEsgotado, comPrazo } from "@/lib/disjuntor";
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
import {
  janelaDaColeta,
  type Fonte,
  type Intervalo,
  type ResultadoDaColeta,
  type SituacaoDaColeta,
} from "@/lib/numeros-tipos";
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
 * "nao-configurada" (nao e falha), e a falha de uma nao impede a outra.
 */

/** Reserva, dentro dos 60 s, para gravar o que chegou depois que as chamadas param. */
const FOLGA_PARA_GRAVAR_MS = 12_000;

/** Reserva, dentro dos 60 s, para montar e devolver a resposta quando o prazo total acaba. */
const FOLGA_PARA_RESPONDER_MS = 3_000;

const NOME_DA_FONTE: Record<Fonte, string> = {
  vercel: "visitas (Vercel)",
  busca: "buscas no Google (Search Console)",
};

type Resumo = {
  fonte: Fonte;
  situacao: SituacaoDaColeta;
  intervalo: Intervalo;
  linhas: number;
  ate: string | null;
  erro: string | null;
};

/**
 * O que a execucao conseguiu fazer. `cacheInvalidado` e `podaFalhou` ficam null
 * quando nao foram tentados (lote de historico, ou prazo esgotado antes).
 */
type Feito = { cacheInvalidado: boolean | null; podaFalhou: boolean | null; resumos: Resumo[] };

/** O coletor da fonte, ou null quando a credencial nao existe. */
async function coletor(fonte: Fonte, intervalo: Intervalo, prazo: number): Promise<ResultadoDaColeta | null> {
  if (fonte === "vercel") {
    const cfg = configDaVercel();
    if (!cfg) return null;
    return coletarVercel(cfg, intervalo, { prazo, guardadoDesde: await primeiroDiaGuardado("vercel") });
  }
  const cfg = configDaBusca();
  return cfg ? coletarBusca(cfg, intervalo, { prazo }) : null;
}

async function processar(
  fonte: Fonte,
  intervalo: Intervalo | null,
  prazo: number,
  historico: boolean,
): Promise<Resumo | null> {
  if (!intervalo) return null;
  try {
    const resultado = await coletor(fonte, intervalo, prazo);
    if (!resultado) {
      await registrarColeta({ fonte, situacao: "nao-configurada", historico, ate: null, linhas: 0, erro: null });
      return { fonte, situacao: "nao-configurada", intervalo, linhas: 0, ate: null, erro: null };
    }
    // Grava o que chegou mesmo com erro: dia que veio inteiro nao precisa
    // esperar a proxima noite por causa de outro dia que falhou.
    const linhas = await gravarLinhas(resultado.linhas);
    const situacao: SituacaoDaColeta = resultado.erro ? "erro" : "ok";
    await registrarColeta({ fonte, situacao, historico, ate: resultado.ate, linhas, erro: resultado.erro });
    if (resultado.erro) console.error(`[cron] ${fonte}: ${resultado.erro}`);
    return { fonte, situacao, intervalo, linhas, ate: resultado.ate, erro: resultado.erro };
  } catch (erro) {
    console.error(`[cron] falha ao gravar ${fonte}:`, erro);
    const mensagem = "falha ao gravar no banco";
    await registrarColeta({ fonte, situacao: "erro", historico, ate: null, linhas: 0, erro: mensagem }).catch(() => {});
    return { fonte, situacao: "erro", intervalo, linhas: 0, ate: null, erro: mensagem };
  }
}

/**
 * Aviso secundario. O principal e a propria tela, que nao depende de
 * configuracao nenhuma. Este so dispara na SEGUNDA noite seguida de falha:
 * uma noite perdida se conserta sozinha na seguinte, e avisar nela treinaria
 * quem recebe a ignorar o aviso. Da terceira em diante tambem nao repete, e
 * uma segunda execucao na mesma noite (o agendador pode duplicar) tambem nao.
 */
async function avisarSeFalhouDuasNoites(resumos: Resumo[]): Promise<void> {
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
      signal: AbortSignal.timeout(5_000),
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

  // O que a execucao conseguiu fazer, preenchido aos poucos: se o prazo total
  // estourar no meio, a resposta sai com o que ja se sabe.
  const feito: Feito = { cacheInvalidado: null, podaFalhou: null, resumos: [] };

  // Prazo total, abaixo do maxDuration. Com o banco travado (conexao aceita e
  // nenhuma resposta) cada gravacao esperava para sempre e a execucao levava
  // 80 s ate cair pelo limite da plataforma, sem resposta e sem log do motivo.
  // Assim ela responde 502 dizendo que o prazo acabou.
  const limite = inicio + maxDuration * 1000 - FOLGA_PARA_RESPONDER_MS;
  let prazoEsgotado = false;
  try {
    await comPrazo(executar(janela, inicio, feito), limite - Date.now());
  } catch (erro) {
    if (!(erro instanceof PrazoEsgotado)) throw erro;
    prazoEsgotado = true;
    console.error("[cron] a execucao passou do prazo total: o banco nao respondeu a tempo");
  }

  const { cacheInvalidado, podaFalhou, resumos } = feito;
  const coletaFalhou = prazoEsgotado || resumos.some((r) => r.situacao === "erro");
  return NextResponse.json(
    {
      fontes: resumos,
      historico: janela.historico,
      ajustadoAoTeto: janela.ajustadoAoTeto,
      proximoDesde: janela.proximoDesde,
      // Na resposta, e nao so no diario: e o que aparece no log da execucao.
      cacheInvalidado,
      podaFalhou,
      prazoEsgotado,
    },
    // 502 deixa a falha visivel no painel de execucoes da Vercel, que olha o
    // status — a coleta que falhou, a autocura pulada e a poda que falhou.
    { status: statusDoCron({ coletaFalhou, cacheInvalidado, podaFalhou }) },
  );
}

/** O trabalho da execucao, anotando em `feito` conforme avanca. */
async function executar(
  janela: Exclude<ReturnType<typeof janelaDaColeta>, { erro: string }>,
  inicio: number,
  feito: Feito,
): Promise<void> {
  if (!janela.historico) {
    // Autocura do cache do site (o porque inteiro esta em lib/cron.ts). So na
    // coleta da noite: o backfill roda em lotes seguidos, e invalidar o site a
    // cada lote seria desperdicio. O custo e cada pagina se refazer na proxima
    // visita, uma vez.
    //
    // Fica antes da coleta so por ordem de leitura. No Next 16 a invalidacao
    // nao acontece nesta linha: ela e aplicada depois que o handler devolve a
    // resposta. Entao a posicao da chamada NAO protege contra a funcao estourar
    // o tempo — se ela estourar, nada e invalidado, esteja a chamada onde
    // estiver. Quem cuida do prazo e o `prazo` abaixo, que reserva
    // FOLGA_PARA_GRAVAR_MS dos 60 s para o handler fechar e responder.
    feito.cacheInvalidado = await invalidarCacheSeOBancoResponde({
      // A mesma leitura publica que a home faz, pelo mesmo disjuntor.
      provarLeitura: () => lerComDisjuntor(lerPublicados),
      invalidar: () => revalidatePath("/", "layout"),
      anotarQuePulou: registrarCachePulado,
    });
  }

  const prazo = inicio + maxDuration * 1000 - FOLGA_PARA_GRAVAR_MS;
  // Cada fonte anota o proprio resumo quando termina, para a resposta de prazo
  // esgotado ainda contar a que chegou ao fim.
  await Promise.all(
    [
      processar("vercel", janela.vercel, prazo, janela.historico),
      processar("busca", janela.busca, prazo, janela.historico),
    ].map(async (emCurso) => {
      const resumo = await emCurso;
      if (resumo) feito.resumos.push(resumo);
    }),
  );

  if (!janela.historico) {
    await podarNumeros().catch((erro) => console.error("[cron] falha ao podar numeros:", erro));
    // O prazo do IP de quem tenta entrar e o teto do registro de acoes sao
    // promessa escrita na pagina de privacidade. As podas de dentro do painel
    // dependem de alguem usa-lo; esta roda todo dia, com ou sem trafego.
    // O resultado vai para a resposta e para o status: falhando calada toda
    // noite, os IPs ficavam guardados por dias contra o texto da /privacidade.
    feito.podaFalhou = await podarDadosDoPainel().then(
      () => false,
      (erro) => {
        console.error("[cron] falha ao podar os dados do painel:", erro);
        return true;
      },
    );
    await avisarSeFalhouDuasNoites(feito.resumos);
  }
}
