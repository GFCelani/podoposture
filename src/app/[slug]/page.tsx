import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Contact } from "@/components/contact";
import { ConviteConsulta } from "@/components/convite-consulta";
import { FotoDaPagina } from "@/components/foto-da-pagina";
import { PaginaMedicaJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { Conteudo } from "@/components/prose";
import { ilustracaoDaPagina } from "@/lib/ilustracao-da-pagina";
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
  const ilustracao = ilustracaoDaPagina(pagina.slug);

  return (
    <>
      <TrilhaJsonLd itens={[{ nome: titulo, caminho }]} />
      <PaginaMedicaJsonLd
        titulo={titulo}
        descricao={descricao}
        caminho={caminho}
      />
      {/* O subtitulo vinha sendo calculado uma linha acima so para o JSON-LD,
          enquanto o PageShell tinha a prop e ninguem passava: a banda do titulo
          ficava vazia e a pagina nao se explicava — "/rpg" anunciava "RPG/RPM"
          sem dizer em momento nenhum o que a sigla significa. */}
      <PageShell
        titulo={titulo}
        subtitulo={descricao}
        trilha={[{ nome: titulo }]}
        glifo={ilustracao.glifo}
      >
        {/* /contato tinha 34 palavras raspadas — dessas, 16 eram o aviso de
            reCAPTCHA em ingles de um formulario que nao existe mais. A secao de
            contato ja pronta traz endereco, mapa, telefones, e-mail e horario,
            que e' o que alguem procura nesse endereco. */}
        {pagina.slug === "contato" ? (
          <Contact numero={null} comoSecao={false} />
        ) : (
          <>
            <Conteudo html={pagina.html} />
            {ilustracao.foto && <FotoDaPagina foto={ilustracao.foto} />}
          </>
        )}
        <ConviteConsulta />
      </PageShell>
    </>
  );
}
