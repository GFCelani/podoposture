import "server-only";

import { cache } from "react";

import { BancoEmPausa, emConstrucao } from "./disjuntor";
import { markdownParaHtml } from "./markdown";
import {
  bancoConfigurado,
  buscarPorSlug,
  lerComDisjuntor,
  listarPublicadosSemCorpo,
  sondarComDisjuntor,
} from "./painel-db";
import { rotuloDaData, slugValido, type ResumoDoPainel } from "./painel-tipos";
import {
  BRUTOS_DO_JSON,
  MAPA_ASCII_POSTS,
  SLUGS_DE_POST_A_GERAR,
  SLUGS_DO_ACERVO,
  TODOS_OS_POSTS,
  buscarPost,
  paraPost,
  postsRelacionados,
  relacionadosEm,
  rotaDoPost,
  temasComTotal,
  type Post,
  type PostBruto,
  type Tema,
} from "./posts";

/**
 * De onde o blog le.
 *
 * **Com banco configurado, so do banco.** Os 69 posts do GoDaddy moram no
 * Postgres desde 2026-09-21, junto com o que o painel escreve, e sao editaveis
 * como qualquer texto do painel. A importacao (`painel-db.ts`, `importarAcervo`)
 * guarda o corpo verbatim, a data e a posicao de cada um, e este modulo devolve
 * exatamente o que o JSON devolvia — `acervo-no-banco.test.ts` compara os dois
 * post a post, e o diff do HTML servido antes x depois conferiu as paginas.
 *
 * **Sem banco configurado, so do JSON**, como sempre foi: preview sem banco,
 * maquina local, e a producao antes de a variavel existir. Nenhuma variavel e
 * obrigatoria para o site de pe.
 *
 * **Banco configurado e fora do ar: erro, nunca conteudo velho.** Cair para o
 * JSON aqui mostraria a versao antiga de um texto editado, traria de volta um
 * texto apagado — e essa versao podia ficar no cache depois que o banco
 * voltasse. Erro nao fica em cache: a pagina ja guardada continua servida (o
 * Next mantem a ultima boa quando a regeneracao falha), e a que nao existe
 * responde erro ate o banco voltar. No build, a falha derruba o build — e a
 * Vercel mantem o deploy anterior no ar, que e exatamente o que se quer.
 *
 * `server-only` porque a leitura do banco nao pode acabar no bundle do
 * navegador.
 */

/** A data que a pagina mostra: a do GoDaddy nos posts do acervo, a da publicacao nos do painel. */
function dataDoPost(p: ResumoDoPainel): string {
  return p.dataOriginal ?? p.publicadoEm ?? p.criadoEm;
}

/**
 * A ordem do blog: mais recente primeiro; no mesmo dia, a ordem do JSON.
 *
 * O JSON ordenava por `dataISO` com sort estavel, entao dois posts do mesmo
 * dia saiam na ordem do arquivo — sete dias do acervo tem mais de um post, um
 * deles tem sete. `ordem_original` e essa posicao. Post do painel nao tem, e
 * a data dele traz a hora, entao nunca empata com um do acervo.
 */
function ordemDoBlog(a: ResumoDoPainel, b: ResumoDoPainel): number {
  const porData = dataDoPost(b).localeCompare(dataDoPost(a));
  if (porData !== 0) return porData;
  const pa = a.ordemOriginal ?? Number.MAX_SAFE_INTEGER;
  const pb = b.ordemOriginal ?? Number.MAX_SAFE_INTEGER;
  return pa - pb;
}

function contarPalavrasDoHtml(html: string): number {
  const texto = html.replace(/<[^>]+>/g, " ").trim();
  return texto ? texto.split(/\s+/).length : 0;
}

/** Post do banco na mesma forma dos do JSON, para o resto do site nao notar. */
function brutoDoBanco(p: ResumoDoPainel, html: string): PostBruto {
  const dataISO = dataDoPost(p);
  return {
    slug: p.slug,
    titulo: p.titulo,
    resumo: p.resumo,
    dataISO,
    dataRotulo: rotuloDaData(dataISO),
    categorias: p.categoria ? [p.categoria] : [],
    capa: p.capa,
    html,
    palavras: contarPalavrasDoHtml(html),
    imagens: [],
  };
}

/** O corpo como a pagina renderiza: o do acervo verbatim, o do painel convertido. */
function htmlDoCorpo(post: { formato: ResumoDoPainel["formato"]; corpo: string }): string {
  return post.formato === "html" ? post.corpo : markdownParaHtml(post.corpo);
}

/** A rota ASCII (ou o proprio slug) de volta para o slug real do post. */
function slugReal(slug: string): string {
  return (MAPA_ASCII_POSTS.get(slug) ?? slug).normalize("NFC");
}

/**
 * Os publicados, sem o corpo, ja na ordem do blog.
 *
 * `cache` porque o mesmo render pede a lista mais de uma vez (o indice do blog
 * quer os posts e os temas): sem ele cada pedido era uma consulta, e o banco
 * aqui tem uma conexao so por instancia. Pelo disjuntor: /nosso-blog e
 * dinamica, e sem ele cada visita com o banco fora esperava o connect_timeout
 * inteiro, em fila na conexao unica.
 */
const publicadosDoBanco = cache(async (): Promise<ResumoDoPainel[]> => {
  try {
    const resumos = await lerComDisjuntor(listarPublicadosSemCorpo);
    return [...resumos].sort(ordemDoBlog);
  } catch (erro) {
    if (!(erro instanceof BancoEmPausa)) console.error("[blog] banco indisponivel ao listar os posts:", erro);
    throw new Error("banco indisponivel ao listar os posts do blog", { cause: erro });
  }
});

/** Todos os posts, do mais recente para o mais antigo. Lista nova a cada chamada. */
export async function todosOsPosts(): Promise<Post[]> {
  if (!bancoConfigurado()) return [...TODOS_OS_POSTS];
  return (await publicadosDoBanco()).map((p) => paraPost(brutoDoBanco(p, "")));
}

/** Temas com pelo menos um post, ordenados por volume. */
export async function categoriasDoSite(): Promise<Tema[]> {
  if (!bancoConfigurado()) return temasComTotal(BRUTOS_DO_JSON.map((p) => p.categorias));
  return temasComTotal((await publicadosDoBanco()).map((p) => (p.categoria ? [p.categoria] : [])));
}

/**
 * Um post por endereco, com o corpo pronto para a pagina.
 *
 * `cache` porque a pagina do post chama `buscarPostDoSite` duas vezes, em
 * `generateMetadata` e no componente.
 *
 * `undefined` so quando o banco respondeu que o texto nao existe. Falha lanca:
 * erro nao fica em cache, e a visita seguinte tenta de novo. Em execucao com
 * uma tentativa direta por janela de pausa (`sondarComDisjuntor`) — esta
 * leitura e de um post so, e desistir sem tentar seria responder erro num texto
 * publicado enquanto o banco ja voltou. No build, a pausa inteira vale, e a
 * falha derruba o build (ver o topo do arquivo).
 */
const postDoBanco = cache(async (slug: string): Promise<PostBruto | undefined> => {
  const buscar = async (): Promise<PostBruto | undefined> => {
    const post = await buscarPorSlug(slug);
    return post ? brutoDoBanco(post, htmlDoCorpo(post)) : undefined;
  };
  try {
    return await (emConstrucao() ? lerComDisjuntor(buscar) : sondarComDisjuntor(buscar));
  } catch (erro) {
    if (!(erro instanceof BancoEmPausa)) console.error("[blog] banco indisponivel ao buscar post:", erro);
    throw new Error("banco indisponivel ao buscar post", { cause: erro });
  }
});

/**
 * O post de um endereco.
 *
 * A rota chega em ASCII: boa parte dos posts do acervo tem acento no slug, o
 * Next 16.3.4 nao serve rota com caractere nao-ASCII (#73965) e o middleware
 * reescreve o acentuado para o ASCII (`rotas.json`). `slugReal` desfaz a
 * traducao antes de procurar.
 *
 * Endereco que nao e do acervo nem tem a forma de um slug do painel nem chega
 * ao banco: nao ha o que procurar, e robo varrendo URL inventada nao gasta
 * consulta.
 */
export async function buscarPostDoSite(slug: string): Promise<PostBruto | undefined> {
  if (!bancoConfigurado()) return buscarPost(slug);
  const real = slugReal(slug);
  if (!SLUGS_DO_ACERVO.has(real) && !slugValido(real)) return undefined;
  return postDoBanco(real);
}

/** Os relacionados do fim de um post. Mesma regra para as duas fontes (`relacionadosEm`). */
export async function relacionadosDoSite(slug: string, quantos = 3): Promise<Post[]> {
  if (!bancoConfigurado()) return postsRelacionados(slug, quantos);
  return relacionadosEm(await todosOsPosts(), slugReal(slug), quantos);
}

/**
 * As rotas de post que o build pre-gera: todos os publicados, na forma ASCII.
 * Post apagado pelo painel sai daqui; post novo entra sem esperar visita.
 */
export async function slugsDePostAGerar(): Promise<string[]> {
  if (!bancoConfigurado()) return [...SLUGS_DE_POST_A_GERAR];
  return (await publicadosDoBanco()).map((p) => rotaDoPost(p.slug));
}
