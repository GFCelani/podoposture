import "server-only";

import { randomUUID } from "node:crypto";
import type postgres from "postgres";

import { lerPublicados } from "./conteudo-db";
import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { mesclarConteudo } from "./conteudo-tipos";
import { paginasDoAcervo, type PaginaDoAcervo } from "./pagina-do-acervo";
import { mesmasPaginas } from "./ordem-das-paginas";
import { MAPA_ASCII_PAGINAS, PAGINAS_DINAMICAS, descricaoDaPagina, subtituloCortadoAntigo, subtituloDaPagina } from "./pages";
import dados from "@/content/pages.json";
import { bancoConfigurado, bancoDoPainel } from "./painel-db";
import { ehEstreia, enderecoPodeMudar, gerarSlug, juntarSlug } from "./painel-tipos";
import {
  ENDERECOS_RESERVADOS,
  GRUPOS_DO_MENU,
  type DadosDaPagina,
  type PaginaDoPainel,
  type ResumoDaPagina,
} from "./paginas-tipos";

/**
 * As paginas do site no Postgres, no molde dos posts (painel-db.ts): a mesma
 * conexao, a mesma regra de endereco, a mesma publicacao. Modulo proprio
 * porque e' dono das proprias tabelas (regra de painel-db.ts).
 *
 * As paginas que nasceram no codigo entram sozinhas no primeiro uso, como o
 * acervo do blog: o corpo verbatim (`formato = 'html'`), publicadas, com as
 * fotos que o painel guardava para cada uma (`pagina-do-acervo.ts`). O livro
 * `paginas_importadas` impede que uma pagina apagada pelo painel volte.
 *
 * Toda consulta e' parametrizada, pela tag `sql`.
 */

type LinhaPagina = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  grupo: string | null;
  capa: string;
  capa_alt: string;
  capa_legenda: string;
  corpo: string;
  formato: "markdown" | "html";
  descricao: string;
  identificacao: unknown;
  ordem: number;
  publicado: boolean;
  criado_em: Date;
  atualizado_em: Date;
  publicado_em: Date | null;
};

function paraResumo(l: Omit<LinhaPagina, "corpo">): ResumoDaPagina {
  return {
    id: l.id,
    slug: l.slug,
    titulo: l.titulo,
    resumo: l.resumo,
    categoria: l.grupo ?? "",
    capa: l.capa,
    capaAlt: l.capa_alt,
    capaLegenda: l.capa_legenda,
    publicado: l.publicado,
    criadoEm: l.criado_em.toISOString(),
    atualizadoEm: l.atualizado_em.toISOString(),
    publicadoEm: l.publicado_em ? l.publicado_em.toISOString() : null,
    formato: l.formato,
    descricao: l.descricao,
    identificacao: Array.isArray(l.identificacao) ? l.identificacao.filter((x): x is string => typeof x === "string") : [],
    ordem: l.ordem,
  };
}

function paraPagina(l: LinhaPagina): PaginaDoPainel {
  return { ...paraResumo(l), corpo: l.corpo };
}

/* ----------------------------------------------------------------- tabelas */

/** Chaves das travas consultivas (numeros arbitrarios, fixos). */
const TRAVA_DAS_TABELAS = 7_370_101;
const TRAVA_DA_IMPORTACAO = 7_370_102;

let tabelasProntas = false;

async function garantirTabelasDePaginas() {
  if (tabelasProntas) return;
  const sql = bancoDoPainel();
  await sql.begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(${TRAVA_DAS_TABELAS})`;
    await sql`
      CREATE TABLE IF NOT EXISTS paginas (
        id            TEXT PRIMARY KEY,
        slug          TEXT UNIQUE NOT NULL,
        titulo        TEXT NOT NULL,
        resumo        TEXT NOT NULL DEFAULT '',
        grupo         TEXT,
        capa          TEXT NOT NULL DEFAULT '',
        capa_alt      TEXT NOT NULL DEFAULT '',
        capa_legenda  TEXT NOT NULL DEFAULT '',
        corpo         TEXT NOT NULL,
        formato       TEXT NOT NULL DEFAULT 'markdown',
        descricao     TEXT NOT NULL DEFAULT '',
        identificacao JSONB NOT NULL DEFAULT '[]'::jsonb,
        ordem         INT NOT NULL DEFAULT 0,
        publicado     BOOLEAN NOT NULL DEFAULT FALSE,
        criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        publicado_em  TIMESTAMPTZ
      )`;
    await sql`CREATE INDEX IF NOT EXISTS paginas_menu ON paginas (publicado, grupo, ordem)`;
    await sql`
      CREATE TABLE IF NOT EXISTS paginas_importadas (
        slug TEXT PRIMARY KEY,
        em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
  });
  tabelasProntas = true;
}

/* -------------------------------------------------------------- importacao */

let importacao: Promise<number> | null = null;

/**
 * O banco pronto para ler pagina: tabelas e as paginas do codigo importadas.
 * Falhou, a proxima chamada tenta de novo.
 */
export async function garantirPaginas(): Promise<void> {
  await garantirTabelasDePaginas();
  importacao ??= lerFotosEImportar().then(async (novas) => {
    await completarSubtitulosCortados();
    return novas;
  }).catch((erro) => {
    importacao = null;
    throw erro;
  });
  await importacao;
}

/**
 * As fotos que o painel guardava por pagina. Leitura que LANCA quando o
 * banco falha: importar com as fotos originais por uma falha passageira
 * trocaria em silencio as fotos que a clinica publicou.
 */
async function lerFotosEImportar(): Promise<number> {
  const sql = bancoDoPainel();
  const slugs = paginasDoAcervo(CONTEUDO_PADRAO).map((p) => p.slug);
  const [{ ja }] = await sql<{ ja: number }[]>`
    SELECT count(*)::int AS ja FROM paginas_importadas WHERE slug = ANY(${slugs})`;
  if (ja === slugs.length) return 0;
  const conteudo = mesclarConteudo(CONTEUDO_PADRAO, await lerPublicados());
  return importarPaginas(paginasDoAcervo(conteudo));
}

/**
 * Subtitulo cortado em 155 caracteres que a importacao gravou no banco
 * (lib/subtitulo-inteiro.ts), trocado pelo inteiro. So onde o banco ainda tem
 * exatamente o cortado: subtitulo editado no painel nao e' tocado. A descricao
 * de busca, que era o proprio subtitulo, fica com a forma curta. Depois da
 * primeira vez, uma consulta que nao acha nada. Devolve quantas trocou.
 */
export async function completarSubtitulosCortados(): Promise<number> {
  const trocas = PAGINAS_DINAMICAS.flatMap((p) => {
    const antigo = subtituloCortadoAntigo(p);
    const novo = subtituloDaPagina(p, "");
    return antigo !== novo ? [{ slug: p.slug.normalize("NFC"), antigo, novo, descricao: descricaoDaPagina(p, "") }] : [];
  });
  if (trocas.length === 0) return 0;
  const sql = bancoDoPainel();
  const noBanco = await sql<{ slug: string; resumo: string }[]>`
    SELECT slug, resumo FROM paginas WHERE slug = ANY(${trocas.map((t) => t.slug)})`;
  const atual = new Map(noBanco.map((l) => [l.slug, l.resumo]));
  let trocadas = 0;
  for (const t of trocas) {
    if (atual.get(t.slug) !== t.antigo) continue;
    const descricao = t.descricao !== t.novo ? t.descricao : "";
    const linhas = await sql`
      UPDATE paginas
      SET resumo = ${t.novo}, descricao = CASE WHEN descricao = '' THEN ${descricao} ELSE descricao END
      WHERE slug = ${t.slug} AND resumo = ${t.antigo}
      RETURNING id`;
    trocadas += linhas.length;
  }
  return trocadas;
}

/** Leva para o banco as paginas do codigo que ainda nao entraram. Devolve quantas. */
export async function importarPaginas(acervo: readonly PaginaDoAcervo[]): Promise<number> {
  if (acervo.length === 0) return 0;
  await garantirTabelasDePaginas();
  const sql = bancoDoPainel();
  return sql.begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(${TRAVA_DA_IMPORTACAO})`;
    const importadas = new Set(
      (await sql<{ slug: string }[]>`SELECT slug FROM paginas_importadas`).map((l) => l.slug),
    );
    let novas = 0;
    for (const p of acervo) {
      if (importadas.has(p.slug)) continue;
      const [linha] = await sql`
        INSERT INTO paginas (id, slug, titulo, resumo, grupo, capa, capa_alt, capa_legenda, corpo,
                             formato, descricao, identificacao, ordem, publicado, publicado_em)
        VALUES (${randomUUID()}, ${p.slug}, ${p.titulo}, ${p.resumo}, ${p.categoria || null},
                ${p.capa}, ${p.capaAlt}, ${p.capaLegenda}, ${p.corpo}, 'html', ${p.descricao},
                ${sql.json(p.identificacao)}, ${p.ordem}, TRUE, NOW())
        ON CONFLICT (slug) DO NOTHING
        RETURNING id`;
      if (!linha) {
        console.error(`[paginas] ${p.slug} nao entrou: o endereco ja e de outra pagina`);
        continue;
      }
      await sql`INSERT INTO paginas_importadas (slug) VALUES (${p.slug})`;
      novas += 1;
    }
    return novas;
  });
}

/* ----------------------------------------------------------------- leitura */

/** Todas, publicadas ou nao, sem o corpo: a lista do painel, na ordem do menu. */
export async function listarTodasAsPaginas(): Promise<ResumoDaPagina[]> {
  if (!bancoConfigurado()) return [];
  await garantirPaginas();
  const sql = bancoDoPainel();
  const linhas = await sql<Omit<LinhaPagina, "corpo">[]>`
    SELECT id, slug, titulo, resumo, grupo, capa, capa_alt, capa_legenda, formato, descricao,
           identificacao, ordem, publicado, criado_em, atualizado_em, publicado_em
    FROM paginas`;
  // Na ordem do menu (os grupos na ordem do cabecalho, e dentro de cada um a
  // posicao), com as fora do menu no fim.
  const grupo = (g: string | null) => {
    const i = g ? (GRUPOS_DO_MENU as readonly string[]).indexOf(g) : -1;
    return i < 0 ? GRUPOS_DO_MENU.length : i;
  };
  return linhas
    .sort((a, b) => grupo(a.grupo) - grupo(b.grupo) || a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"))
    .map(paraResumo);
}

/** As publicadas, sem o corpo: menu, sitemap e relacionados. */
export async function listarPaginasPublicadas(): Promise<ResumoDaPagina[]> {
  if (!bancoConfigurado()) return [];
  await garantirPaginas();
  const sql = bancoDoPainel();
  const linhas = await sql<Omit<LinhaPagina, "corpo">[]>`
    SELECT id, slug, titulo, resumo, grupo, capa, capa_alt, capa_legenda, formato, descricao,
           identificacao, ordem, publicado, criado_em, atualizado_em, publicado_em
    FROM paginas WHERE publicado = TRUE ORDER BY ordem, titulo`;
  return linhas.map(paraResumo);
}

/** Uma publicada, com o corpo. null so quando o banco respondeu que nao existe. */
export async function buscarPaginaPublicada(slug: string): Promise<PaginaDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirPaginas();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaPagina[]>`
    SELECT * FROM paginas WHERE slug = ${slug.normalize("NFC")} AND publicado = TRUE LIMIT 1`;
  return linha ? paraPagina(linha) : null;
}

export async function buscarPaginaPorId(id: string): Promise<PaginaDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirPaginas();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaPagina[]>`SELECT * FROM paginas WHERE id = ${id} LIMIT 1`;
  return linha ? paraPagina(linha) : null;
}

/* ---------------------------------------------------------------- escrita */

/**
 * Enderecos que pagina nova nao pode tomar: as rotas proprias do site, todas
 * as paginas do site antigo (inclusive Contato e as que forem apagadas: o
 * endereco foi indexado com o texto delas) e as rotas ASCII das acentuadas.
 */
const ENDERECOS_OCUPADOS = new Set<string>([
  ...ENDERECOS_RESERVADOS,
  ...(dados as { slug: string }[]).map((p) => p.slug.normalize("NFC")),
  ...MAPA_ASCII_PAGINAS.keys(),
]);

async function slugLivre(sql: postgres.Sql, base: string, idAtual?: string): Promise<string> {
  const raiz = base || "pagina";
  for (let n = 1; n <= 49; n += 1) {
    const tentativa = juntarSlug(raiz, n === 1 ? "" : `-${n}`);
    if (ENDERECOS_OCUPADOS.has(tentativa)) continue;
    const [existe] = await sql<{ id: string }[]>`SELECT id FROM paginas WHERE slug = ${tentativa} LIMIT 1`;
    if (!existe || existe.id === idAtual) return tentativa;
  }
  return juntarSlug(raiz, `-${Date.now().toString(36)}`);
}

/** Como o do post (painel-db.ts): envio repetido de pagina nova nunca tira do ar. */
export class PaginaTiraDoArSemConfirmacao extends Error {
  constructor() {
    super("envio de pagina nova tiraria do ar uma pagina publicada");
    this.name = "PaginaTiraDoArSemConfirmacao";
  }
}

/** A ultima posicao do grupo, para a pagina que chega a ele. */
async function ordemNoFimDo(sql: postgres.Sql, grupo: string | null, idAtual?: string): Promise<number> {
  const [{ fim }] = await sql<{ fim: number }[]>`
    SELECT COALESCE(MAX(ordem) + 1, 0)::int AS fim FROM paginas
    WHERE grupo IS NOT DISTINCT FROM ${grupo} AND id IS DISTINCT FROM ${idAtual ?? null}`;
  return fim;
}

/**
 * Cria a pagina. `id`, quando vem, e' o que o editor gerou ao abrir: repetir
 * o pedido atualiza a mesma pagina (ver `criarPost`).
 */
export async function criarPagina(
  dadosDaPagina: DadosDaPagina,
  id?: string,
): Promise<{ pagina: PaginaDoPainel; estavaPublicada: boolean }> {
  await garantirPaginas();
  const sql = bancoDoPainel();
  const idDaPagina = id ?? randomUUID();
  if (id) {
    const existente = await buscarPaginaPorId(id);
    if (existente) {
      return (
        (await gravarPagina(id, dadosDaPagina, { manterNoAr: true })) ?? {
          pagina: existente,
          estavaPublicada: existente.publicado,
        }
      );
    }
  }
  const grupo = dadosDaPagina.categoria || null;
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const slug = await slugLivre(sql, gerarSlug(dadosDaPagina.titulo));
    const ordem = await ordemNoFimDo(sql, grupo);
    try {
      const [linha] = await sql<LinhaPagina[]>`
        INSERT INTO paginas (id, slug, titulo, resumo, grupo, capa, capa_alt, capa_legenda, corpo,
                             ordem, publicado, publicado_em)
        VALUES (${idDaPagina}, ${slug}, ${dadosDaPagina.titulo}, ${dadosDaPagina.resumo}, ${grupo},
                ${dadosDaPagina.capa}, ${dadosDaPagina.capaAlt}, ${dadosDaPagina.capaLegenda},
                ${dadosDaPagina.corpo}, ${ordem}, ${dadosDaPagina.publicado},
                ${dadosDaPagina.publicado ? sql`NOW()` : null})
        ON CONFLICT (id) DO NOTHING
        RETURNING *`;
      if (linha) return { pagina: paraPagina(linha), estavaPublicada: false };
      const atualizada = await gravarPagina(idDaPagina, dadosDaPagina, { manterNoAr: true });
      if (atualizada) return atualizada;
    } catch (erro) {
      if ((erro as { code?: string })?.code !== "23505" || tentativa === 3) throw erro;
    }
  }
  throw new Error("nao foi possivel escolher um endereco livre");
}

/** `formato`: `html` mantem o corpo do codigo como estava; `markdown` e' o do editor. */
export async function atualizarPagina(
  id: string,
  dadosDaPagina: DadosDaPagina,
  formato: PaginaDoPainel["formato"] = "markdown",
): Promise<{ pagina: PaginaDoPainel; estavaPublicada: boolean } | null> {
  return gravarPagina(id, dadosDaPagina, { formato });
}

/**
 * O UPDATE, com a linha travada, devolvendo se ela estava publicada logo
 * antes desta escrita (ver `gravarPost`). O endereco so muda enquanto a
 * pagina nunca foi ao ar; trocar de grupo leva a pagina para o fim dele.
 */
async function gravarPagina(
  id: string,
  d: DadosDaPagina,
  opcoes: { manterNoAr?: boolean; formato?: PaginaDoPainel["formato"] } = {},
): Promise<{ pagina: PaginaDoPainel; estavaPublicada: boolean } | null> {
  const manterNoAr = opcoes.manterNoAr === true;
  const formato = opcoes.formato ?? "markdown";
  await garantirPaginas();
  const sql = bancoDoPainel();
  const atual = await buscarPaginaPorId(id);
  if (!atual) return null;
  const slug = enderecoPodeMudar(atual, d.titulo) ? await slugLivre(sql, gerarSlug(d.titulo), id) : atual.slug;
  const grupo = d.categoria || null;
  const ordem = (atual.categoria || null) === grupo ? atual.ordem : await ordemNoFimDo(sql, grupo, id);
  // atualizado_em e' a versao do texto que o editor guarda com a copia do
  // navegador (copia-do-post.ts): anda sempre pelo menos 1 ms, para duas
  // gravacoes no mesmo milissegundo nao terem a mesma versao.
  const linhas = await sql<(LinhaPagina & { estava_publicada: boolean })[]>`
    UPDATE paginas SET
      slug = CASE WHEN paginas.publicado_em IS NULL THEN ${slug} ELSE paginas.slug END,
      titulo = ${d.titulo}, resumo = ${d.resumo}, grupo = ${grupo}, ordem = ${ordem},
      capa = ${d.capa}, capa_alt = ${d.capaAlt}, capa_legenda = ${d.capaLegenda},
      corpo = ${d.corpo}, formato = ${formato},
      publicado = ${d.publicado}, atualizado_em = GREATEST(NOW(), date_trunc('milliseconds', paginas.atualizado_em) + INTERVAL '1 millisecond'),
      publicado_em = ${
        ehEstreia(atual.publicadoEm, d.publicado) ? sql`COALESCE(paginas.publicado_em, NOW())` : sql`paginas.publicado_em`
      }
    FROM (SELECT id, publicado FROM paginas WHERE id = ${id} FOR UPDATE) AS antes
    WHERE paginas.id = antes.id
      AND (${!manterNoAr}::boolean OR antes.publicado = FALSE OR ${d.publicado}::boolean)
    RETURNING paginas.*, antes.publicado AS estava_publicada`;
  const [linha] = linhas;
  if (linha) return { pagina: paraPagina(linha), estavaPublicada: linha.estava_publicada };
  if (manterNoAr && !d.publicado && (await buscarPaginaPorId(id))?.publicado) throw new PaginaTiraDoArSemConfirmacao();
  return null;
}

/** Trava das escritas de ordem: duas janelas reordenando nao se cruzam. */
const TRAVA_DA_ORDEM = 7_370_103;

/**
 * A nova ordem de um grupo do menu: `ids` e' a lista inteira do grupo, de
 * cima para baixo. Grava so se o grupo tem exatamente essas paginas agora
 * (ver ordem-das-paginas.ts); senao devolve "desatualizada" e nada muda.
 */
export async function reordenarGrupo(
  grupo: string,
  ids: readonly string[],
): Promise<{ ok: true } | { ok: false; motivo: "desatualizada" }> {
  await garantirPaginas();
  const sql = bancoDoPainel();
  return sql.begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(${TRAVA_DA_ORDEM})`;
    const noGrupo = await sql<{ id: string }[]>`SELECT id FROM paginas WHERE grupo = ${grupo} FOR UPDATE`;
    if (!mesmasPaginas(ids, noGrupo.map((l) => l.id))) return { ok: false as const, motivo: "desatualizada" as const };
    // Uma consulta so: cada id recebe a posicao dele na lista enviada.
    await sql`
      UPDATE paginas SET ordem = nova.posicao - 1
      FROM unnest(${sql.array([...ids])}::text[]) WITH ORDINALITY AS nova(id, posicao)
      WHERE paginas.id = nova.id AND paginas.grupo = ${grupo}`;
    return { ok: true as const };
  });
}

/** Apaga de vez. Devolve o endereco que a pagina tinha, para limpar o cache. */
export async function apagarPagina(id: string): Promise<string | null> {
  await garantirPaginas();
  const sql = bancoDoPainel();
  const [linha] = await sql<{ slug: string }[]>`DELETE FROM paginas WHERE id = ${id} RETURNING slug`;
  return linha?.slug ?? null;
}
