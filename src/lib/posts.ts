/**
 * Os 68 posts do blog, agora hospedados no proprio site.
 *
 * Antes este arquivo trazia 10 posts escritos a mao cujo `href` apontava para
 * fora, ao site GoDaddy — ou seja, todo o link juice do blog ia para o dominio
 * antigo e nenhuma das paginas era indexavel aqui. Agora o conteudo vem de
 * src/content/posts.json (gerado por scripts/extrair_blog.py) e as URLs sao
 * internas.
 *
 * As URLs seguem em /home/f/<slug>, exatamente como no GoDaddy. Sao elas que
 * ranqueiam hoje; troca-las exigiria 68 redirects e uma janela de
 * reprocessamento do Google, sem ganho para a clinica.
 */

import dados from "@/content/posts.json";
import rotas from "@/content/rotas.json";

export type PostBruto = {
  slug: string;
  titulo: string;
  resumo: string;
  dataISO: string;
  dataRotulo: string;
  categorias: string[];
  capa: string;
  html: string;
  palavras: number;
  imagens: string[];
};

/** Forma consumida pela listagem — mantida compativel com o Journal existente. */
export type Post = {
  slug: string;
  /** Data por extenso, para leitura. */
  date: string;
  /** Data ISO, para <time dateTime> e para o schema. */
  dateISO: string;
  category: string | null;
  title: string;
  excerpt: string | null;
  href: string;
  cover: string;
};

export const PREFIXO_POST = "/home/f/";
export const BLOG_INDEX = "/nosso-blog";

const BRUTOS = (dados as PostBruto[])
  .slice()
  .sort((a, b) => b.dataISO.localeCompare(a.dataISO));

/**
 * Capas de reserva.
 *
 * Alguns posts antigos nao tem imagem destacada. Em vez de deixar o cartao sem
 * ilustracao, reaproveitamos as capas que ja estavam no repositorio, de forma
 * estavel (indice do post), para o layout nao variar entre builds.
 */
const CAPAS_RESERVA = Array.from(
  { length: 10 },
  (_, i) => `/img/blog/${String(i + 1).padStart(2, "0")}.webp`,
);

export function hrefDoPost(slug: string): string {
  // encodeURIComponent preserva o slug acentuado como o Google ja o conhece
  return `${PREFIXO_POST}${encodeURIComponent(slug)}`;
}

function paraPost(bruto: PostBruto, indice: number): Post {
  return {
    slug: bruto.slug,
    date: bruto.dataRotulo,
    dateISO: bruto.dataISO,
    category: bruto.categorias[0] ?? null,
    title: bruto.titulo,
    excerpt: bruto.resumo || null,
    href: hrefDoPost(bruto.slug),
    cover: bruto.capa || CAPAS_RESERVA[indice % CAPAS_RESERVA.length],
  };
}

/** Todos os posts, do mais recente para o mais antigo. */
export const TODOS_OS_POSTS: Post[] = BRUTOS.map(paraPost);

/** Os 10 mais recentes — o que a home mostra. */
export const POSTS: Post[] = TODOS_OS_POSTS.slice(0, 10);

/**
 * ascii -> slug real do post. Mesma fonte que o middleware usa
 * (src/content/rotas.json), para os dois lados nunca divergirem.
 */
export const MAPA_ASCII_POSTS = new Map<string, string>(
  Object.entries(rotas.posts as Record<string, string>).map(
    ([real, ascii]) => [ascii, real],
  ),
);

/** Slugs das rotas geradas: o ASCII quando ha traducao, senao o proprio slug. */
export const SLUGS_DE_POST_A_GERAR = BRUTOS.map(
  (p) => (rotas.posts as Record<string, string>)[p.slug] ?? p.slug,
);

export function buscarPost(slug: string): PostBruto | undefined {
  const real = MAPA_ASCII_POSTS.get(slug) ?? slug;
  const alvo = real.normalize("NFC");
  return BRUTOS.find((p) => p.slug.normalize("NFC") === alvo);
}

export function postsRelacionados(slug: string, quantos = 3): Post[] {
  const atual = buscarPost(slug);
  if (!atual) return POSTS.slice(0, quantos);

  const categoria = atual.categorias[0];
  const outros = TODOS_OS_POSTS.filter((p) => p.slug !== atual.slug);
  const mesmaCategoria = categoria
    ? outros.filter((p) => p.category === categoria)
    : [];

  // `outros` ja contem `mesmaCategoria`; sem o filtro o mesmo post entraria duas
  // vezes quando a categoria tem menos posts que `quantos`, duplicando a key no React
  const complemento = outros.filter((p) => !mesmaCategoria.includes(p));
  return [...mesmaCategoria, ...complemento].slice(0, quantos);
}

/** Categorias com pelo menos um post, ordenadas por volume. */
export const CATEGORIES: { label: string; href: string; total: number }[] =
  Object.entries(
    BRUTOS.reduce<Record<string, number>>((acc, post) => {
      for (const categoria of post.categorias) {
        acc[categoria] = (acc[categoria] ?? 0) + 1;
      }
      return acc;
    }, {}),
  )
    .map(([label, total]) => ({
      label,
      total,
      href: `${BLOG_INDEX}?categoria=${encodeURIComponent(label)}`,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
