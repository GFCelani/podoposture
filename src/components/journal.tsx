import Image from "next/image";
import { CATEGORIES, POSTS } from "@/lib/posts";
import { Reveal } from "./reveal";

export function Journal() {
  return (
    <section id="conteudos" className="border-b border-rule">
      <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
        <Reveal>
          <h2 className="max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-normal text-balance text-ink">
            Conteúdos Para Compreender Melhor O Seu Corpo
          </h2>
        </Reveal>

        <div className="mt-14 lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-8">
            <ul>
              {POSTS.map((post, i) => (
                <li key={post.href}>
                  <Reveal delay={Math.min(i, 4) * 80}>
                    <article className="group flex gap-6 border-t border-rule py-8 sm:gap-8">
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
                          className="h-24 w-24 border border-rule object-cover saturate-[0.9] transition-[filter] duration-[240ms] group-hover:saturate-100 sm:h-32 sm:w-32"
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
                              <span aria-hidden="true" className="text-rule">
                                /
                              </span>
                              <span className="text-accent">
                                {post.category}
                              </span>
                            </>
                          )}
                        </p>

                        <h3 className="mt-3 font-display text-[1.25rem] leading-[1.3] text-balance text-ink">
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

                        <p className="mt-4 inline-flex items-baseline gap-2.5 text-[0.875rem] text-accent">
                          Continue Reading
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
                        </p>
                      </div>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            <Reveal delay={120}>
              <div className="border-t border-rule pt-10 text-center">
                {/* Ancora morta: sem backend nao ha pagina 2, e paginar sobre
                    um array de 10 fingindo profundidade seria inventar dado. */}
                <button
                  type="button"
                  className="inline-flex items-center gap-2.5 text-[0.9375rem] text-accent"
                >
                  <span aria-hidden="true" className="text-[1.125rem]">
                    +
                  </span>
                  Show More
                </button>
              </div>
            </Reveal>
          </div>

          <aside className="mt-16 lg:col-span-3 lg:col-start-10 lg:mt-0">
            <Reveal delay={200}>
              <div className="border-t border-rule pt-8">
                <h3 className="text-[0.6875rem] tracking-[0.18em] text-muted uppercase" style={{ fontFamily: "var(--mono)" }}>
                  Categories
                </h3>
                <ul className="mt-6 space-y-3.5">
                  {CATEGORIES.map((category) => (
                    <li key={category.href}>
                      <a
                        href={category.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline gap-3 text-[0.9375rem] leading-[1.45] text-ink transition-colors duration-200 hover:text-accent"
                      >
                        <span
                          aria-hidden="true"
                          className="h-px w-3 shrink-0 translate-y-[-0.3em] bg-rule transition-all duration-200 group-hover:w-5 group-hover:bg-accent"
                        />
                        {category.label}
                      </a>
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
