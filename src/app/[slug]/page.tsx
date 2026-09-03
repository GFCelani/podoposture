import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PaginaMedicaJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { BlocosDeConteudo } from "@/components/prose";
import {
  SLUGS_A_GERAR,
  buscarPagina,
  descricaoDaPagina,
  tituloDaPagina,
} from "@/lib/pages";

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

// qualquer slug fora da lista e 404 de verdade, nao uma pagina vazia
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagina = buscarPagina(slug);
  if (!pagina) return {};

  const titulo = tituloDaPagina(pagina);
  const descricao = descricaoDaPagina(pagina);
  const caminho = `/${encodeURIComponent(pagina.slug)}`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: titulo,
      description: descricao,
      url: caminho,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: titulo }],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: ["/og.png"],
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

  const titulo = tituloDaPagina(pagina);
  const descricao = descricaoDaPagina(pagina);
  const caminho = `/${encodeURIComponent(pagina.slug)}`;

  return (
    <>
      <TrilhaJsonLd itens={[{ nome: titulo, caminho }]} />
      <PaginaMedicaJsonLd
        titulo={titulo}
        descricao={descricao}
        caminho={caminho}
      />
      <PageShell titulo={titulo} trilha={[{ nome: titulo }]}>
        <BlocosDeConteudo blocos={pagina.blocos} tituloDaPagina={titulo} />
      </PageShell>
    </>
  );
}
