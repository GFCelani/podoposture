import "server-only";

import {
  limitarPorDia,
  type Coleta,
  type Dimensao,
  type EstadoDaFonte,
  type Fonte,
  type Intervalo,
  type LinhaDoDia,
  type Mes,
  type SituacaoDaColeta,
} from "./numeros-tipos";
import { bancoDoPainel } from "./painel-db";

/**
 * O arquivo diario dos numeros do site.
 *
 * Existe por um motivo so: a Vercel e o Google apagam o que e antigo (12 e 16
 * meses), e dado que o fornecedor apagou nao volta. Guardar um resumo por dia
 * aqui e o que permite comparar este ano com o anterior e mostrar o antes e o
 * depois da mudanca do site — e deixa a tela independente de fornecedor fora
 * do ar, porque ela le so daqui.
 *
 * Usa a conexao unica de `painel-db.ts`. Quem chama confere
 * `bancoConfigurado()` antes; este modulo so e usado pela rota de cron e pela
 * rota do painel, nunca por pagina publica — por isso pode criar tabela.
 */

let tabelasProntas = false;

/**
 * Duas tabelas, criadas uma vez por instancia.
 *
 * A chave primaria composta e o que torna a coleta idempotente: refazer um dia
 * reescreve a mesma linha em vez de somar de novo.
 *
 * `numeros_coleta` existe por causa de uma licao registrada: noutro painel, a
 * tela mostrou zero com dado chegando e ninguem percebeu por semanas. Aqui
 * toda execucao deixa rastro — inclusive a que pulou uma fonte nao configurada
 * — e a tela sempre diz de quando e o numero.
 *
 * `historico` separa o lote de backfill da coleta da noite. Sem isso, um lote
 * antigo rodado a mao viraria a "ultima coleta" da tela, e uma falha nele
 * contaria como noite perdida no aviso por Telegram.
 */
async function garantirTabelasDeNumeros() {
  if (tabelasProntas) return;
  const sql = bancoDoPainel();

  await sql`
    CREATE TABLE IF NOT EXISTS numeros_dia (
      fonte     TEXT NOT NULL,
      dia       DATE NOT NULL,
      dimensao  TEXT NOT NULL,
      chave     TEXT NOT NULL DEFAULT '',
      visitas   INTEGER NOT NULL DEFAULT 0,
      pessoas   INTEGER NOT NULL DEFAULT 0,
      cliques   INTEGER NOT NULL DEFAULT 0,
      aparicoes INTEGER NOT NULL DEFAULT 0,
      posicao   REAL,
      PRIMARY KEY (fonte, dia, dimensao, chave)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS numeros_coleta (
      id        BIGSERIAL PRIMARY KEY,
      fonte     TEXT NOT NULL,
      em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      situacao  TEXT NOT NULL,
      historico BOOLEAN NOT NULL DEFAULT false,
      ate       DATE,
      linhas    INTEGER NOT NULL DEFAULT 0,
      erro      TEXT
    )`;
  await sql`CREATE INDEX IF NOT EXISTS numeros_coleta_fonte ON numeros_coleta (fonte, id DESC)`;

  tabelasProntas = true;
}

/* ---------------------------------------------------------------- escrita */

/** Linhas por comando: 9 colunas x 1000 fica longe do teto de parametros do Postgres. */
const LINHAS_POR_COMANDO = 1000;

/**
 * Grava com upsert. Devolve quantas linhas foram escritas depois da poda.
 *
 * Linha medida substitui a guardada (refazer o dia corrige). Zero deduzido
 * (`soSeVazio`) so entra onde nao ha linha: por cima de um numero guardado ele
 * apagaria visita que a fonte ja nao tem mais para devolver.
 */
export async function gravarLinhas(linhas: LinhaDoDia[]): Promise<number> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  const podadas = limitarPorDia(linhas);
  const medidas = podadas.filter((l) => !l.soSeVazio);
  const deduzidas = podadas.filter((l) => l.soSeVazio);

  for (let i = 0; i < medidas.length; i += LINHAS_POR_COMANDO) {
    const lote = medidas.slice(i, i + LINHAS_POR_COMANDO);
    await sql`
      INSERT INTO numeros_dia ${sql(
        lote,
        "fonte",
        "dia",
        "dimensao",
        "chave",
        "visitas",
        "pessoas",
        "cliques",
        "aparicoes",
        "posicao",
      )}
      ON CONFLICT (fonte, dia, dimensao, chave) DO UPDATE SET
        visitas   = EXCLUDED.visitas,
        pessoas   = EXCLUDED.pessoas,
        cliques   = EXCLUDED.cliques,
        aparicoes = EXCLUDED.aparicoes,
        posicao   = EXCLUDED.posicao`;
  }
  for (let i = 0; i < deduzidas.length; i += LINHAS_POR_COMANDO) {
    const lote = deduzidas.slice(i, i + LINHAS_POR_COMANDO);
    await sql`
      INSERT INTO numeros_dia ${sql(
        lote,
        "fonte",
        "dia",
        "dimensao",
        "chave",
        "visitas",
        "pessoas",
        "cliques",
        "aparicoes",
        "posicao",
      )}
      ON CONFLICT (fonte, dia, dimensao, chave) DO NOTHING`;
  }
  return podadas.length;
}

const MAX_ERRO = 300;

export type RegistroDeColeta = {
  fonte: Fonte;
  situacao: SituacaoDaColeta;
  historico: boolean;
  ate: string | null;
  linhas: number;
  erro: string | null;
};

export async function registrarColeta(registro: RegistroDeColeta): Promise<void> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  const { fonte, situacao, historico, ate, linhas, erro } = registro;
  await sql`
    INSERT INTO numeros_coleta (fonte, situacao, historico, ate, linhas, erro)
    VALUES (${fonte}, ${situacao}, ${historico}, ${ate}::date, ${linhas}, ${erro ? erro.slice(0, MAX_ERRO) : null})`;
}

/**
 * Quantos dias seguidos, contando do mais recente, a coleta da noite desta
 * fonte terminou em erro. Vale a ultima execucao de cada dia (UTC): o
 * agendador pode rodar duas vezes na mesma noite, e uma segunda execucao nao e
 * uma segunda noite. Fonte nao configurada e lote de historico nao contam.
 */
export async function diasSeguidosComFalha(fonte: Fonte): Promise<number> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  const dias = await sql<{ situacao: SituacaoDaColeta }[]>`
    SELECT DISTINCT ON ((em AT TIME ZONE 'UTC')::date) situacao
    FROM numeros_coleta
    WHERE fonte = ${fonte} AND NOT historico AND situacao <> 'nao-configurada'
    ORDER BY (em AT TIME ZONE 'UTC')::date DESC, id DESC
    LIMIT 10`;
  let seguidos = 0;
  for (const { situacao } of dias) {
    if (situacao !== "erro") break;
    seguidos += 1;
  }
  return seguidos;
}

/**
 * Quantas coletas da noite desta fonte falharam hoje (UTC). O aviso so sai na
 * primeira: a entrega do agendador pode duplicar, e a segunda execucao da
 * mesma noite repetiria a mensagem.
 */
export async function falhasDeHoje(fonte: Fonte): Promise<number> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  const [linha] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM numeros_coleta
    WHERE fonte = ${fonte} AND NOT historico AND situacao = 'erro'
      AND (em AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date`;
  return linha.total;
}

/** O primeiro dia com total guardado desta fonte, ou null se nada foi guardado. */
export async function primeiroDiaGuardado(fonte: Fonte): Promise<string | null> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  const [linha] = await sql<{ primeiro: string | null }[]>`
    SELECT to_char(MIN(dia), 'YYYY-MM-DD') AS primeiro
    FROM numeros_dia
    WHERE fonte = ${fonte} AND dimensao = 'total'`;
  return linha.primeiro;
}

const MAX_COLETAS = 2000;

/**
 * Poda: resumo diario acima de 3 anos (o que a pagina de privacidade promete)
 * e o registro de execucoes alem das 2000 mais recentes.
 */
export async function podarNumeros(): Promise<void> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  await sql`DELETE FROM numeros_dia WHERE dia < (CURRENT_DATE - INTERVAL '3 years')`;
  await sql`
    DELETE FROM numeros_coleta WHERE id < (
      SELECT COALESCE(MIN(id), 0) FROM (
        SELECT id FROM numeros_coleta ORDER BY id DESC LIMIT ${MAX_COLETAS}
      ) recentes
    )`;
}

/* ---------------------------------------------------------------- leitura */

type LinhaDeColeta = {
  fonte: Fonte;
  em: Date;
  ate: string | null;
  linhas: number;
  situacao: SituacaoDaColeta;
  erro: string | null;
};

function paraColeta(l: LinhaDeColeta): Coleta {
  return { em: l.em.toISOString(), ate: l.ate, linhas: l.linhas, situacao: l.situacao, erro: l.erro };
}

export type EstadoGuardado = Omit<EstadoDaFonte, "configurada">;

/**
 * Ultima coleta da noite, ultima que deu certo, e o primeiro e o ultimo dia
 * guardados. Lote de historico fica de fora das duas coletas: "atualizados
 * hoje" tem que falar da rotina, e nao de um backfill rodado a mao.
 */
export async function estadoDasFontes(): Promise<Record<Fonte, EstadoGuardado>> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();

  const ultimas = await sql<LinhaDeColeta[]>`
    SELECT DISTINCT ON (fonte) fonte, em, to_char(ate, 'YYYY-MM-DD') AS ate, linhas, situacao, erro
    FROM numeros_coleta WHERE NOT historico ORDER BY fonte, id DESC`;
  const certas = await sql<LinhaDeColeta[]>`
    SELECT DISTINCT ON (fonte) fonte, em, to_char(ate, 'YYYY-MM-DD') AS ate, linhas, situacao, erro
    FROM numeros_coleta WHERE NOT historico AND situacao = 'ok' ORDER BY fonte, id DESC`;
  const limites = await sql<{ fonte: Fonte; primeiro: string; ultimo: string }[]>`
    SELECT fonte, to_char(MIN(dia), 'YYYY-MM-DD') AS primeiro, to_char(MAX(dia), 'YYYY-MM-DD') AS ultimo
    FROM numeros_dia WHERE dimensao = 'total' GROUP BY fonte`;

  const estado = (fonte: Fonte): EstadoGuardado => {
    const ultima = ultimas.find((l) => l.fonte === fonte);
    const certa = certas.find((l) => l.fonte === fonte);
    const limite = limites.find((l) => l.fonte === fonte);
    return {
      ultima: ultima ? paraColeta(ultima) : null,
      ultimaComSucesso: certa ? paraColeta(certa) : null,
      primeiroDia: limite?.primeiro ?? null,
      ultimoDia: limite?.ultimo ?? null,
    };
  };
  return { vercel: estado("vercel"), busca: estado("busca") };
}

export type Soma = {
  visitas: number;
  pessoas: number;
  cliques: number;
  aparicoes: number;
  posicao: number | null;
};

export async function somarTotal(fonte: Fonte, { inicio, fim }: Intervalo): Promise<Soma> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  const [linha] = await sql<Soma[]>`
    SELECT
      COALESCE(SUM(visitas), 0)::int   AS visitas,
      COALESCE(SUM(pessoas), 0)::int   AS pessoas,
      COALESCE(SUM(cliques), 0)::int   AS cliques,
      COALESCE(SUM(aparicoes), 0)::int AS aparicoes,
      (SUM(posicao * aparicoes) FILTER (WHERE posicao IS NOT NULL)
        / NULLIF(SUM(aparicoes) FILTER (WHERE posicao IS NOT NULL), 0))::float8 AS posicao
    FROM numeros_dia
    WHERE fonte = ${fonte} AND dimensao = 'total'
      AND dia BETWEEN ${inicio}::date AND ${fim}::date`;
  return linha;
}

export async function serieDiaria(fonte: Fonte, { inicio, fim }: Intervalo): Promise<{ dia: string; pessoas: number }[]> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  return sql<{ dia: string; pessoas: number }[]>`
    SELECT to_char(dia, 'YYYY-MM-DD') AS dia, pessoas
    FROM numeros_dia
    WHERE fonte = ${fonte} AND dimensao = 'total'
      AND dia BETWEEN ${inicio}::date AND ${fim}::date
    ORDER BY dia`;
}

export async function somarPorChave(
  fonte: Fonte,
  dimensao: Exclude<Dimensao, "total">,
  { inicio, fim }: Intervalo,
  limite: number,
): Promise<({ chave: string } & Soma)[]> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  return sql<({ chave: string } & Soma)[]>`
    SELECT
      chave,
      SUM(visitas)::int   AS visitas,
      SUM(pessoas)::int   AS pessoas,
      SUM(cliques)::int   AS cliques,
      SUM(aparicoes)::int AS aparicoes,
      (SUM(posicao * aparicoes) FILTER (WHERE posicao IS NOT NULL)
        / NULLIF(SUM(aparicoes) FILTER (WHERE posicao IS NOT NULL), 0))::float8 AS posicao
    FROM numeros_dia
    WHERE fonte = ${fonte} AND dimensao = ${dimensao}
      AND dia BETWEEN ${inicio}::date AND ${fim}::date
    GROUP BY chave
    ORDER BY SUM(pessoas) DESC, SUM(cliques) DESC, SUM(aparicoes) DESC, chave
    LIMIT ${limite}`;
}

/** Cliques e aparicoes do Google por mes, desde o dia dado. */
export async function cliquesPorMes(desde: string): Promise<Mes[]> {
  await garantirTabelasDeNumeros();
  const sql = bancoDoPainel();
  return sql<Mes[]>`
    SELECT
      to_char(date_trunc('month', dia), 'YYYY-MM') AS mes,
      SUM(cliques)::int   AS cliques,
      SUM(aparicoes)::int AS aparicoes
    FROM numeros_dia
    WHERE fonte = 'busca' AND dimensao = 'total' AND dia >= ${desde}::date
    GROUP BY 1
    ORDER BY 1`;
}
