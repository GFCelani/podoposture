import type { MetadataRoute } from "next";

import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { SITE_NAME } from "@/lib/site";

/**
 * A descricao vem da "Descricao para o Google" publicada no painel, a mesma
 * que o layout usa. A leitura nunca lanca e cai no padrao sem banco, entao o
 * manifest continua gerado no build; a publicacao do contato invalida o
 * layout raiz, e o manifest se refaz junto.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { contato } = await lerConteudoDoSite();
  return {
    name: `${SITE_NAME} — Coluna Vertebral, Dor Crônica`,
    short_name: SITE_NAME,
    description: contato.descricaoParaBuscadores,
    start_url: "/",
    display: "browser",
    background_color: "#FBF8F3",
    theme_color: "#0e7bb4",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
