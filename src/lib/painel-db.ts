import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";

import {
  PAUSA_EM_EXECUCAO_MS,
  PAUSA_NO_BUILD_MS,
  criarDisjuntor,
  emConstrucao,
} from "./disjuntor";
import type { TipoDeImagem } from "./imagem-webp";
import {
  ehEstreia,
  enderecoPodeMudar,
  gerarSlug,
  juntarSlug,
  type DadosDoPost,
  type PostDoPainel,
  type ResumoDoPainel,
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

/**
 * A conexao do site com o Postgres — uma so, compartilhada por todo modulo de
 * banco.
 *
 * Exportada para que modulos novos (`conteudo-db.ts`, `numeros-db.ts`) usem a
 * mesma conexao sem editar este arquivo. Regras para quem usa:
 *
 * - Nunca abrir outro `postgres(...)`. O limite de uma conexao por instancia e
 *   o que impede o site de esgotar o banco; um segundo cliente dobraria isso
 *   sem ninguem perceber.
 * - Conferir `bancoConfigurado()` antes. Sem `DATABASE_URL` esta funcao LANCA,
 *   e uma leitura publica sem essa conferencia derrubaria pagina e build.
 * - Criar as proprias tabelas com `CREATE TABLE IF NOT EXISTS`, numa funcao
 *   `garantir...` do proprio modulo, com a mesma trava de "uma vez por
 *   instancia" que `garantirTabelas` usa aqui. Tabela nova nao entra neste
 *   arquivo: cada modulo e dono do que cria.
 * - Guardar o retorno numa variavel chamada `sql` e consultar so com ela como
 *   tag de template. O teste de rotas protegidas procura exatamente essa tag.
 */
export function bancoDoPainel() {
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

/**
 * Um disjuntor so para toda leitura publica (conteudo da home, lista do blog,
 * post do painel, imagem). Compartilhado de proposito: eles dividem a mesma
 * conexao, e um banco fora para um esta fora para todos. Ver disjuntor.ts.
 */
const disjuntorPublico = criarDisjuntor({
  pausaMs: () => (emConstrucao() ? PAUSA_NO_BUILD_MS : PAUSA_EM_EXECUCAO_MS),
});

/**
 * Leitura de pagina publica: tenta de novo quando a conexao caiu e para de
 * tentar por um tempo depois de uma falha. Lanca — quem chama decide entre o
 * que mostrar sem banco e deixar a pagina sem cache.
 */
export function lerComDisjuntor<T>(leitura: () => Promise<T>): Promise<T> {
  return disjuntorPublico.ler(leitura);
}

/** 42P01 = tabela inexistente: o painel ainda nao gravou nada nesta base. */
function tabelaAusente(erro: unknown): boolean {
  return (erro as { code?: string })?.code === "42P01";
}

let tabelasProntas = false;

/**
 * Cria o que faltar. So o painel chama: leitura publica nao cria tabela (ver
 * `listarPublicadosSemCorpo`). Idempotente, roda uma vez por instancia.
 *
 * Nao ha arquivo de migracao de proposito: sao quatro tabelas que cabem na
 * tela, e a unica mudanca de forma ate hoje (o formato da imagem) coube num
 * ALTER idempotente. Um sistema de migracao aqui seria cerimonia.
 */
async function garantirTabelas() {
  if (tabelasProntas) return;
  const sql = bancoDoPainel();

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
  // O formato entrou depois, quando o Safari passou a mandar JPEG. Fica num
  // ALTER, e nao no CREATE acima, para banco que ja tinha a tabela ganhar a
  // coluna do mesmo jeito que banco novo; toda imagem antiga, que so podia ser
  // WebP, fica certa pelo valor padrao.
  await sql`ALTER TABLE imagens ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'image/webp'`;

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

function paraResumo(l: Omit<LinhaPost, "corpo">): ResumoDoPainel {
  return {
    id: l.id,
    slug: l.slug,
    titulo: l.titulo,
    resumo: l.resumo,
    categoria: l.categoria,
    capa: l.capa,
    publicado: l.publicado,
    criadoEm: l.criado_em.toISOString(),
    atualizadoEm: l.atualizado_em.toISOString(),
    publicadoEm: l.publicado_em ? l.publicado_em.toISOString() : null,
  };
}

function paraPost(l: LinhaPost): PostDoPainel {
  return { ...paraResumo(l), corpo: l.corpo };
}

/** Todos os posts do painel, publicados ou nao. So o painel usa. */
export async function listarTodos(): Promise<PostDoPainel[]> {
  if (!bancoConfigurado()) return [];
  await garantirTabelas();
  const sql = bancoDoPainel();
  const linhas = await sql<LinhaPost[]>`
    SELECT * FROM posts ORDER BY COALESCE(publicado_em, criado_em) DESC`;
  return linhas.map(paraPost);
}

/**
 * Os publicados, sem o corpo — e o que a listagem do site mostra.
 *
 * Sem o corpo de proposito: o indice do blog, a home e o sitemap leem esta
 * lista, e nenhum deles mostra o texto. Carregar o corpo de todos para exibir
 * titulo e resumo era a consulta mais cara do site, repetida a cada visita.
 *
 * Leitura publica: nao cria tabela, e tabela inexistente e lista vazia. Com
 * `garantirTabelas` aqui, cada instancia nova rodava sete comandos de DDL numa
 * visita ao blog, e no build com o banco vazio os workers disputavam o mesmo
 * CREATE TABLE (um deles caia com 23505 e servia o blog sem os posts do banco).
 */
export async function listarPublicadosSemCorpo(): Promise<ResumoDoPainel[]> {
  if (!bancoConfigurado()) return [];
  const sql = bancoDoPainel();
  try {
    const linhas = await sql<Omit<LinhaPost, "corpo">[]>`
      SELECT id, slug, titulo, resumo, categoria, capa, publicado,
             criado_em, atualizado_em, publicado_em
      FROM posts WHERE publicado = TRUE ORDER BY publicado_em DESC`;
    return linhas.map(paraResumo);
  } catch (erro) {
    if (tabelaAusente(erro)) return [];
    throw erro;
  }
}

/**
 * Um publicado, com o corpo — e o que a pagina do texto precisa. null so
 * quando o banco RESPONDEU que nao existe; falha de conexao lanca, para a
 * pagina nao guardar um 404 de um texto que existe. Leitura publica, sem DDL.
 */
export async function buscarPorSlug(slug: string): Promise<PostDoPainel | null> {
  if (!bancoConfigurado()) return null;
  const sql = bancoDoPainel();
  try {
    const [linha] = await sql<LinhaPost[]>`
      SELECT * FROM posts WHERE slug = ${slug} AND publicado = TRUE LIMIT 1`;
    return linha ? paraPost(linha) : null;
  } catch (erro) {
    if (tabelaAusente(erro)) return null;
    throw erro;
  }
}

export async function buscarPorId(id: string): Promise<PostDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirTabelas();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaPost[]>`SELECT * FROM posts WHERE id = ${id} LIMIT 1`;
  return linha ? paraPost(linha) : null;
}

/**
 * Endereco livre, com desempate numerico.
 *
 * O slug de um post que ja foi publicado alguma vez nunca muda (ver
 * `enderecoPodeMudar`): uma URL que o Google indexou nao pode virar 404 porque
 * alguem corrigiu uma palavra do titulo.
 */
async function slugLivre(base: string, idAtual?: string): Promise<string> {
  const sql = bancoDoPainel();
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

/**
 * Cria o texto. `id`, quando vem, e o que o editor gerou ao abrir: repetir o
 * pedido com o mesmo id atualiza o texto em vez de criar outro. Sem isso, a
 * resposta que se perdia no 4G depois de o banco gravar deixava "Sem conexao",
 * ela clicava de novo e o site ganhava "dor-lombar" e "dor-lombar-2" iguais.
 */
export async function criarPost(dados: DadosDoPost, id?: string): Promise<PostDoPainel> {
  await garantirTabelas();
  const sql = bancoDoPainel();
  const base = gerarSlug(dados.titulo);
  const idDoPost = id ?? randomUUID();

  if (id) {
    const existente = await buscarPorId(id);
    if (existente) return (await atualizarPost(id, dados)) ?? existente;
  }

  // Duas pessoas salvando ao mesmo tempo podem escolher o mesmo endereco entre
  // a consulta e a insercao. O banco recusa (23505) e tentamos de novo.
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const slug = await slugLivre(base);
    try {
      const [linha] = await sql<LinhaPost[]>`
        INSERT INTO posts (id, slug, titulo, resumo, categoria, capa, corpo, publicado, publicado_em)
        VALUES (${idDoPost}, ${slug}, ${dados.titulo}, ${dados.resumo}, ${dados.categoria},
                ${dados.capa}, ${dados.corpo}, ${dados.publicado},
                ${dados.publicado ? sql`NOW()` : null})
        ON CONFLICT (id) DO NOTHING
        RETURNING *`;
      if (linha) return paraPost(linha);
      // O mesmo id entrou por outro pedido entre a conferencia e a insercao.
      const atualizado = await atualizarPost(idDoPost, dados);
      if (atualizado) return atualizado;
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
  const sql = bancoDoPainel();
  const atual = await buscarPorId(id);
  if (!atual) return null;

  // As duas regras moram em painel-tipos.ts, onde tem teste: o endereco so
  // muda enquanto o texto nunca foi ao ar, e a data e a da primeira publicacao.
  const slug = enderecoPodeMudar(atual, dados.titulo)
    ? await slugLivre(gerarSlug(dados.titulo), id)
    : atual.slug;

  // COALESCE, e nao so NOW(): se dois salvamentos cruzarem entre a leitura
  // acima e esta escrita, o segundo ainda nao reescreve a data do primeiro.
  // O endereco segue a mesma cautela: a leitura acima pode ser de antes de
  // outro salvamento publicar o texto, e so o proprio UPDATE sabe se ele ja
  // foi ao ar. Com `publicado_em` preenchido o slug fica, venha de onde vier.
  const [linha] = await sql<LinhaPost[]>`
    UPDATE posts SET
      slug = CASE WHEN publicado_em IS NULL THEN ${slug} ELSE slug END,
      titulo = ${dados.titulo}, resumo = ${dados.resumo},
      categoria = ${dados.categoria}, capa = ${dados.capa}, corpo = ${dados.corpo},
      publicado = ${dados.publicado}, atualizado_em = NOW(),
      publicado_em = ${
        ehEstreia(atual.publicadoEm, dados.publicado)
          ? sql`COALESCE(publicado_em, NOW())`
          : sql`publicado_em`
      }
    WHERE id = ${id}
    RETURNING *`;
  return linha ? paraPost(linha) : null;
}

export async function apagarPost(id: string): Promise<boolean> {
  await garantirTabelas();
  const sql = bancoDoPainel();
  const linhas = await sql`DELETE FROM posts WHERE id = ${id} RETURNING id`;
  return linhas.length > 0;
}

/* ---------------------------------------------------------------- imagens */

export async function guardarImagem(
  id: string,
  bytes: Uint8Array,
  largura: number,
  altura: number,
  tipo: TipoDeImagem,
): Promise<void> {
  await garantirTabelas();
  const sql = bancoDoPainel();
  await sql`
    INSERT INTO imagens (id, bytes, largura, altura, tamanho, tipo)
    VALUES (${id}, ${Buffer.from(bytes)}, ${largura}, ${altura}, ${bytes.byteLength}, ${tipo})
    ON CONFLICT (id) DO NOTHING`;
}

type ImagemGuardada = { bytes: Buffer; largura: number; altura: number; tipo: TipoDeImagem };

/** Leitura publica (a rota que serve a imagem): sem DDL, tabela ausente e "nao existe". */
export async function buscarImagem(id: string): Promise<ImagemGuardada | null> {
  if (!bancoConfigurado()) return null;
  const sql = bancoDoPainel();
  try {
    const [linha] = await sql<ImagemGuardada[]>`
      SELECT bytes, largura, altura, tipo FROM imagens WHERE id = ${id} LIMIT 1`;
    return linha ?? null;
  } catch (erro) {
    if (tabelaAusente(erro)) return null;
    throw erro;
  }
}

/* -------------------------------------------------------------- auditoria */

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
    const sql = bancoDoPainel();
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

/* ------------------------------------------------------------- tentativas */

/**
 * Conta as tentativas recentes e registra esta. Devolve quantas ja houve na
 * janela para a chave, incluindo a atual, e quantas houve somando todas as
 * chaves (o alerta de tentativa espalhada por muitos enderecos).
 *
 * Lanca se o banco estiver fora — quem chama decide o que fazer. A rota de
 * login cai para um contador em memoria nesse caso: um banco indisponivel nao
 * pode trancar a dona da clinica fora do proprio painel.
 */
export async function contarERegistrarTentativa(
  chave: string,
  janelaMs: number,
): Promise<{ daChave: number; todas: number }> {
  await garantirTabelas();
  const sql = bancoDoPainel();
  const desde = new Date(Date.now() - janelaMs);

  await sql`INSERT INTO painel_tentativas (chave) VALUES (${chave})`;
  const [linha] = await sql<{ da_chave: string; todas: string }[]>`
    SELECT COUNT(*) FILTER (WHERE chave = ${chave})::text AS da_chave, COUNT(*)::text AS todas
    FROM painel_tentativas
    WHERE em > ${desde}`;

  // Poda oportunista: linhas fora de qualquer janela nao servem a ninguem.
  await sql`DELETE FROM painel_tentativas WHERE em < ${new Date(Date.now() - janelaMs * 4)}`;

  return { daChave: Number(linha?.da_chave ?? 0), todas: Number(linha?.todas ?? 0) };
}

/** Zera o contador da chave — chamado quando a senha entra certa. */
export async function limparTentativas(chave: string): Promise<void> {
  try {
    await garantirTabelas();
    const sql = bancoDoPainel();
    await sql`DELETE FROM painel_tentativas WHERE chave = ${chave}`;
  } catch {
    // limpar e cortesia; falhar aqui nao pode impedir o login que ja deu certo
  }
}
