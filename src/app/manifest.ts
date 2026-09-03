import type { MetadataRoute } from "next";

import { DESCRICAO_PADRAO, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Coluna Vertebral, Dor Crônica`,
    short_name: SITE_NAME,
    description: DESCRICAO_PADRAO,
    start_url: "/",
    display: "browser",
    background_color: "#faf9f6",
    theme_color: "#0e71b4",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
