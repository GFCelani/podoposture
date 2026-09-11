import "server-only";

import type { ChaveDeSecao, ConteudoDoSite } from "./conteudo-tipos";
import { bancoConfigurado, bancoDoPainel } from "./painel-db";

/**
 * O conteudo da pagina inicial no banco: uma linha por secao.
 *
 * `publicado` e o que o site mostra por cima do padrao do codigo; `rascunho`
 * e o que so a previa ve. Os dois sao JSONB e guardam a secao inteira, ja
 * validada pela rota. Mesmo assim a leitura nunca confia neles: quem le passa
 * por `mesclarSecao`, que cai no padrao campo a campo.
 *
 * Duas leituras, com cuidados diferentes:
 * - A PUBLICA (paginas, build) nao cria tabela e trata tabela inexistente como
 *   banco vazio. Um CREATE TABLE a cada build de 89 paginas, com o banco
 *   lento, e o que faria o build esperar.
 * - A DO PAINEL cria a tabela na primeira vez, como os outros modulos.
 */

export type LinhaDeConteudo = {
  chave: string;
  publicado: unknown;
  rascunho: unknown;
  atualizadoEm: string | null;
  publicadoEm: string | null;
};

type LinhaCrua = {
  chave: string;
  publicado: unknown;
  rascunho: unknown;
  atualizado_em: Date | null;
  publicado_em: Date | null;
};

function paraLinha(l: LinhaCrua): LinhaDeConteudo {
  return {
    chave: l.chave,
    publicado: l.publicado,
    rascunho: l.rascunho,
    atualizadoEm: l.atualizado_em ? l.atualizado_em.toISOString() : null,
    publicadoEm: l.publicado_em ? l.publicado_em.toISOString() : null,
  };
}

/** 42P01 = tabela inexistente: o painel ainda nao salvou nada nesta base. */
function tabelaAusente(erro: unknown): boolean {
  return (erro as { code?: string })?.code === "42P01";
}

let tabelaPronta = false;

async function garantirTabelaDeConteudo() {
  if (tabelaPronta) return;
  const sql = bancoDoPainel();
  await sql`
    CREATE TABLE IF NOT EXISTS conteudo_site (
      chave         TEXT PRIMARY KEY,
      publicado     JSONB,
      rascunho      JSONB,
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      publicado_em  TIMESTAMPTZ
    )`;
  tabelaPronta = true;
}

/**
 * JSONB vai por `sql.json`, e nao por texto com cast: com
 * `${JSON.stringify(x)}::jsonb` o driver serializa de novo e o banco guarda uma
 * STRING com o JSON dentro (conferido contra o Postgres de teste). A leitura
 * devolveria texto, a mescla veria "nao e objeto" e a secao voltaria ao padrao
 * em silencio logo depois de publicada.
 */
type ParametroJson = Parameters<ReturnType<typeof bancoDoPainel>["json"]>[0];

/* -------------------------------------------------------- leitura publica */

/** Os documentos publicados, por chave. Sem tabela = nada publicado. */
export async function lerPublicados(): Promise<Record<string, unknown>> {
  if (!bancoConfigurado()) return {};
  const sql = bancoDoPainel();
  try {
    const linhas = await sql<{ chave: string; publicado: unknown }[]>`
      SELECT chave, publicado FROM conteudo_site WHERE publicado IS NOT NULL`;
    return Object.fromEntries(linhas.map((l) => [l.chave, l.publicado]));
  } catch (erro) {
    if (tabelaAusente(erro)) return {};
    throw erro;
  }
}

/** Publicados e rascunhos numa consulta, para a previa. */
export async function lerPublicadosERascunhos(): Promise<{
  publicados: Record<string, unknown>;
  rascunhos: Record<string, unknown>;
}> {
  if (!bancoConfigurado()) return { publicados: {}, rascunhos: {} };
  const sql = bancoDoPainel();
  try {
    const linhas = await sql<{ chave: string; publicado: unknown; rascunho: unknown }[]>`
      SELECT chave, publicado, rascunho FROM conteudo_site`;
    const publicados: Record<string, unknown> = {};
    const rascunhos: Record<string, unknown> = {};
    for (const l of linhas) {
      if (l.publicado !== null) publicados[l.chave] = l.publicado;
      if (l.rascunho !== null) rascunhos[l.chave] = l.rascunho;
    }
    return { publicados, rascunhos };
  } catch (erro) {
    if (tabelaAusente(erro)) return { publicados: {}, rascunhos: {} };
    throw erro;
  }
}

/* ------------------------------------------------------------- do painel */

/** Todas as linhas salvas, por chave. So o painel usa. */
export async function listarSecoesSalvas(): Promise<Map<string, LinhaDeConteudo>> {
  await garantirTabelaDeConteudo();
  const sql = bancoDoPainel();
  const linhas = await sql<LinhaCrua[]>`
    SELECT chave, publicado, rascunho, atualizado_em, publicado_em FROM conteudo_site`;
  return new Map(linhas.map((l) => [l.chave, paraLinha(l)]));
}

export async function gravarRascunho(
  chave: ChaveDeSecao,
  dados: ConteudoDoSite[ChaveDeSecao],
): Promise<LinhaDeConteudo> {
  await garantirTabelaDeConteudo();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaCrua[]>`
    INSERT INTO conteudo_site (chave, rascunho, atualizado_em)
    VALUES (${chave}, ${sql.json(dados as ParametroJson)}, NOW())
    ON CONFLICT (chave) DO UPDATE SET rascunho = EXCLUDED.rascunho, atualizado_em = NOW()
    RETURNING chave, publicado, rascunho, atualizado_em, publicado_em`;
  return paraLinha(linha);
}

/** Publicar zera o rascunho: o que estava em preparo acabou de ir ao ar. */
export async function publicarSecao(
  chave: ChaveDeSecao,
  dados: ConteudoDoSite[ChaveDeSecao],
): Promise<LinhaDeConteudo> {
  await garantirTabelaDeConteudo();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaCrua[]>`
    INSERT INTO conteudo_site (chave, publicado, rascunho, atualizado_em, publicado_em)
    VALUES (${chave}, ${sql.json(dados as ParametroJson)}, NULL, NOW(), NOW())
    ON CONFLICT (chave) DO UPDATE SET
      publicado = EXCLUDED.publicado, rascunho = NULL, atualizado_em = NOW(), publicado_em = NOW()
    RETURNING chave, publicado, rascunho, atualizado_em, publicado_em`;
  return paraLinha(linha);
}

/** null quando a secao nunca foi salva: nao havia rascunho para descartar. */
export async function descartarRascunho(chave: ChaveDeSecao): Promise<LinhaDeConteudo | null> {
  await garantirTabelaDeConteudo();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaCrua[]>`
    UPDATE conteudo_site SET rascunho = NULL, atualizado_em = NOW()
    WHERE chave = ${chave}
    RETURNING chave, publicado, rascunho, atualizado_em, publicado_em`;
  return linha ? paraLinha(linha) : null;
}

/**
 * O site volta a mostrar o texto do codigo. O rascunho fica: quem clicou em
 * "voltar ao padrao" pode estar no meio de uma edicao que ainda quer.
 */
export async function voltarAoPadrao(chave: ChaveDeSecao): Promise<LinhaDeConteudo | null> {
  await garantirTabelaDeConteudo();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaCrua[]>`
    UPDATE conteudo_site SET publicado = NULL, publicado_em = NULL, atualizado_em = NOW()
    WHERE chave = ${chave}
    RETURNING chave, publicado, rascunho, atualizado_em, publicado_em`;
  return linha ? paraLinha(linha) : null;
}
