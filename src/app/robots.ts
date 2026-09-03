import type { MetadataRoute } from "next";

import { SITE_URL, urlAbsoluta } from "@/lib/site";

/**
 * Nada aqui pode competir com o site da cliente.
 *
 * Enquanto o DNS de podoposture.com.br aponta para o GoDaddy, este deploy e uma
 * copia do site dela. Deixar o endereco .vercel.app ser rastreado poria os dois
 * na mesma busca, disputando o mesmo texto — conteudo duplicado contra a
 * propria cliente, e o unico requisito que ela nao pode perder e trafego.
 *
 * Por isso o portao NAO e o ambiente da Vercel: um deploy de producao continua
 * fechado enquanto o dominio dela nao for quem serve estas paginas. No corte de
 * DNS, basta DOMINIO_NO_AR=1 nas variaveis do projeto e o rastreamento abre.
 */
const EH_PRODUCAO =
  process.env.VERCEL_ENV === undefined || process.env.DOMINIO_NO_AR === "1";

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
