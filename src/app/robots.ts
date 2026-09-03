import type { MetadataRoute } from "next";

import { SITE_URL, urlAbsoluta } from "@/lib/site";

/**
 * O preview nao pode competir com o site da cliente.
 *
 * Enquanto o DNS nao aponta para ca, o deploy vive em podoposture.vercel.app com
 * o mesmo conteudo de podoposture.com.br. Sem este bloqueio sao dois enderecos
 * disputando as mesmas buscas — conteudo duplicado contra a propria cliente.
 * Em producao (VERCEL_ENV === "production") o rastreamento e liberado.
 */
const EH_PRODUCAO =
  process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === undefined;

export default function robots(): MetadataRoute.Robots {
  if (!EH_PRODUCAO) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: SITE_URL,
  };
}
