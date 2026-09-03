import Image from "next/image";
import Link from "next/link";
import { BLOG_INDEX, CATEGORIES, POSTS } from "@/lib/posts";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

export function Journal() {
  return (
    <section
      id="conteudos"
      className="relative overflow-hidden border-b border-rule"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal variante="cortina">
          <SectionMark n="09" />
          <h2 className="mt-9 max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
            Conteúdos Para Compreender Melhor O Seu Corpo
          </h2>
        </Reveal>

        <div className="mt-14 lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-8">
            <ul>
              {POSTS.map((post, i) => (
                <li key={post.href}>
                  <Reveal delay={(i % 5) * 80}>
                    <article className="group flex gap-6 rounded-md border-t border-rule px-3 py-8 transition-[background-color,border-color] duration-[260ms] hover:border-accent/40 hover:bg-surface/60 sm:gap-8">
                      <a
                        href={post.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <Image
                          src={post.cover}
                          alt=""
                          width={1024}
                          height={1024}
                          sizes="160px"
                          className="h-24 w-24 rounded-md border border-rule object-cover saturate-[0.88] transition-[filter,transform] duration-[420ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-[1.04] group-hover:saturate-100 sm:h-32 sm:w-32"
                        />
                      </a>

                      <div className="min-w-0">
                        <p
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] tracking-[0.14em] text-muted uppercase"
                          style={{ fontFamily: "var(--mono)" }}
                        >
                          <span>{post.date}</span>
                          {post.category && (
                            <>
                              <span aria-hidden="true" className="text-muted">
                                /
                              </span>
                              <span className="text-accent">
                                {post.category}
                              </span>
                            </>
                          )}
                        </p>

                        <h3 className="mt-3 font-display text-[1.25rem] leading-[1.3] font-medium text-balance text-ink-strong">
                          <a
                            href={post.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors duration-200 group-hover:text-accent"
                          >
                            {post.title}
                          </a>
                        </h3>

                        {post.excerpt && (
                          <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-muted">
                            {post.excerpt}
                          </p>
                        )}

                        <a
                          href={post.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sublinha mt-4 inline-flex items-baseline gap-2.5 text-[0.875rem] text-accent transition-colors duration-[160ms] hover:text-accent-deep"
                        >
                          Continuar lendo
                          <svg
                            width="13"
                            height="9"
                            viewBox="0 0 13 9"
                            aria-hidden="true"
                            className="transition-transform duration-200 group-hover:translate-x-1"
                          >
                            <path
                              d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                          </svg>
                        </a>
                      </div>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            <Reveal delay={120}>
              <div className="border-t border-rule pt-10 text-center">
                {/* Sem backend nao ha pagina 2, e o builder de origem pagina
                    por JS, sem URL. O destino honesto e a listagem viva, o
                    mesmo do "Todos os artigos" da barra lateral. */}
                <a
                  href={BLOG_INDEX}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/mais inline-flex items-center gap-2.5 rounded-md border-[1.5px] border-accent/35 px-6 py-3 text-[0.9375rem] text-accent shadow-tag transition-[transform,box-shadow,background-color,color,border-color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-paper hover:shadow-lift active:translate-y-0"
                >
                  <span aria-hidden="true" className="text-[1.125rem]">
                    +
                  </span>
                  Ver mais
                </a>
              </div>
            </Reveal>
          </div>

          <aside className="mt-16 lg:col-span-3 lg:col-start-10 lg:mt-0">
            <Reveal delay={200}>
              <div className="border-t border-rule pt-8">
                {/* Rotulo da lista, nao subsecao do artigo: como h3 ele
                    entrava no sumario de headings ao lado dos titulos dos
                    posts, com o mesmo peso. Vira paragrafo e nomeia a lista
                    pelo aria-labelledby — o desenho nao muda. */}
                <p
                  id="journal-categorias"
                  className="text-[0.6875rem] tracking-[0.18em] text-muted uppercase"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  Categorias
                </p>
                <ul
                  aria-labelledby="journal-categorias"
                  className="mt-6 space-y-3.5"
                >
                  {CATEGORIES.map((category) => (
                    <li key={category.href}>
                      <Link
                        href={category.href}
                        className="group flex items-baseline gap-3 text-[0.9375rem] leading-[1.45] text-ink transition-colors duration-200 hover:text-accent"
                      >
                        <span
                          aria-hidden="true"
                          className="h-px w-3 shrink-0 translate-y-[-0.3em] bg-rule transition-all duration-200 group-hover:w-5 group-hover:bg-accent"
                        />
                        {category.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </section>
  );
}
