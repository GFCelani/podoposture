import { NextResponse } from "next/server";

import { configDaBusca } from "@/lib/fonte-search-console";
import { configDaVercel } from "@/lib/fonte-vercel";
import { exigirSessao } from "@/lib/guarda";
import {
  cliquesPorMes,
  estadoDasFontes,
  serieDiaria,
  somarPorChave,
  somarTotal,
  type EstadoGuardado,
} from "@/lib/numeros-db";
import {
  agruparOrigens,
  diaValido,
  intervalosDoPeriodo,
  lerPeriodo,
  nomeDoAparelho,
  nomeDoPais,
  textosPeloTitulo,
  type Buscas,
  type Catalogo,
  type Contagem,
  type Periodo,
  type RespostaDosNumeros,
  type Visitas,
} from "@/lib/numeros-tipos";
import { bancoConfigurado } from "@/lib/painel-db";
import { MAPA_ASCII_POSTS } from "@/lib/posts";
import { todosOsPosts } from "@/lib/posts-do-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Os numeros da aba "Numeros".
 *
 * Le exclusivamente o nosso Postgres. Quem fala com a Vercel e com o Google e
 * so a rota de cron: daqui, nenhuma pessoa logada alcanca o token, e a tela
 * fica rapida e de pe mesmo com fornecedor fora do ar. De `fonte-*` so se usa
 * a conferencia de presenca das variaveis, para a tela saber dizer "ainda nao
 * ligado".
 */

/** Rotas guardadas lidas antes de agrupar por titulo: cada texto aparece em ate tres formas. */
const ROTAS_LIDAS = 500;

function soma(contagens: Contagem[], nomear: (chave: string) => string, limite: number): Contagem[] {
  const porNome = new Map<string, Contagem>();
  for (const c of contagens) {
    const nome = nomear(c.nome);
    const atual = porNome.get(nome) ?? { nome, visitas: 0, pessoas: 0 };
    atual.visitas += c.visitas;
    atual.pessoas += c.pessoas;
    porNome.set(nome, atual);
  }
  return [...porNome.values()].sort((a, b) => b.pessoas - a.pessoas).slice(0, limite);
}

/**
 * Titulo de cada texto, dos 68 do repositorio e dos publicados pelo painel.
 *
 * `todosOsPosts()` e a forma de listagem, sem corpo: carregar e converter o
 * Markdown de todo texto so para ler o titulo seria o custo errado. Ela ja cai
 * para os 68 do repositorio se o banco falhar. O ponto final ou os dois pontos
 * do fim do titulo saem: numa lista o titulo e nome, nao frase.
 */
async function catalogoDosTextos(): Promise<Catalogo> {
  const posts = await todosOsPosts();
  return {
    titulos: new Map(posts.map((p) => [p.slug.normalize("NFC"), p.title.trim().replace(/\s*[.:]$/, "")])),
    asciiParaReal: MAPA_ASCII_POSTS,
  };
}

async function lerVisitas(estado: EstadoGuardado, periodo: Periodo, catalogo: Catalogo): Promise<Visitas | null> {
  if (!estado.primeiroDia || !estado.ultimoDia) return null;
  const { atual, anterior } = intervalosDoPeriodo(periodo, estado.primeiroDia, estado.ultimoDia);

  const [total, totalAnterior, porDia, rotas, origens, paises, aparelhos] = await Promise.all([
    somarTotal("vercel", atual),
    anterior ? somarTotal("vercel", anterior) : null,
    serieDiaria("vercel", atual),
    somarPorChave("vercel", "rota", atual, ROTAS_LIDAS),
    somarPorChave("vercel", "origem", atual, 300),
    somarPorChave("vercel", "pais", atual, 60),
    somarPorChave("vercel", "aparelho", atual, 10),
  ]);

  const comoContagem = (l: { chave: string; visitas: number; pessoas: number }) => ({
    nome: l.chave,
    visitas: l.visitas,
    pessoas: l.pessoas,
  });

  return {
    intervalo: atual,
    pessoas: total.pessoas,
    visitas: total.visitas,
    anterior: totalAnterior ? { pessoas: totalAnterior.pessoas, visitas: totalAnterior.visitas } : null,
    porDia,
    textos: textosPeloTitulo(rotas, catalogo),
    origens: agruparOrigens(origens).slice(0, 10),
    paises: soma(paises.map(comoContagem), nomeDoPais, 10),
    aparelhos: soma(aparelhos.map(comoContagem), nomeDoAparelho, 5),
  };
}

function primeiroDoMes(dia: string, mesesAntes: number): string {
  const [ano, mes] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1 - mesesAntes, 1)).toISOString().slice(0, 10);
}

async function lerBuscas(estado: EstadoGuardado, periodo: Periodo, catalogo: Catalogo): Promise<Buscas | null> {
  if (!estado.primeiroDia || !estado.ultimoDia) return null;
  const { atual, anterior } = intervalosDoPeriodo(periodo, estado.primeiroDia, estado.ultimoDia);

  const [total, totalAnterior, consultas, paginas, meses] = await Promise.all([
    somarTotal("busca", atual),
    anterior ? somarTotal("busca", anterior) : null,
    somarPorChave("busca", "consulta", atual, 15),
    somarPorChave("busca", "rota", atual, ROTAS_LIDAS),
    // 16 meses contando o atual: o que o Google guarda.
    cliquesPorMes(primeiroDoMes(estado.ultimoDia, 15)),
  ]);

  return {
    intervalo: atual,
    cliques: total.cliques,
    aparicoes: total.aparicoes,
    posicao: total.posicao,
    anterior: totalAnterior ? { cliques: totalAnterior.cliques, aparicoes: totalAnterior.aparicoes } : null,
    consultas: consultas.map((c) => ({
      consulta: c.chave,
      cliques: c.cliques,
      aparicoes: c.aparicoes,
      posicao: c.posicao === null ? null : Math.round(c.posicao * 10) / 10,
    })),
    textos: textosPeloTitulo(paginas, catalogo, 5),
    meses,
  };
}

/** A data da mudanca do site, se ja foi marcada. Valor invalido e ignorado. */
function mesDaMigracao(): string | null {
  const dia = process.env.DATA_DA_MIGRACAO?.trim();
  return dia && diaValido(dia) ? dia.slice(0, 7) : null;
}

export async function GET(req: Request) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  const periodo = lerPeriodo(new URL(req.url).searchParams.get("periodo"));
  if (!periodo) {
    return NextResponse.json({ erro: "Período inválido. Use 7, 30, 90 ou 365 dias." }, { status: 400 });
  }

  const configuradas = { vercel: configDaVercel() !== null, busca: configDaBusca() !== null };

  if (!bancoConfigurado()) {
    const resposta: RespostaDosNumeros = {
      semBanco: true,
      fontes: { vercel: { configurada: configuradas.vercel }, busca: { configurada: configuradas.busca } },
    };
    return NextResponse.json(resposta);
  }

  try {
    const [estado, catalogo] = await Promise.all([estadoDasFontes(), catalogoDosTextos()]);
    const [visitas, buscas] = await Promise.all([
      lerVisitas(estado.vercel, periodo, catalogo),
      lerBuscas(estado.busca, periodo, catalogo),
    ]);
    const resposta: RespostaDosNumeros = {
      semBanco: false,
      periodo,
      migracao: mesDaMigracao(),
      fontes: {
        vercel: { configurada: configuradas.vercel, ...estado.vercel },
        busca: { configurada: configuradas.busca, ...estado.busca },
      },
      visitas,
      buscas,
    };
    return NextResponse.json(resposta);
  } catch (erro) {
    console.error("[painel] falha ao ler numeros:", erro);
    return NextResponse.json(
      { erro: "Não foi possível ler os números agora. Tente de novo em alguns minutos." },
      { status: 502 },
    );
  }
}
