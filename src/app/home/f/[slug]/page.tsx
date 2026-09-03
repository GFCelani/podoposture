import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtigoJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { HtmlDoPost } from "@/components/prose";
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
        titulo={post.titulo}
        subtitulo={post.resumo}
        trilha={[
          { nome: "Nosso Blog", href: BLOG_INDEX },
          { nome: post.titulo },
        ]}
      >
        <div className="mx-auto max-w-[1240px] px-6 pt-10 lg:px-10">
          <p className="mx-auto flex max-w-[68ch] items-center gap-4 font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
            <time dateTime={post.dataISO}>{post.dataRotulo}</time>
            {post.categorias[0] && (
              <>
                <span aria-hidden="true" className="h-px w-8 bg-rule" />
                <span>{post.categorias[0]}</span>
              </>
            )}
          </p>
        </div>

        <HtmlDoPost html={post.html} />

        {relacionados.length > 0 && (
          <section
            aria-labelledby="leia-tambem"
            className="border-t border-rule bg-surface"
          >
            <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10">
              <h2
                id="leia-tambem"
                className="font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.2] font-semibold tracking-[-0.018em] text-ink-strong"
              >
                Leia também
              </h2>

              <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {relacionados.map((outro) => (
                  <li key={outro.slug}>
                    <article className="group">
                      <Link href={outro.href} className="block">
                        <Image
                          src={outro.cover}
                          alt=""
                          width={640}
                          height={400}
                          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                          className="aspect-[16/10] w-full rounded-md border border-rule object-cover saturate-[0.9]"
                        />
                        <time
                          dateTime={outro.dateISO}
                          className="mt-5 block font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
                        >
                          {outro.date}
                        </time>
                        <h3 className="mt-3 font-display text-[1.125rem] leading-[1.35] font-semibold text-ink-strong group-hover:text-accent">
                          {outro.title}
                        </h3>
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </PageShell>
    </>
  );
}
