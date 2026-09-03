import type { MetadataRoute } from "next";

import { PAGINAS_DINAMICAS } from "@/lib/pages";
import { BLOG_INDEX, TODOS_OS_POSTS } from "@/lib/posts";
import { SITE_URL, urlAbsoluta } from "@/lib/site";

/**
 * Sitemap gerado a partir do conteudo, nunca escrito a mao.
 *
 * O site GoDaddy publicava tres sitemaps somando 88 URLs. Este arquivo tem que
 * cobrir as mesmas 88 (20 paginas + 68 posts): qualquer uma que fique de fora e
 * uma URL que o Google conhece e deixa de encontrar. O gate de migracao em
 * scripts/verificar_urls.py compara as duas listas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const maisRecente = TODOS_OS_POSTS[0]?.dateISO;

  const home = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 1,
  };

  const indiceDoBlog = {
    url: urlAbsoluta(BLOG_INDEX),
    lastModified: maisRecente ? new Date(maisRecente) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };

  const paginas = PAGINAS_DINAMICAS.map((pagina) => ({
    // encodeURIComponent mantem o slug acentuado na forma percent-encoded que o
    // Google ja indexou (ex.: /dor-lombar-cr%C3%B4nica)
    url: urlAbsoluta(`/${encodeURIComponent(pagina.slug)}`),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const posts = TODOS_OS_POSTS.map((post) => ({
    url: urlAbsoluta(post.href),
    lastModified: new Date(post.dateISO),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [home, indiceDoBlog, ...paginas, ...posts];
}
