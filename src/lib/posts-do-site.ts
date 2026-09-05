import "server-only";

import { contarPalavras, markdownParaHtml } from "./markdown";
import { listarPublicados } from "./painel-db";
import { rotuloDaData } from "./painel-tipos";
import {
  BRUTOS_DO_JSON,
  MAPA_ASCII_POSTS,
  hrefDoPost,
  paraPost,
  type Post,
  type PostBruto,
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
 * `server-only` porque a leitura do banco nao pode acabar no bundle do
 * navegador. Componentes de cliente continuam importando `posts.ts`, que so
 * enxerga o JSON.
 */

/** Post do banco na mesma forma dos migrados, para o resto do site nao notar. */
async function brutosDoBanco(): Promise<PostBruto[]> {
  const doBanco = await listarPublicados();
  return doBanco.map((p) => {
    const quando = p.publicadoEm ?? p.criadoEm;
    return {
      slug: p.slug,
      titulo: p.titulo,
      resumo: p.resumo,
      dataISO: quando,
      dataRotulo: rotuloDaData(quando),
      categorias: p.categoria ? [p.categoria] : [],
      capa: p.capa,
      html: markdownParaHtml(p.corpo),
      palavras: contarPalavras(p.corpo),
      imagens: [],
    };
  });
}

/**
 * Todos os posts, do mais recente para o mais antigo.
 *
 * Falha do banco nao derruba o blog: o `catch` devolve o que o JSON tem, que e
 * o acervo inteiro que existe hoje. O oposto — pagina de erro porque o Postgres
 * piscou — seria trocar 68 artigos que funcionam por nenhum.
 */
export async function todosOsBrutos(): Promise<PostBruto[]> {
  let novos: PostBruto[] = [];
  try {
    novos = await brutosDoBanco();
  } catch (erro) {
    console.error("[blog] banco indisponivel, servindo so os posts do repositorio:", erro);
  }

  // Slug repetido entre as fontes: o do repositorio vence, porque e o que ja
  // esta indexado.
  const conhecidos = new Set(BRUTOS_DO_JSON.map((p) => p.slug.normalize("NFC")));
  const somenteNovos = novos.filter((p) => !conhecidos.has(p.slug.normalize("NFC")));

  return [...BRUTOS_DO_JSON, ...somenteNovos].sort((a, b) =>
    b.dataISO.localeCompare(a.dataISO),
  );
}

export async function todosOsPosts(): Promise<Post[]> {
  return (await todosOsBrutos()).map(paraPost);
}

/**
 * O post de um endereco, venha ele de onde vier.
 *
 * O `MAPA_ASCII_POSTS` nao e detalhe: 59 dos 68 posts migrados tem acento no
 * slug, e o Next 16.3.4 nao serve rota com caractere nao-ASCII (#73965). A rota
 * gerada e a versao sem acento, e o middleware reescreve a URL bonita para ela
 * — entao o que chega aqui e a chave ASCII, e sem traduzir de volta nenhum
 * desses 59 posts e encontrado.
 *
 * Esta traducao existia em `buscarPost` e se perdeu quando esta funcao foi
 * escrita. O gate de migracao acusou: 59 URLs indexadas dando 404.
 */
export async function buscarPostDoSite(slug: string): Promise<PostBruto | undefined> {
  const real = MAPA_ASCII_POSTS.get(slug) ?? slug;
  const alvo = real.normalize("NFC");
  return (await todosOsBrutos()).find((p) => p.slug.normalize("NFC") === alvo);
}

/** Categorias com pelo menos um post, das duas fontes, ordenadas por volume. */
export async function categoriasDoSite(): Promise<
  { label: string; href: string; total: number }[]
> {
  const contagem = (await todosOsBrutos()).reduce<Record<string, number>>((acc, post) => {
    for (const categoria of post.categorias) acc[categoria] = (acc[categoria] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(contagem)
    .map(([label, total]) => ({
      label,
      total,
      href: `/nosso-blog?categoria=${encodeURIComponent(label)}`,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
}

export { hrefDoPost };
