import type { MetadataRoute } from "next";

import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { tipoDaImagem } from "@/lib/imagem-webp";
import { SITE_NAME } from "@/lib/site";

/**
 * A descricao vem da "Descricao para o Google" publicada no painel, a mesma
 * que o layout usa. A leitura nunca lanca e cai no padrao sem banco, entao o
 * manifest continua gerado no build. Ele nao entra no layout raiz: a rota do
 * painel o revalida pelo proprio caminho, junto com o site.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { contato, marca } = await lerConteudoDoSite();
  const icone = marca.icone[0];
  return {
    name: `${SITE_NAME} — Coluna Vertebral, Dor Crônica`,
    short_name: SITE_NAME,
    description: contato.descricaoParaBuscadores,
    start_url: "/",
    display: "browser",
    background_color: "#FBF8F3",
    theme_color: "#0e7bb4",
    lang: "pt-BR",
    icons: icone
      ? [{ src: icone.src, sizes: `${icone.largura}x${icone.altura}`, type: tipoDaImagem(icone.src) }]
      : [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
