import "server-only";

import { randomUUID } from "node:crypto";
import postgres from "postgres";

import {
  OCIOSIDADE_DA_CONEXAO_S,
  PAUSA_EM_EXECUCAO_MS,
  PAUSA_NO_BUILD_MS,
  TEMPO_PARA_ABRIR_CONEXAO_S,
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
import { BRUTOS_DO_JSON, MAPA_ASCII_POSTS, type PostBruto } from "./posts";

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
    // Os dois moram no disjuntor: o prazo das leituras publicas e medido contra eles.
    idle_timeout: OCIOSIDADE_DA_CONEXAO_S,
    connect_timeout: TEMPO_PARA_ABRIR_CONEXAO_S,
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
  // No build as paginas disputam uma conexao por worker, abrindo e em fila: o
  // prazo curto ali tirava paginas com o conteudo padrao por um banco lento.
  sempreAbrindo: () => emConstrucao(),
});

/**
 * Leitura de pagina publica: tenta de novo quando a conexao caiu e para de
 * tentar por um tempo depois de uma falha. Lanca — quem chama decide entre o
 * que mostrar sem banco e deixar a pagina sem cache.
 */
export function lerComDisjuntor<T>(leitura: () => Promise<T>): Promise<T> {
  return disjuntorPublico.ler(leitura);
}

/**
 * Como `lerComDisjuntor`, mas com direito a UMA tentativa direta por pausa
 * (ver `sondar` em disjuntor.ts). So para leitura que nao tem o que mostrar sem
 * banco — hoje, a pagina de um post do painel.
 */
export function sondarComDisjuntor<T>(leitura: () => Promise<T>): Promise<T> {
  return disjuntorPublico.sondar(leitura);
}

/** 42P01 = tabela inexistente: o painel ainda nao gravou nada nesta base. */
function tabelaAusente(erro: unknown): boolean {
  return (erro as { code?: string })?.code === "42P01";
}

let tabelasProntas = false;

/**
 * A forma atual das tabelas. Sobe quando o DDL abaixo muda; a instancia que
 * encontra esta marca em `painel_manutencao` pula o DDL inteiro.
 *
 * O pulo existe porque desde a migracao do acervo a leitura publica tambem
 * passa por aqui, e `ALTER TABLE ... IF NOT EXISTS` toma trava exclusiva da
 * tabela mesmo quando nao ha nada a fazer: sem a marca, cada instancia nova
 * seguraria a tabela de posts por um instante na primeira visita.
 */
const ESQUEMA = "esquema-v2";

/** Chave da trava consultiva do DDL (numero arbitrario, fixo). */
const TRAVA_DO_ESQUEMA = 7_370_001;

/**
 * Cria o que faltar. Idempotente, roda uma vez por instancia.
 *
 * Nao ha arquivo de migracao de proposito: sao sete tabelas que cabem na tela,
 * e as mudancas de forma ate hoje couberam em ALTER idempotente. Um sistema de
 * migracao aqui seria cerimonia.
 *
 * Tudo numa transacao com trava consultiva: duas instancias novas (ou os
 * workers do build) rodando o mesmo DDL ao mesmo tempo colidem — um
 * `CREATE TABLE IF NOT EXISTS` concorrente cai com 23505, e foi exatamente
 * isso que ja derrubou o blog num build. Com a trava, a segunda espera a
 * primeira e depois nao encontra nada a fazer.
 *
 * A tabela `temas` mora aqui, e nao num modulo proprio, porque `posts` aponta
 * para ela: a chave estrangeira precisa dela criada antes.
 */
export async function garantirTabelas() {
  if (tabelasProntas) return;
  const sql = bancoDoPainel();

  try {
    const [marca] = await sql`SELECT nome FROM painel_manutencao WHERE nome = ${ESQUEMA}`;
    if (marca) {
      tabelasProntas = true;
      return;
    }
  } catch (erro) {
    if (!tabelaAusente(erro)) throw erro;
  }

  await sql.begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(${TRAVA_DO_ESQUEMA})`;
    await criarTabelas(sql);
    await sql`
      INSERT INTO painel_manutencao (nome, em) VALUES (${ESQUEMA}, NOW())
      ON CONFLICT (nome) DO NOTHING`;
  });
  tabelasProntas = true;
}

async function criarTabelas(sql: postgres.TransactionSql) {
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

  // Quando rodou a ultima poda dos dados do painel. No banco, e nao em memoria,
  // pelo mesmo motivo das tentativas: um contador por instancia serverless zera
  // a cada instancia nova e nunca chega ao ponto de podar (ver `podarSeVenceu`).
  await sql`
    CREATE TABLE IF NOT EXISTS painel_manutencao (
      nome TEXT PRIMARY KEY,
      em   TIMESTAMPTZ NOT NULL
    )`;

  /* -- v2: acervo do GoDaddy no banco e temas geridos pelo painel -------- */

  await sql`
    CREATE TABLE IF NOT EXISTS temas (
      id        TEXT PRIMARY KEY,
      nome      TEXT NOT NULL UNIQUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  // "Zumbido" e "zumbido" seriam dois temas na lista do blog. O UNIQUE acima
  // e o alvo da chave estrangeira; este aqui barra so a diferenca de caixa.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS temas_nome_sem_caixa ON temas (lower(nome))`;

  // Sem tema passa a ser NULL (64 dos 69 posts do GoDaddy nao tem tema).
  await sql`ALTER TABLE posts ALTER COLUMN categoria DROP NOT NULL`;
  await sql`UPDATE posts SET categoria = NULL WHERE categoria = ''`;
  // Todo tema que um post ja usa vira linha em `temas` antes da chave existir.
  await sql`
    INSERT INTO temas (id, nome)
    SELECT gen_random_uuid()::text, categoria
    FROM (SELECT DISTINCT categoria FROM posts WHERE categoria IS NOT NULL) AS usados
    ON CONFLICT DO NOTHING`;
  // A trava de seguranca dos temas mora no banco, e nao so na tela:
  // - ON UPDATE CASCADE: renomear o tema renomeia em todos os posts de uma vez;
  // - ON DELETE RESTRICT: apagar tema com texto e recusado. Quem apaga tem de
  //   mover os textos antes (ver `apagarTema`), e um texto que entre no tema no
  //   meio da operacao faz o DELETE falhar em vez de ficar orfao.
  const [chave] = await sql`SELECT conname FROM pg_constraint WHERE conname = 'posts_categoria_tema'`;
  if (!chave) {
    await sql`
      ALTER TABLE posts ADD CONSTRAINT posts_categoria_tema
      FOREIGN KEY (categoria) REFERENCES temas (nome)
      ON UPDATE CASCADE ON DELETE RESTRICT`;
  }

  // `html`: corpo do GoDaddy guardado verbatim (ver PostDoPainel.formato).
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS formato TEXT NOT NULL DEFAULT 'markdown'`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS data_original TEXT`;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ordem_original INTEGER`;

  // O livro do acervo: slug que ja entrou alguma vez. E ele que impede um post
  // apagado pelo painel de voltar no proximo deploy (o JSON ainda o tem).
  await sql`
    CREATE TABLE IF NOT EXISTS acervo_importado (
      slug TEXT PRIMARY KEY,
      em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
}

type LinhaPost = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  categoria: string | null;
  capa: string;
  corpo: string;
  publicado: boolean;
  criado_em: Date;
  atualizado_em: Date;
  publicado_em: Date | null;
  formato: string;
  data_original: string | null;
  ordem_original: number | null;
};

function paraResumo(l: Omit<LinhaPost, "corpo">): ResumoDoPainel {
  return {
    id: l.id,
    slug: l.slug,
    titulo: l.titulo,
    resumo: l.resumo,
    categoria: l.categoria ?? "",
    capa: l.capa,
    publicado: l.publicado,
    criadoEm: l.criado_em.toISOString(),
    atualizadoEm: l.atualizado_em.toISOString(),
    publicadoEm: l.publicado_em ? l.publicado_em.toISOString() : null,
    formato: l.formato === "html" ? "html" : "markdown",
    dataOriginal: l.data_original,
    ordemOriginal: l.ordem_original,
  };
}

function paraPost(l: LinhaPost): PostDoPainel {
  return { ...paraResumo(l), corpo: l.corpo };
}

/**
 * O banco pronto para ler post: tabelas na forma atual e o acervo do GoDaddy
 * importado. Toda leitura e escrita de post passa por aqui.
 */
export async function garantirBanco(): Promise<void> {
  await garantirTabelas();
  await garantirAcervo();
}

/**
 * Todos os posts, publicados ou nao, sem o corpo. E a lista do painel: com os
 * 69 do acervo, trazer o corpo de todos para mostrar so o titulo mandava ~300
 * KB a cada vez que ela abria a aba. O editor busca o texto inteiro pelo id.
 */
export async function listarTodos(): Promise<ResumoDoPainel[]> {
  if (!bancoConfigurado()) return [];
  await garantirBanco();
  const sql = bancoDoPainel();
  const linhas = await sql<Omit<LinhaPost, "corpo">[]>`
    SELECT id, slug, titulo, resumo, categoria, capa, publicado, criado_em,
           atualizado_em, publicado_em, formato, data_original, ordem_original
    FROM posts
    ORDER BY COALESCE(publicado_em, criado_em) DESC, ordem_original ASC NULLS FIRST`;
  return linhas.map(paraResumo);
}

/**
 * Os publicados, sem o corpo — e o que a listagem do site mostra.
 *
 * Sem o corpo de proposito: o indice do blog, a home e o sitemap leem esta
 * lista, e nenhum deles mostra o texto. Carregar o corpo de todos para exibir
 * titulo e resumo era a consulta mais cara do site, repetida a cada visita.
 *
 * A ordem final e a de `posts-do-site.ts`, que desempata como o JSON fazia.
 */
export async function listarPublicadosSemCorpo(): Promise<ResumoDoPainel[]> {
  if (!bancoConfigurado()) return [];
  await garantirBanco();
  const sql = bancoDoPainel();
  const linhas = await sql<Omit<LinhaPost, "corpo">[]>`
    SELECT id, slug, titulo, resumo, categoria, capa, publicado, criado_em,
           atualizado_em, publicado_em, formato, data_original, ordem_original
    FROM posts WHERE publicado = TRUE ORDER BY publicado_em DESC`;
  return linhas.map(paraResumo);
}

/**
 * Um publicado, com o corpo — e o que a pagina do texto precisa. null so
 * quando o banco RESPONDEU que nao existe; falha de conexao lanca, para a
 * pagina nao guardar um 404 de um texto que existe.
 */
export async function buscarPorSlug(slug: string): Promise<PostDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirBanco();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaPost[]>`
    SELECT * FROM posts WHERE slug = ${slug.normalize("NFC")} AND publicado = TRUE LIMIT 1`;
  return linha ? paraPost(linha) : null;
}

export async function buscarPorId(id: string): Promise<PostDoPainel | null> {
  if (!bancoConfigurado()) return null;
  await garantirBanco();
  const sql = bancoDoPainel();
  const [linha] = await sql<LinhaPost[]>`SELECT * FROM posts WHERE id = ${id} LIMIT 1`;
  return linha ? paraPost(linha) : null;
}

/* ----------------------------------------------------------------- acervo */

/** Chave da trava consultiva da importacao (numero arbitrario, fixo). */
const TRAVA_DO_ACERVO = 7_370_002;

let acervoPronto: Promise<number> | null = null;

/**
 * Importa o acervo uma vez por instancia. Falhou, a proxima chamada tenta de
 * novo — a promessa nao fica guardada com o erro dentro.
 */
export function garantirAcervo(): Promise<number> {
  acervoPronto ??= importarAcervo(BRUTOS_DO_JSON).catch((erro) => {
    acervoPronto = null;
    throw erro;
  });
  return acervoPronto;
}

/**
 * Leva para o banco os posts do JSON que ainda nao entraram. Devolve quantos.
 *
 * - Corpo verbatim, `formato = 'html'`: nenhuma conversao, entao a pagina sai
 *   byte a byte igual (ver `acervo-no-banco.test.ts`).
 * - `data_original` e `ordem_original` guardam o que a pagina e a ordem do
 *   indice usavam: a data do GoDaddy e a posicao no arquivo, que desempata os
 *   sete dias com mais de um post.
 * - O tema do GoDaddy vira linha em `temas` com a grafia exata; se so a caixa
 *   difere de um que ja existe, o post entra no que existe.
 * - `acervo_importado` guarda cada slug que entrou. Post apagado pelo painel
 *   continua no JSON, e sem este livro voltaria no proximo deploy.
 *
 * E tambem o caminho da sincronizacao com o GoDaddy: post novo no JSON entra
 * aqui no primeiro acesso depois do deploy. Post que ja entrou nao e tocado —
 * dali em diante quem manda nele e o painel, e editar o JSON nao muda nada.
 *
 * Uma importacao por vez (trava consultiva): o build abre varios workers, e
 * cada instancia nova tambem chamaria isto.
 */
export async function importarAcervo(acervo: readonly PostBruto[]): Promise<number> {
  if (acervo.length === 0) return 0;
  await garantirTabelas();
  const slugs = acervo.map((p) => p.slug.normalize("NFC"));

  // Caminho de toda instancia depois da primeira: uma consulta e acabou.
  const sql = bancoDoPainel();
  const [{ ja }] = await sql<{ ja: number }[]>`
    SELECT count(*)::int AS ja FROM acervo_importado WHERE slug = ANY(${slugs})`;
  if (ja === slugs.length) return 0;

  return sql.begin(async (sql) => {
    await sql`SELECT pg_advisory_xact_lock(${TRAVA_DO_ACERVO})`;
    const importados = new Set(
      (await sql<{ slug: string }[]>`SELECT slug FROM acervo_importado`).map((l) => l.slug),
    );

    let novos = 0;
    for (const [ordem, bruto] of acervo.entries()) {
      const slug = slugs[ordem];
      if (importados.has(slug)) continue;

      if (bruto.categorias.length > 1) {
        console.warn(`[acervo] ${slug} tem ${bruto.categorias.length} temas; o banco guarda so o primeiro`);
      }
      let categoria: string | null = bruto.categorias[0]?.normalize("NFC") ?? null;
      if (categoria) {
        const [existente] = await sql<{ nome: string }[]>`
          SELECT nome FROM temas WHERE lower(nome) = lower(${categoria})`;
        if (existente) categoria = existente.nome;
        else await sql`INSERT INTO temas (id, nome) VALUES (${randomUUID()}, ${categoria})`;
      }

      // Meio-dia em UTC: o mesmo dia do calendario em Brasilia e em UTC. So a
      // lista do painel le isto; a pagina usa `data_original`.
      const quando = new Date(`${bruto.dataISO}T12:00:00.000Z`);
      const [linha] = await sql`
        INSERT INTO posts (id, slug, titulo, resumo, categoria, capa, corpo, formato,
                           publicado, criado_em, atualizado_em, publicado_em,
                           data_original, ordem_original)
        VALUES (${randomUUID()}, ${slug}, ${bruto.titulo}, ${bruto.resumo}, ${categoria},
                ${bruto.capa}, ${bruto.html}, 'html', TRUE, ${quando}, ${quando}, ${quando},
                ${bruto.dataISO}, ${ordem})
        ON CONFLICT (slug) DO NOTHING
        RETURNING id`;
      if (!linha) {
        // Um post do painel ja ocupa o endereco. Nao entra, nao vai para o
        // livro (tenta de novo no proximo deploy) e fica no log para alguem ver.
        console.error(`[acervo] ${slug} nao entrou: o endereco ja e de outro post`);
        continue;
      }
      await sql`INSERT INTO acervo_importado (slug) VALUES (${slug})`;
      novos += 1;
    }

    // Post novo no topo do JSON desloca a posicao de todos. A ordem guardada
    // acompanha o arquivo de agora, para o desempate continuar o do JSON.
    if (novos > 0) {
      for (const [ordem, slug] of slugs.entries()) {
        await sql`
          UPDATE posts SET ordem_original = ${ordem}
          WHERE slug = ${slug} AND data_original IS NOT NULL`;
      }
    }
    return novos;
  });
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
 * Lancado quando um envio de texto novo tentaria tirar do ar um texto que ja
 * esta publicado. Nesse caminho o editor ainda acha que o texto e novo e nunca
 * mostra o aviso de "Tirar do site e guardar"; a rota responde 409.
 */
/**
 * O tema escolhido foi apagado (em outra janela) entre a validacao e a escrita.
 * A chave estrangeira recusa; a rota responde 400 pedindo outro tema.
 */
export class TemaInexistente extends Error {
  constructor() {
    super("o tema escolhido nao existe mais");
    this.name = "TemaInexistente";
  }
}

export class TiraDoArSemConfirmacao extends Error {
  constructor() {
    super("envio de texto novo tiraria do ar um texto publicado");
    this.name = "TiraDoArSemConfirmacao";
  }
}

/**
 * Cria o texto. `id`, quando vem, e o que o editor gerou ao abrir: repetir o
 * pedido com o mesmo id atualiza o texto em vez de criar outro. Sem isso, a
 * resposta que se perdia no 4G depois de o banco gravar deixava "Sem conexao",
 * ela clicava de novo e o site ganhava "dor-lombar" e "dor-lombar-2" iguais.
 *
 * Essa repeticao nunca tira do ar: com o texto ja publicado e o envio pedindo
 * rascunho, lanca `TiraDoArSemConfirmacao`. A regra fica na escrita, e nao numa
 * leitura da rota, porque com dois envios cruzados a leitura via o texto ainda
 * inexistente e deixava o rascunho passar.
 */
export async function criarPost(
  dados: DadosDoPost,
  id?: string,
): Promise<{ post: PostDoPainel; estavaPublicado: boolean }> {
  await garantirBanco();
  const sql = bancoDoPainel();
  const base = gerarSlug(dados.titulo);
  const idDoPost = id ?? randomUUID();

  if (id) {
    const existente = await buscarPorId(id);
    if (existente) {
      return (
        (await gravarPost(id, dados, { manterNoAr: true })) ?? { post: existente, estavaPublicado: existente.publicado }
      );
    }
  }

  // Duas pessoas salvando ao mesmo tempo podem escolher o mesmo endereco entre
  // a consulta e a insercao. O banco recusa (23505) e tentamos de novo.
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const slug = await slugLivre(base);
    try {
      const [linha] = await sql<LinhaPost[]>`
        INSERT INTO posts (id, slug, titulo, resumo, categoria, capa, corpo, publicado, publicado_em)
        VALUES (${idDoPost}, ${slug}, ${dados.titulo}, ${dados.resumo}, ${dados.categoria || null},
                ${dados.capa}, ${dados.corpo}, ${dados.publicado},
                ${dados.publicado ? sql`NOW()` : null})
        ON CONFLICT (id) DO NOTHING
        RETURNING *`;
      if (linha) return { post: paraPost(linha), estavaPublicado: false };
      // O mesmo id entrou por outro pedido entre a conferencia e a insercao.
      const atualizado = await gravarPost(idDoPost, dados, { manterNoAr: true });
      if (atualizado) return atualizado;
    } catch (erro) {
      const codigo = (erro as { code?: string })?.code;
      if (codigo === "23503") throw new TemaInexistente();
      if (codigo !== "23505" || tentativa === 3) throw erro;
    }
  }
  throw new Error("nao foi possivel escolher um endereco livre");
}

/**
 * `formato` so vem quando a rota decide: `html` mantem o corpo do GoDaddy como
 * estava (ela nao mexeu no texto), `markdown` e o corpo que veio do editor.
 */
export async function atualizarPost(
  id: string,
  dados: DadosDoPost,
  formato: PostDoPainel["formato"] = "markdown",
): Promise<PostDoPainel | null> {
  return (await gravarPost(id, dados, { formato }))?.post ?? null;
}

/**
 * O UPDATE de um texto, devolvendo tambem se ele estava publicado logo antes
 * DESTA escrita. Quem decide limpar o cache do site precisa desse estado, e nao
 * de uma leitura feita antes: com dois envios cruzados (publicar, a resposta se
 * perde no 4G, e ela clica em guardar como rascunho), a leitura do segundo via
 * o texto ainda inexistente, o segundo tirava do ar sem limpar nada, e o texto
 * seguia na home e no indice. Lido pelo proprio UPDATE, com a linha travada,
 * o estado anterior e o que o banco tinha no instante da troca.
 *
 * `manterNoAr` recusa, pela mesma linha travada, a troca de publicado para
 * rascunho (ver `criarPost`).
 */
async function gravarPost(
  id: string,
  dados: DadosDoPost,
  opcoes: { manterNoAr?: boolean; formato?: PostDoPainel["formato"] } = {},
): Promise<{ post: PostDoPainel; estavaPublicado: boolean } | null> {
  const manterNoAr = opcoes.manterNoAr === true;
  const formato = opcoes.formato ?? "markdown";
  await garantirBanco();
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
  let linhas: (LinhaPost & { estava_publicado: boolean })[];
  try {
    linhas = await sql<(LinhaPost & { estava_publicado: boolean })[]>`
    UPDATE posts SET
      slug = CASE WHEN posts.publicado_em IS NULL THEN ${slug} ELSE posts.slug END,
      titulo = ${dados.titulo}, resumo = ${dados.resumo},
      categoria = ${dados.categoria || null}, capa = ${dados.capa}, corpo = ${dados.corpo},
      formato = ${formato},
      publicado = ${dados.publicado}, atualizado_em = NOW(),
      publicado_em = ${
        ehEstreia(atual.publicadoEm, dados.publicado)
          ? sql`COALESCE(posts.publicado_em, NOW())`
          : sql`posts.publicado_em`
      }
    FROM (SELECT id, publicado FROM posts WHERE id = ${id} FOR UPDATE) AS antes
    WHERE posts.id = antes.id
      AND (${!manterNoAr}::boolean OR antes.publicado = FALSE OR ${dados.publicado}::boolean)
    RETURNING posts.*, antes.publicado AS estava_publicado`;
  } catch (erro) {
    if ((erro as { code?: string })?.code === "23503") throw new TemaInexistente();
    throw erro;
  }
  const [linha] = linhas;
  if (linha) return { post: paraPost(linha), estavaPublicado: linha.estava_publicado };
  // Nada escrito: ou o texto sumiu entre a leitura e a escrita, ou a regra
  // acima recusou. A decisao ja foi tomada com a linha travada; esta leitura so
  // diz qual dos dois foi.
  if (manterNoAr && !dados.publicado && (await buscarPorId(id))?.publicado) throw new TiraDoArSemConfirmacao();
  return null;
}

export async function apagarPost(id: string): Promise<boolean> {
  await garantirBanco();
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

/**
 * A cada quantas acoes registradas o excedente da auditoria e apagado, e quanto
 * no maximo por vez. O lote maior que o passo faz o excedente encolher mesmo
 * com gravacao sem parar; e o limite do lote deixa o DELETE pequeno o bastante
 * para rodar dentro de qualquer requisicao, inclusive a de login.
 */
export const PASSO_DA_PODA_POR_VOLUME = 200;
export const LOTE_DA_PODA_POR_VOLUME = 1000;

/** Nunca lanca: falha ao registrar nao pode derrubar a acao que estava sendo feita. */
export async function registrarAuditoria(
  acao: string,
  detalhe: string | null,
  origem: string | null,
): Promise<void> {
  if (!bancoConfigurado()) return;
  let id: number;
  try {
    await garantirTabelas();
    const sql = bancoDoPainel();
    const [linha] = await sql<{ id: string }[]>`
      INSERT INTO painel_auditoria (acao, detalhe, origem)
      VALUES (${acao}, ${detalhe}, ${origem ? origem.slice(0, MAX_ORIGEM) : null})
      RETURNING id`;
    id = Number(linha?.id ?? 0);
  } catch (erro) {
    console.error("[painel] falha ao registrar auditoria:", erro);
    return;
  }
  try {
    // Por volume, alem do tempo: so com a regra de 24 h, uma enxurrada de senhas
    // erradas enchia a tabela ate a poda seguinte, e essa poda apagava milhoes
    // de linhas de uma vez dentro de uma requisicao. Um lote a cada N acoes
    // mantem o excedente perto de zero o tempo todo.
    if (id > 0 && id % PASSO_DA_PODA_POR_VOLUME === 0) await podarAuditoriaEmLote();
    // A poda por tempo nao roda na senha errada: esse caminho e o do ataque, e
    // quem espera atras dele e a dona tentando entrar. As acoes do painel e a
    // tarefa da noite cuidam dela.
    if (acao !== "login-falhou") await podarSeVenceu();
  } catch (erro) {
    console.error("[painel] falha ao podar os dados do painel:", erro);
  }
}

/** Apaga ate um lote das acoes mais antigas que as 2.000 mais recentes. */
async function podarAuditoriaEmLote(): Promise<void> {
  const sql = bancoDoPainel();
  await sql`
    DELETE FROM painel_auditoria WHERE id IN (
      SELECT id FROM painel_auditoria
      WHERE id < (
        SELECT COALESCE(MIN(id), 0) FROM (
          SELECT id FROM painel_auditoria ORDER BY id DESC LIMIT ${MAX_AUDITORIA}
        ) recentes
      )
      ORDER BY id
      LIMIT ${LOTE_DA_PODA_POR_VOLUME}
    )`;
}

/**
 * Uma hora — o prazo que a pagina de privacidade promete para o IP de quem
 * tenta entrar. E o mesmo que a poda oportunista de `contarERegistrarTentativa`
 * aplica (quatro vezes a janela de 15 min).
 */
export const RETENCAO_DE_TENTATIVAS_MS = 60 * 60 * 1000;

/** De quanto em quanto tempo a poda roda, pela tarefa da noite ou pelo uso do painel. */
export const INTERVALO_DA_PODA_MS = 24 * 60 * 60 * 1000;

/** As duas limpezas, e a marca de quando rodaram. `sql` e o da transacao de quem chama. */
async function podar(sql: postgres.TransactionSql): Promise<void> {
  // Quanto a poda pode segurar o banco. So nesta transacao, com SET LOCAL: na
  // conexao inteira seria parametro de inicio de sessao, que alguns poolers
  // recusam. Poda que passa disso desfaz, e a proxima tenta de novo.
  await sql`SET LOCAL statement_timeout = '20s'`;
  await sql`
    DELETE FROM painel_tentativas
    WHERE em < ${new Date(Date.now() - RETENCAO_DE_TENTATIVAS_MS)}`;
  await sql`
    DELETE FROM painel_auditoria WHERE id < (
      SELECT COALESCE(MIN(id), 0) FROM (
        SELECT id FROM painel_auditoria ORDER BY id DESC LIMIT ${MAX_AUDITORIA}
      ) recentes
    )`;
}

/**
 * Apaga o que passou do prazo prometido na pagina de privacidade, sem depender
 * de ninguem usar o painel.
 *
 * A poda das tentativas roda dentro de `contarERegistrarTentativa`, mas so
 * quando alguem tenta entrar. Num site de uma clinica, onde o painel passa dias
 * sem ser aberto, o IP de quem tentou entrar ficava guardado ate a proxima
 * tentativa de alguem, que pode ser semanas depois. Quem cumpre a promessa
 * quando nao ha trafego e esta funcao, chamada pela coleta da noite.
 */
export async function podarDadosDoPainel(): Promise<void> {
  await garantirTabelas();
  await bancoDoPainel().begin(async (sql) => {
    await podar(sql);
    await sql`
      INSERT INTO painel_manutencao (nome, em) VALUES ('poda', NOW())
      ON CONFLICT (nome) DO UPDATE SET em = NOW()`;
  });
}

/**
 * A poda sem a tarefa da noite: roda na primeira acao registrada depois de 24 h
 * da ultima.
 *
 * Antes era a cada 100 gravacoes, contadas em memoria. Em serverless o contador
 * zera a cada instancia nova, e um painel com poucas acoes por dia nunca chegava
 * a 100 numa instancia so — sem a tarefa diaria, a limpeza que a privacidade
 * promete simplesmente nao acontecia. Por tempo e com a marca no banco, vale
 * para qualquer instancia.
 *
 * A marca e tomada e a poda feita na MESMA transacao, e o UPDATE so pega a
 * linha se ela venceu: duas acoes simultaneas nao podam duas vezes, e uma poda
 * que falha desfaz a marca, entao a proxima acao tenta de novo.
 */
async function podarSeVenceu(): Promise<void> {
  const vencida = new Date(Date.now() - INTERVALO_DA_PODA_MS);
  await bancoDoPainel().begin(async (sql) => {
    const tomada = await sql`
      INSERT INTO painel_manutencao (nome, em) VALUES ('poda', NOW())
      ON CONFLICT (nome) DO UPDATE SET em = NOW()
      WHERE painel_manutencao.em < ${vencida}
      RETURNING nome`;
    if (tomada.length > 0) await podar(sql);
  });
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
