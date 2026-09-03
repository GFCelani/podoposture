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

/**
 * 12 por pagina. Com os 68 de uma vez, o indice tinha 31.011px de altura num
 * celular de 390 — 37 telas de rolagem para encontrar um artigo. A pagina 1
 * continua em /nosso-blog, exatamente a URL que o Google ja conhece; as
 * seguintes usam ?p=N, que sao enderecos novos e nao mexem no que ja ranqueia.
 * Nenhum post fica inalcancavel: os 68 seguem no sitemap, um a um.
 */
const POR_PAGINA = 12;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; p?: string }>;
}): Promise<Metadata> {
  const { p } = await searchParams;
  const pagina = Math.max(1, Number(p) || 1);
  const titulo = pagina > 1 ? `${TITULO} — página ${pagina}` : TITULO;
  const url = pagina > 1 ? `${BLOG_INDEX}?p=${pagina}` : BLOG_INDEX;

  return {
    title: titulo,
    description: DESCRICAO,
    alternates: { canonical: url },
    // paginas 2+ nao precisam entrar no indice: os artigos ja estao no sitemap
    // um a um, e o que interessa indexar e o artigo, nao a vitrine
    robots: pagina > 1 ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: titulo,
      description: DESCRICAO,
      url,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: titulo }],
    },
  };
}

export default async function IndiceDoBlog({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; p?: string }>;
}) {
  const { categoria, p } = await searchParams;
  // os links de tema no rodape da home apontam para ?categoria=X; sem este
  // filtro eles levavam ao indice completo, prometendo um recorte que nao existia
  const filtrados = categoria
    ? TODOS_OS_POSTS.filter((p) => p.category === categoria)
    : TODOS_OS_POSTS;
  // o destaque so existe na primeira pagina: nas seguintes ele repetiria o
  // mesmo artigo no topo de toda vitrine
  const [primeiro, ...demais] = filtrados;
  const totalPaginas = Math.max(1, Math.ceil(demais.length / POR_PAGINA));
  const paginaAtual = Math.min(Math.max(1, Number(p) || 1), totalPaginas);
  const destaque = paginaAtual === 1 ? primeiro : undefined;
  const restante = demais.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA,
  );
  const enderecoDaPagina = (n: number) => {
    const q = new URLSearchParams();
    if (categoria) q.set("categoria", categoria);
    if (n > 1) q.set("p", String(n));
    const s = q.toString();
    return s ? `${BLOG_INDEX}?${s}` : BLOG_INDEX;
  };

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
        <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-20 lg:py-24">
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

          <div className="mt-16 md:grid md:grid-cols-6 md:gap-x-8 lg:grid-cols-12 lg:gap-x-12">
            <div className="md:col-span-4 lg:col-span-8">
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

              {totalPaginas > 1 && (
                <nav
                  aria-label="Paginação dos artigos"
                  className="mt-16 flex items-center justify-between gap-4 border-t border-rule pt-8"
                >
                  {paginaAtual > 1 ? (
                    <Link
                      href={enderecoDaPagina(paginaAtual - 1)}
                      rel="prev"
                      className="sublinha inline-flex min-h-[44px] items-center text-[0.9375rem] text-accent hover:text-accent-deep"
                    >
                      ← Anteriores
                    </Link>
                  ) : (
                    <span />
                  )}

                  <p className="font-mono text-[0.75rem] tracking-[0.14em] text-muted uppercase">
                    Página {paginaAtual} de {totalPaginas}
                  </p>

                  {paginaAtual < totalPaginas ? (
                    <Link
                      href={enderecoDaPagina(paginaAtual + 1)}
                      rel="next"
                      className="sublinha inline-flex min-h-[44px] items-center text-[0.9375rem] text-accent hover:text-accent-deep"
                    >
                      Próximos →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </div>

            {CATEGORIES.length > 0 && (
              <aside className="mt-20 md:col-span-2 md:mt-0 lg:col-span-4">
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
                          className="flex min-h-[36px] items-baseline justify-between gap-4 py-1 text-[0.9375rem] text-ink hover:text-accent aria-[current=page]:text-accent"
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
