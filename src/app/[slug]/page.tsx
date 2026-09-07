import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Contact } from "@/components/contact";
import { ConviteConsulta } from "@/components/convite-consulta";
import { PaginaMedicaJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell, type TipoDePagina } from "@/components/page-shell";
import { PlaceholderFoto } from "@/components/placeholder-foto";
import { PaginasRelacionadas } from "@/components/relacionados";
import { SecoesDeConteudo } from "@/components/secoes-de-conteudo";
import { fotosDeApoio, ilustracaoDaPagina, type Foto } from "@/lib/ilustracao-da-pagina";
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

/**
 * Tipo de pagina, pelo grupo do menu: o grupo "A Clinica" e' institucional,
 * os outros tres sao tratamento. E' a mesma divisao que nav.ts ja faz.
 */
const INSTITUCIONAIS = new Set(
  ["quem-somos", "responsável-técnica", "currículo-profissional", "contato"].map(
    (s) => s.normalize("NFC"),
  ),
);

function tipoDaPagina(slug: string): TipoDePagina {
  return INSTITUCIONAIS.has(slug.normalize("NFC")) ? "institucional" : "tratamento";
}

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

/**
 * A fotografia da pagina em moldura, na coluna direita do hero. Todas as
 * fotos da clinica sao retrato (4:5); width/height sao as medidas reais do
 * arquivo, para o navegador reservar o espaco e o CLS continuar em zero. A
 * legenda em mono e' a mesma da tabela em ilustracao-da-pagina.ts.
 */
function FotoEmMoldura({ foto }: { foto: Foto }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-plate">
      <Image
        src={foto.src}
        alt={foto.alt}
        width={foto.largura}
        height={foto.altura}
        priority
        sizes="(min-width: 1024px) 380px, 360px"
        className="aspect-[4/5] w-full rounded-md object-cover saturate-[0.9]"
      />
      <figcaption
        className="flex items-center gap-3 px-1 pt-3 pb-1 text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-muted"
        style={{ fontFamily: "var(--mono)" }}
      >
        <span aria-hidden="true" className="h-px w-6 shrink-0 bg-rule" />
        {foto.legenda}
      </figcaption>
    </figure>
  );
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
  const tipo = tipoDaPagina(pagina.slug);
  const eContato = pagina.slug === "contato";

  const midia = ilustracao.foto ? (
    <FotoEmMoldura foto={ilustracao.foto} />
  ) : ilustracao.placeholder ? (
    <PlaceholderFoto rotulo={ilustracao.placeholder} />
  ) : undefined;

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
        tipo={tipo}
        titulo={titulo}
        subtitulo={descricao}
        trilha={[{ nome: titulo }]}
        glifo={ilustracao.glifo}
        midia={eContato ? undefined : midia}
      >
        {/* /contato tinha 34 palavras raspadas — dessas, 16 eram o aviso de
            reCAPTCHA em ingles de um formulario que nao existe mais. A secao de
            contato ja pronta traz endereco, mapa, telefones, e-mail e horario,
            que e' o que alguem procura nesse endereco. */}
        {eContato ? (
          <Contact numero={null} comoSecao={false} />
        ) : (
          <SecoesDeConteudo
            html={pagina.html}
            tipo={tipo}
            apoio={fotosDeApoio(pagina.slug)}
          />
        )}
        <PaginasRelacionadas slug={pagina.slug} />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}
