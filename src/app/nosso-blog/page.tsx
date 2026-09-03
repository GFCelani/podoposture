import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { TrilhaJsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { BLOG_INDEX, CATEGORIES, TODOS_OS_POSTS } from "@/lib/posts";

/**
 * Indice do blog.
 *
 * No GoDaddy esta pagina era renderizada por JavaScript — o HTML servido trazia
 * so um spinner, e por isso ela nao tinha uma palavra indexavel. Aqui ela e
 * estatica: os 68 posts sao renderizados no HTML.
 */

const TITULO = "Nosso Blog";
const DESCRICAO =
  "Conteúdos sobre dor crônica, postura, zumbido, DTM e tratamento osteopático, " +
  "escritos pela equipe da Podoposture.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: BLOG_INDEX },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Podoposture",
    title: TITULO,
    description: DESCRICAO,
    url: BLOG_INDEX,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: TITULO }],
  },
};

export default async function IndiceDoBlog({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  // os links de tema no rodape da home apontam para ?categoria=X; sem este
  // filtro eles levavam ao indice completo, prometendo um recorte que nao existia
  const filtrados = categoria
    ? TODOS_OS_POSTS.filter((p) => p.category === categoria)
    : TODOS_OS_POSTS;
  const [destaque, ...restante] = filtrados;

  return (
    <>
      <TrilhaJsonLd itens={[{ nome: TITULO, caminho: BLOG_INDEX }]} />

      <PageShell
        titulo={categoria ?? "Conteúdos para compreender melhor o seu corpo"}
        subtitulo={
          categoria
            ? `${filtrados.length} ${filtrados.length === 1 ? "artigo" : "artigos"} neste tema.`
            : DESCRICAO
        }
        trilha={
          categoria
            ? [{ nome: TITULO, href: BLOG_INDEX }, { nome: categoria }]
            : [{ nome: TITULO }]
        }
      >
        <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
          {destaque && (
            <article className="group border-b border-rule pb-16">
              <Link
                href={destaque.href}
                className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-10"
              >
                <div className="lg:col-span-7">
                  <Image
                    src={destaque.cover}
                    alt=""
                    width={1200}
                    height={750}
                    priority
                    sizes="(min-width: 1024px) 700px, 100vw"
                    className="aspect-[16/10] w-full rounded-md border border-rule object-cover saturate-[0.9]"
                  />
                </div>
                <div className="mt-8 lg:col-span-5 lg:mt-0">
                  <p className="flex items-center gap-4 font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
                    <time dateTime={destaque.dateISO}>{destaque.date}</time>
                    {destaque.category && (
                      <>
                        <span aria-hidden="true" className="h-px w-8 bg-rule" />
                        <span>{destaque.category}</span>
                      </>
                    )}
                  </p>
                  <h2 className="mt-5 font-display text-[clamp(1.625rem,2.8vw,2.25rem)] leading-[1.18] font-semibold tracking-[-0.018em] text-balance text-ink-strong group-hover:text-accent">
                    {destaque.title}
                  </h2>
                  {destaque.excerpt && (
                    <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-[1.7] text-muted">
                      {destaque.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </article>
          )}

          {categoria && (
            <p className="mt-10 text-[0.9375rem]">
              <Link href={BLOG_INDEX} className="text-accent underline underline-offset-4">
                Ver todos os artigos
              </Link>
            </p>
          )}

          <div className="mt-16 lg:grid lg:grid-cols-12 lg:gap-x-12">
            <div className="lg:col-span-8">
              <h2 className="sr-only">Todos os artigos</h2>
              <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2">
                {restante.map((post) => (
                  <li key={post.slug}>
                    <article className="group">
                      <Link href={post.href} className="block">
                        <Image
                          src={post.cover}
                          alt=""
                          width={640}
                          height={400}
                          sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
                          className="aspect-[16/10] w-full rounded-md border border-rule object-cover saturate-[0.9]"
                        />
                        <p className="mt-5 font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
                          <time dateTime={post.dateISO}>{post.date}</time>
                        </p>
                        <h3 className="mt-3 font-display text-[1.1875rem] leading-[1.32] font-semibold text-balance text-ink-strong group-hover:text-accent">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-[1.65] text-muted">
                            {post.excerpt}
                          </p>
                        )}
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            </div>

            {CATEGORIES.length > 0 && (
              <aside className="mt-20 lg:col-span-4 lg:mt-0">
                <div className="lg:sticky lg:top-28">
                  <h2 className="font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
                    Temas
                  </h2>
                  <ul className="mt-6 space-y-3 border-t border-rule pt-6">
                    {CATEGORIES.map((tema) => (
                      <li key={tema.label}>
                        <Link
                          href={tema.href}
                          aria-current={tema.label === categoria ? "page" : undefined}
                          className="flex items-baseline justify-between gap-4 text-[0.9375rem] text-ink hover:text-accent aria-[current=page]:text-accent"
                        >
                          <span>{tema.label}</span>
                          <span className="font-mono text-[0.75rem] text-muted">
                            {tema.total}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            )}
          </div>
        </div>
      </PageShell>
    </>
  );
}
