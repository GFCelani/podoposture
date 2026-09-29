import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PaginaInterna } from "@/components/pagina-interna";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { SLUGS_A_GERAR, buscarPagina, descricaoDaPagina, rotuloDaPagina } from "@/lib/pages";

/**
 * As 20 paginas internas.
 *
 * Segmento dinamico, e nao 20 pastas com nome proprio, por dois motivos
 * concretos: os slugs tem acento ("/dor-lombar-cronica"), e nomes de pasta
 * acentuados sofrem normalizacao Unicode NFC/NFD entre Windows, git e Linux —
 * quebra silenciosa; e um deles tem "+" ("/metodo-posture+"), que em
 * path-to-regexp (usado por redirects/rewrites) e modificador de repeticao, nao
 * caractere literal. Em segmento dinamico os dois casos sao apenas texto.
 */

export function generateStaticParams() {
  return SLUGS_A_GERAR.map((slug) => ({ slug }));
}

/**
 * Era `false`, e isso derrubava as 18 paginas para 404 no primeiro
 * `revalidatePath("/", "layout")` — que roda a cada publicacao na pagina
 * inicial e em toda coleta da noite. Com os parametros dinamicos desligados, a
 * pagina invalidada chega a regeneracao sem versao anterior e o Next responde
 * 404, e o 404 fica em cache (medido com `next start`). Endereco inventado
 * continua sendo 404: a pagina chama `notFound()` quando `buscarPagina` nao
 * acha. O teste em src/lib/revalidacao.test.ts impede a volta do `false`.
 */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagina = buscarPagina(slug);
  if (!pagina) return {};

  /* Rotulo, e nao titulo: na aba o nome da pagina e' colado a marca pelo
     template ("... | Podoposture"), e o ponto final ficaria no meio da
     linha. Ver rotuloDaPagina. O corpo da pagina continua com a frase
     inteira, ponto incluido. */
  const rotulo = rotuloDaPagina(pagina);
  const { contato, compartilhamento } = await lerConteudoDoSite();
  const descricao = descricaoDaPagina(pagina, contato.descricaoParaBuscadores);
  const cartao = compartilhamento.imagem;
  const caminho = `/${encodeURIComponent(pagina.slug)}`;

  return {
    title: rotulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: rotulo,
      description: descricao,
      url: caminho,
      images: [{ url: cartao.src, width: cartao.largura, height: cartao.altura, alt: rotulo }],
    },
    twitter: {
      card: "summary_large_image",
      title: rotulo,
      description: descricao,
      images: [cartao.src],
    },
  };
}

export default async function Pagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pagina = buscarPagina(slug);
  if (!pagina) notFound();

  return <PaginaInterna pagina={pagina} conteudo={await lerConteudoDoSite()} />;
}
