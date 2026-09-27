import medidas from "@/content/capas.json";
import { lerNomeDoArquivo } from "./imagem-webp";

/**
 * Medidas e imagem de compartilhamento das capas do blog.
 *
 * As capas sao artes de Instagram com texto escrito na imagem, de 9:16 a 3:2.
 * Regra do site: a capa aparece inteira, sempre; nenhum lugar recorta. Para
 * isso a pagina do post precisa da razao antes do download (CLS zero), e o
 * cartao de compartilhamento precisa vir pronto em 1.91:1, porque a rede
 * social recortaria qualquer outra razao.
 *
 * Capa do acervo: medida por scripts/gerar-capas.mjs em capas.json, com o og
 * gerado ao lado. Capa do painel: as medidas estao no proprio nome do arquivo
 * (ver imagem-webp.ts) e nao ha og gerado, entao o compartilhamento usa o
 * cartao geral do site, que nunca corta nada.
 */

export type Medida = { largura: number; altura: number };

const DO_ACERVO: Record<string, number[] | undefined> = medidas;

export function medidaDaCapa(src: string): Medida | undefined {
  const acervo = DO_ACERVO[src];
  if (acervo) return { largura: acervo[0], altura: acervo[1] };
  if (src.startsWith("/img/post/")) {
    const nome = lerNomeDoArquivo(src.slice("/img/post/".length));
    if (nome) return { largura: nome.largura, altura: nome.altura };
  }
  return undefined;
}

/** O cartao 1200x630 da capa, ou o geral do site quando ela nao tem um. */
export function ogDaCapa(src: string | undefined): string {
  if (src && DO_ACERVO[src]) {
    return src.replace(/^\/img\/blog\//, "/img/og/").replace(/\.webp$/, ".jpg");
  }
  return "/og.png";
}
