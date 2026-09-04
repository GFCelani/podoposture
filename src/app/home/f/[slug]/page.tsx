import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConviteConsulta } from "@/components/convite-consulta";
import { ArtigoJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { PostsRelacionados } from "@/components/relacionados";
import { SecoesDeConteudo } from "@/components/secoes-de-conteudo";
import {
  BLOG_INDEX,
  SLUGS_DE_POST_A_GERAR,
  buscarPost,
  hrefDoPost,
  postsRelacionados,
} from "@/lib/posts";

/**
 * Os 68 posts do blog.
 *
 * A URL continua sendo /home/f/<slug> — a mesma do GoDaddy. E feia, mas e a que
 * o Google ja ranqueia: mante-la significa migrar de plataforma sem um unico
 * redirect e sem janela de reprocessamento. Trocar por /blog/<slug> seria
 * cosmetico e custaria 68 redirects mais o risco de erro de mapeamento em cada
 * um. Se um dia valer a pena, e uma mudanca isolada e reversivel.
 */

export function generateStaticParams() {
  return SLUGS_DE_POST_A_GERAR.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = buscarPost(slug);
  if (!post) return {};

  const caminho = hrefDoPost(post.slug);

  return {
    title: post.titulo,
    description: post.resumo,
    alternates: { canonical: caminho },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: post.titulo,
      description: post.resumo,
      url: caminho,
      publishedTime: post.dataISO,
      images: [{ url: post.capa || "/og.png", alt: post.titulo }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.titulo,
      description: post.resumo,
      images: [post.capa || "/og.png"],
    },
  };
}

export default async function PostDoBlog({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = buscarPost(slug);
  if (!post) notFound();

  const caminho = hrefDoPost(post.slug);
  const relacionados = postsRelacionados(post.slug, 3);

  return (
    <>
      <TrilhaJsonLd
        itens={[
          { nome: "Nosso Blog", caminho: BLOG_INDEX },
          { nome: post.titulo, caminho },
        ]}
      />
      <ArtigoJsonLd
        titulo={post.titulo}
        descricao={post.resumo}
        caminho={caminho}
        dataISO={post.dataISO}
        imagem={post.capa || undefined}
      />

      <PageShell
        tipo="post"
        titulo={post.titulo}
        subtitulo={post.resumo}
        trilha={[
          { nome: "Nosso Blog", href: BLOG_INDEX },
          { nome: post.titulo },
        ]}
        meta={
          <p
            className="mb-6 flex items-center gap-4 text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
            style={{ fontFamily: "var(--mono)" }}
          >
            <time dateTime={post.dataISO}>{post.dataRotulo}</time>
            {post.categorias[0] && (
              <>
                <span aria-hidden="true" className="h-px w-8 bg-rule" />
                <span>{post.categorias[0]}</span>
              </>
            )}
          </p>
        }
        /* A capa e' a imagem do post. O alt vazio e' deliberado: sao pecas
           graficas com o titulo do post embutido, e o titulo ja esta no h1
           logo acima; repeti-lo no alt leria duas vezes no leitor de tela. */
        capa={post.capa ? { src: post.capa, alt: "" } : undefined}
      >
        <SecoesDeConteudo html={post.html} />
        <PostsRelacionados posts={relacionados} />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}
