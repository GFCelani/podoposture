import type { MetadataRoute } from "next";

import { PAGINAS_DINAMICAS } from "@/lib/pages";
import { BLOG_INDEX } from "@/lib/posts";
import { todosOsPosts } from "@/lib/posts-do-site";
import { SITE_URL, urlAbsoluta } from "@/lib/site";

/**
 * Sitemap gerado a partir do conteudo, nunca escrito a mao.
 *
 * O site GoDaddy publicava tres sitemaps somando 88 URLs. Este arquivo tem que
 * cobrir as mesmas 88 (20 paginas + 68 posts): qualquer uma que fique de fora e
 * uma URL que o Google conhece e deixa de encontrar. O gate de migracao em
 * scripts/verificar_urls.py compara as duas listas.
 *
 * Passou a ser assincrono quando o painel entrou: alem dos 68 do repositorio,
 * ele agora precisa listar o que a clinica publicar daqui em diante. Sem isso,
 * post novo existiria no site e nunca seria anunciado ao buscador.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts_ = await todosOsPosts();
  const maisRecente = posts_[0]?.dateISO;

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

  const posts = posts_.map((post) => ({
    url: urlAbsoluta(post.href),
    lastModified: new Date(post.dateISO),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  // Nasceu com a medicao de visitas, fora das 88 do site antigo. Entra no
  // sitemap porque quem busca como o site trata os dados precisa acha-la.
  // Data fixa: e a da ultima mudanca do texto, e nao a do build.
  const privacidade = {
    url: urlAbsoluta("/privacidade"),
    lastModified: new Date("2026-09-11"),
    changeFrequency: "yearly" as const,
    priority: 0.2,
  };

  return [home, indiceDoBlog, ...paginas, ...posts, privacidade];
}
