import "server-only";

import { cache } from "react";

import { BancoEmPausa, emConstrucao } from "./disjuntor";
import { contarPalavras, markdownParaHtml } from "./markdown";
import { buscarPorSlug, lerComDisjuntor, listarPublicadosSemCorpo } from "./painel-db";
import { rotuloDaData, slugValido, type ResumoDoPainel } from "./painel-tipos";
import {
  BRUTOS_DO_JSON,
  TODOS_OS_POSTS,
  buscarPost,
  paraPost,
  temasComTotal,
  type Post,
  type PostBruto,
  type Tema,
} from "./posts";

/**
 * As duas fontes do blog, reunidas.
 *
 * Os 68 posts migrados do GoDaddy continuam num JSON do repositorio, e nao vao
 * para o banco. Nao e preguica: sao eles que sustentam as URLs indexadas, o
 * gate de migracao compara palavra por palavra contra o site antigo, e mover
 * esse conteudo seria arriscar tudo isso para ganhar uniformidade. O banco e
 * so aditivo — guarda o que a clinica escrever daqui em diante.
 *
 * Toda pagina que lista posts (indice do blog, home, sitemap) passa por aqui.
 * Ler `TODOS_OS_POSTS` direto de `posts.ts` foi o que deixou o texto publicado
 * pelo painel fora do indice do blog: ele existia na URL e no sitemap, e em
 * nenhuma lista.
 *
 * `server-only` porque a leitura do banco nao pode acabar no bundle do
 * navegador. Componentes de cliente continuam importando `posts.ts`, que so
 * enxerga o JSON.
 */

/** Post do banco na mesma forma dos migrados, para o resto do site nao notar. */
function brutoDoPainel(p: ResumoDoPainel, corpo: string): PostBruto {
  const quando = p.publicadoEm ?? p.criadoEm;
  return {
    slug: p.slug,
    titulo: p.titulo,
    resumo: p.resumo,
    dataISO: quando,
    dataRotulo: rotuloDaData(quando),
    categorias: p.categoria ? [p.categoria] : [],
    capa: p.capa,
    html: markdownParaHtml(corpo),
    palavras: contarPalavras(corpo),
    imagens: [],
  };
}

const SLUGS_DO_REPOSITORIO = new Set(BRUTOS_DO_JSON.map((p) => p.slug.normalize("NFC")));

/**
 * Os publicados pelo painel, na forma da listagem, sem o corpo.
 *
 * `cache` porque o mesmo render pede a lista mais de uma vez (o indice do blog
 * quer os posts e os temas): sem ele cada pedido era uma consulta, e o banco
 * aqui tem uma conexao so por instancia.
 *
 * Falha do banco nao derruba o blog: o `catch` devolve lista vazia e o site
 * mostra o que o JSON tem, que e o acervo inteiro de hoje. O oposto — pagina
 * de erro porque o Postgres piscou — seria trocar 68 artigos que funcionam por
 * nenhum.
 *
 * Pelo disjuntor: /nosso-blog e dinamica, e sem ele cada visita com o banco
 * fora esperava o connect_timeout inteiro, em fila na conexao unica.
 */
const novosDoBanco = cache(async (): Promise<Post[]> => {
  try {
    const resumos = await lerComDisjuntor(listarPublicadosSemCorpo);
    return (
      resumos
        // Slug repetido entre as fontes: o do repositorio vence, porque e o que
        // ja esta indexado.
        .filter((p) => !SLUGS_DO_REPOSITORIO.has(p.slug.normalize("NFC")))
        // Corpo vazio: a forma de listagem nao carrega o texto.
        .map((p) => paraPost(brutoDoPainel(p, "")))
    );
  } catch (erro) {
    if (!(erro instanceof BancoEmPausa)) {
      console.error("[blog] banco indisponivel, servindo so os posts do repositorio:", erro);
    }
    return [];
  }
});

/** Todos os posts, do mais recente para o mais antigo. */
export async function todosOsPosts(): Promise<Post[]> {
  const novos = await novosDoBanco();
  // Lista nova a cada chamada: o resultado em cache e dividido pelo render
  // inteiro, e um `sort` de quem chama reordenaria a lista de todo mundo.
  return [...TODOS_OS_POSTS, ...novos].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

/** Temas com pelo menos um post, das duas fontes, ordenados por volume. */
export async function categoriasDoSite(): Promise<Tema[]> {
  const novos = await novosDoBanco();
  return temasComTotal([
    ...BRUTOS_DO_JSON.map((p) => p.categorias),
    ...novos.map((p) => (p.category ? [p.category] : [])),
  ]);
}

/**
 * Um post do painel por endereco, com o corpo ja convertido.
 *
 * `cache` porque a pagina do post chama `buscarPostDoSite` duas vezes, em
 * `generateMetadata` e no componente; sem ele eram duas consultas e duas
 * conversoes de Markdown por visita.
 *
 * `undefined` so quando o banco respondeu que o texto nao existe. Com o banco
 * fora, a pagina chamava `notFound()` e o 404 ia para o cache com status 404:
 * um texto publicado ficava fora do ar para o Google e para quem abria o link
 * ate a proxima invalidacao. Em execucao a falha agora lanca: erro nao fica em
 * cache, a versao boa ja guardada continua servida, e a visita seguinte tenta
 * de novo. Esse texto nao esta entre as 88 URLs do repositorio — sem banco ele
 * nao tem de onde vir. No build a falha segue virando `undefined`, porque la
 * nenhum post do banco e pre-gerado e erro derrubaria o build.
 */
const postDoBanco = cache(async (slug: string): Promise<PostBruto | undefined> => {
  try {
    const post = await lerComDisjuntor(() => buscarPorSlug(slug));
    return post ? brutoDoPainel(post, post.corpo) : undefined;
  } catch (erro) {
    if (!(erro instanceof BancoEmPausa)) {
      console.error("[blog] banco indisponivel ao buscar post do painel:", erro);
    }
    if (emConstrucao()) return undefined;
    throw new Error("banco indisponivel ao buscar post do painel", { cause: erro });
  }
});

/**
 * O post de um endereco, venha ele de onde vier.
 *
 * O repositorio e consultado primeiro, e pelo `buscarPost`, que traduz a rota
 * ASCII de volta para o slug acentuado: 59 dos 68 posts migrados tem acento, o
 * Next 16.3.4 nao serve rota com caractere nao-ASCII (#73965), e sem essa
 * traducao nenhum deles era encontrado — o gate de migracao ja acusou 59 URLs
 * indexadas dando 404 por isso.
 *
 * So depois o banco, e so com um post por consulta. Antes esta funcao carregava
 * todos os publicados, com corpo, e convertia o Markdown de todos para achar um.
 * Endereco que nao tem a forma de um slug do painel nem chega ao banco: o
 * painel so gera slug ASCII, entao nao ha o que procurar.
 */
export async function buscarPostDoSite(slug: string): Promise<PostBruto | undefined> {
  const doRepositorio = buscarPost(slug);
  if (doRepositorio) return doRepositorio;
  if (!slugValido(slug)) return undefined;
  return postDoBanco(slug);
}
