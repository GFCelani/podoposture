import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";

import {
  gerarSlug,
  juntarSlug,
  type DadosDoPost,
  type PostDoPainel,
} from "./painel-tipos";
import { BRUTOS_DO_JSON, MAPA_ASCII_POSTS } from "./posts";

/**
 * Enderecos que os 68 posts migrados ja ocupam.
 *
 * Entram os dois lados: o slug real (com acento) e a rota ASCII que o build
 * gera para ele. Sem isto, um texto novo chamado "Dor lombar cronica" nasceria
 * com o slug `dor-lombar-cronica`, que e exatamente a rota ASCII de um post
 * indexado — e como a busca traduz ASCII de volta para o acentuado antes de
 * procurar, o endereco continuaria servindo o texto ANTIGO. O post novo sumiria
 * sem erro nenhum, e o sitemap passaria a anunciar uma URL que mostra outra
 * coisa. Achado por auditoria cega.
 */
const ENDERECOS_JA_OCUPADOS = new Set<string>([
  ...BRUTOS_DO_JSON.map((p) => p.slug.normalize("NFC")),
  ...MAPA_ASCII_POSTS.keys(),
]);

/**
 * A primeira peca de banco do repositorio.
 *
 * Duas regras governam este arquivo:
 *
 * 1. **Toda consulta e parametrizada.** O driver so interpola valor dentro de
 *    `sql\`...\`` como parametro. Nao existe concatenacao de string aqui, e um
 *    teste de analise estatica falha se aparecer.
 *
 * 2. **Sem `DATABASE_URL`, o site continua de pe.** As leituras devolvem vazio
 *    e o painel responde 503. O blog segue mostrando os 68 posts que vivem no
 *    JSON. Uma funcionalidade nova nao pode ser capaz de derrubar o site da
 *    clinica por falta de configuracao.
 *
 * `server-only` na primeira linha garante que um import distraido a partir de
 * um componente de cliente vire erro de build, e nao um driver de Postgres
 * empacotado para o navegador.
 */

export function bancoConfigurado(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let conexao: ReturnType<typeof postgres> | null = null;

function conectar() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL ausente");
  conexao ??= postgres(url, {
    // Uma conexao por instancia: em serverless, cada instancia e efemera e
    // abrir um pool de dez seria esgotar o limite do banco a toa.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    onnotice: () => {},
  });
  return conexao;
}

let tabelasProntas = false;

/**
 * Cria o que faltar. Idempotente, roda uma vez por instancia.
 *
 * Nao ha arquivo de migracao de proposito: sao quatro tabelas que nascem
 * prontas e nunca mudaram de forma. Um sistema de migracao aqui seria
 * cerimonia para um schema que cabe na tela.
 */
async function garantirTabelas() {
  if (tabelasProntas) return;
  const sql = conectar();

  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id            TEXT PRIMARY KEY,
      slug          TEXT UNIQUE NOT NULL,
      titulo        TEXT NOT NULL,
      resumo        TEXT NOT NULL,
      categoria     TEXT NOT NULL,
      capa          TEXT NOT NULL DEFAULT '',
      corpo         TEXT NOT NULL,
      publicado     BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      publicado_em  TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS posts_publicados ON posts (publicado, publicado_em DESC)`;

  // A imagem e enderecada pelo resumo do proprio conteudo: a mesma foto enviada
  // duas vezes ocupa uma linha so, e o endereco publico nunca aponta para bytes
  // diferentes — e o que torna honesto o `immutable` no cabecalho de cache.
  await sql`
    CREATE TABLE IF NOT EXISTS imagens (
      id       TEXT PRIMARY KEY,
      bytes    BYTEA NOT NULL,
      largura  INTEGER NOT NULL,
      altura   INTEGER NOT NULL,
      tamanho  INTEGER NOT NULL,
      criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS painel_auditoria (
      id      BIGSERIAL PRIMARY KEY,
      acao    TEXT NOT NULL,
      detalhe TEXT,
      origem  TEXT,
      em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  // Contador de tentativas de senha. Fica no banco, e nao em memoria, porque em
  // serverless cada instancia teria o proprio contador — e "8 tentativas" viraria
  // "8 por instancia", que nao e limite nenhum para quem insiste.
  await sql`
    CREATE TABLE IF NOT EXISTS painel_tentativas (
      id    BIGSERIAL PRIMARY KEY,
      chave TEXT NOT NULL,
      em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS tentativas_chave ON painel_tentativas (chave, em DESC)`;

  tabelasProntas = true;
}

type LinhaPost = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  categoria: string;
  capa: string;
  corpo: string;
  publicado: boolean;
  criado_em: Date;
  atualizado_em: Date;
  publicado_em: Date | null;
};

function paraPost(l: LinhaPost): PostDoPainel {
  return {
    id: l.id,
    slug: l.slug,
    titulo: l.titulo,
    resumo: l.resumo,
    categoria: l.categoria,
    capa: l.capa,
    corpo: l.corpo,
    publicado: l.publicado,
    criadoEm: l.criado_em.toISOString(),
    atualizadoEm: l.atualizado_em.toISOString(),
    publicadoEm: l.publicado_em ? l.publicado_em.toISOString() : null,
  };
}

/** Todos os posts do painel, publicados ou nao. So o painel usa. */
export async function listarTodos(): Promise<PostDoPainel[]> {
  if (!bancoConfigurado()) return [];
  await garantirTabelas();
  const sql = conectar();
  const linhas = await sql<LinhaPost[]>`
    SELECT * FROM posts ORDER BY COALESCE(publicado_em, criado_em) DESC`;
  return linhas.map(paraPost);
}

/** Os publicados — e o que o site mostra. */
export async function listarPublicados(): Promise<PostDoPainel[]> {
  if (!bancoConfigurado()) return [];
  await garantirTabelas();
  const sql = conectar();
  const linhas = await sql<LinhaPost[]>`
    SELECT * FROM posts WHERE publicado = TRUE ORDER BY publicado_em DESC`;
  return linhas.map(paraPost);
}

export async function buscarPorSlug(slug: string): Promise<PostDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirTabelas();
  const sql = conectar();
  const [linha] = await sql<LinhaPost[]>`
    SELECT * FROM posts WHERE slug = ${slug} AND publicado = TRUE LIMIT 1`;
  return linha ? paraPost(linha) : null;
}

export async function buscarPorId(id: string): Promise<PostDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirTabelas();
  const sql = conectar();
  const [linha] = await sql<LinhaPost[]>`SELECT * FROM posts WHERE id = ${id} LIMIT 1`;
  return linha ? paraPost(linha) : null;
}

/**
 * Endereco livre, com desempate numerico.
 *
 * O slug de um post ja publicado nunca muda (ver `atualizarPost`): uma URL que
 * o Google indexou nao pode virar 404 porque alguem corrigiu uma palavra do
 * titulo.
 */
async function slugLivre(base: string, idAtual?: string): Promise<string> {
  const sql = conectar();
  const raiz = base || "post";
  for (let n = 1; n <= 49; n += 1) {
    const tentativa = juntarSlug(raiz, n === 1 ? "" : `-${n}`);
    if (ENDERECOS_JA_OCUPADOS.has(tentativa.normalize("NFC"))) continue;
    const [existe] = await sql<{ id: string }[]>`
      SELECT id FROM posts WHERE slug = ${tentativa} LIMIT 1`;
    if (!existe || existe.id === idAtual) return tentativa;
  }
  return juntarSlug(raiz, `-${Date.now().toString(36)}`);
}

export async function criarPost(dados: DadosDoPost): Promise<PostDoPainel> {
  await garantirTabelas();
  const sql = conectar();
  const base = gerarSlug(dados.titulo);

  // Duas pessoas salvando ao mesmo tempo podem escolher o mesmo endereco entre
  // a consulta e a insercao. O banco recusa (23505) e tentamos de novo.
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const slug = await slugLivre(base);
    try {
      const [linha] = await sql<LinhaPost[]>`
        INSERT INTO posts (id, slug, titulo, resumo, categoria, capa, corpo, publicado, publicado_em)
        VALUES (${randomUUID()}, ${slug}, ${dados.titulo}, ${dados.resumo}, ${dados.categoria},
                ${dados.capa}, ${dados.corpo}, ${dados.publicado},
                ${dados.publicado ? sql`NOW()` : null})
        RETURNING *`;
      return paraPost(linha);
    } catch (erro) {
      const codigo = (erro as { code?: string })?.code;
      if (codigo !== "23505" || tentativa === 3) throw erro;
    }
  }
  throw new Error("nao foi possivel escolher um endereco livre");
}

export async function atualizarPost(
  id: string,
  dados: DadosDoPost,
): Promise<PostDoPainel | null> {
  await garantirTabelas();
  const sql = conectar();
  const atual = await buscarPorId(id);
  if (!atual) return null;

  // Endereco so pode mudar enquanto o post e rascunho.
  const podeTrocarEndereco = !atual.publicado && atual.titulo !== dados.titulo;
  const slug = podeTrocarEndereco ? await slugLivre(gerarSlug(dados.titulo), id) : atual.slug;
  const estreando = dados.publicado && !atual.publicado;

  const [linha] = await sql<LinhaPost[]>`
    UPDATE posts SET
      slug = ${slug}, titulo = ${dados.titulo}, resumo = ${dados.resumo},
      categoria = ${dados.categoria}, capa = ${dados.capa}, corpo = ${dados.corpo},
      publicado = ${dados.publicado}, atualizado_em = NOW(),
      publicado_em = ${estreando ? sql`NOW()` : sql`publicado_em`}
    WHERE id = ${id}
    RETURNING *`;
  return linha ? paraPost(linha) : null;
}

export async function apagarPost(id: string): Promise<boolean> {
  await garantirTabelas();
  const sql = conectar();
  const linhas = await sql`DELETE FROM posts WHERE id = ${id} RETURNING id`;
  return linhas.length > 0;
}

/* ---------------------------------------------------------------- imagens */

export async function guardarImagem(
  id: string,
  bytes: Uint8Array,
  largura: number,
  altura: number,
): Promise<void> {
  await garantirTabelas();
  const sql = conectar();
  await sql`
    INSERT INTO imagens (id, bytes, largura, altura, tamanho)
    VALUES (${id}, ${Buffer.from(bytes)}, ${largura}, ${altura}, ${bytes.byteLength})
    ON CONFLICT (id) DO NOTHING`;
}

export async function buscarImagem(
  id: string,
): Promise<{ bytes: Buffer; largura: number; altura: number } | null> {
  if (!bancoConfigurado()) return null;
  await garantirTabelas();
  const sql = conectar();
  const [linha] = await sql<{ bytes: Buffer; largura: number; altura: number }[]>`
    SELECT bytes, largura, altura FROM imagens WHERE id = ${id} LIMIT 1`;
  return linha ?? null;
}

/* -------------------------------------------------------------- auditoria */

export type LinhaAuditoria = {
  acao: string;
  detalhe: string | null;
  origem: string | null;
  em: string;
};

const MAX_ORIGEM = 45;
const MAX_AUDITORIA = 2000;
const PODAR_A_CADA = 100;
let gravacoesDesdeAPoda = 0;

/** Nunca lanca: falha ao registrar nao pode derrubar a acao que estava sendo feita. */
export async function registrarAuditoria(
  acao: string,
  detalhe: string | null,
  origem: string | null,
): Promise<void> {
  if (!bancoConfigurado()) return;
  try {
    await garantirTabelas();
    const sql = conectar();
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe, origem)
      VALUES (${acao}, ${detalhe}, ${origem ? origem.slice(0, MAX_ORIGEM) : null})`;

    gravacoesDesdeAPoda += 1;
    if (gravacoesDesdeAPoda >= PODAR_A_CADA) {
      gravacoesDesdeAPoda = 0;
      await sql`
        DELETE FROM painel_auditoria WHERE id < (
          SELECT COALESCE(MIN(id), 0) FROM (
            SELECT id FROM painel_auditoria ORDER BY id DESC LIMIT ${MAX_AUDITORIA}
          ) recentes
        )`;
    }
  } catch (erro) {
    console.error("[painel] falha ao registrar auditoria:", erro);
  }
}

export async function listarAuditoria(limite = 40): Promise<LinhaAuditoria[]> {
  if (!bancoConfigurado()) return [];
  await garantirTabelas();
  const sql = conectar();
  const linhas = await sql<{ acao: string; detalhe: string | null; origem: string | null; em: Date }[]>`
    SELECT acao, detalhe, origem, em FROM painel_auditoria ORDER BY id DESC LIMIT ${limite}`;
  return linhas.map((l) => ({ ...l, em: l.em.toISOString() }));
}

/* ------------------------------------------------------------- tentativas */

/**
 * Conta as tentativas recentes e registra esta. Devolve quantas ja houve na
 * janela, incluindo a atual.
 *
 * Lanca se o banco estiver fora — quem chama decide o que fazer. A rota de
 * login cai para um contador em memoria nesse caso: um banco indisponivel nao
 * pode trancar a dona da clinica fora do proprio painel.
 */
export async function contarERegistrarTentativa(
  chave: string,
  janelaMs: number,
): Promise<number> {
  await garantirTabelas();
  const sql = conectar();
  const desde = new Date(Date.now() - janelaMs);

  await sql`INSERT INTO painel_tentativas (chave) VALUES (${chave})`;
  const [linha] = await sql<{ total: string }[]>`
    SELECT COUNT(*)::text AS total FROM painel_tentativas
    WHERE chave = ${chave} AND em > ${desde}`;

  // Poda oportunista: linhas fora de qualquer janela nao servem a ninguem.
  await sql`DELETE FROM painel_tentativas WHERE em < ${new Date(Date.now() - janelaMs * 4)}`;

  return Number(linha?.total ?? 0);
}

/** Zera o contador da chave — chamado quando a senha entra certa. */
export async function limparTentativas(chave: string): Promise<void> {
  try {
    await garantirTabelas();
    const sql = conectar();
    await sql`DELETE FROM painel_tentativas WHERE chave = ${chave}`;
  } catch {
    // limpar e cortesia; falhar aqui nao pode impedir o login que ja deu certo
  }
}
