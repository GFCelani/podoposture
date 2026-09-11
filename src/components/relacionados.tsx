import Image from "next/image";
import Link from "next/link";

import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";
import { GLYPHS } from "./service-glyphs";
import { NAV_GROUPS } from "@/lib/nav";
import type { Post } from "@/lib/posts";

/**
 * Fecho de navegacao das paginas internas.
 *
 * Paginas de conteudo apontam para as vizinhas do mesmo grupo do menu (os
 * grupos e os rotulos sao os do site em producao, em nav.ts; nada e' escrito
 * aqui). O grupo da o titulo da secao; as tres seguintes na ordem do menu,
 * em roda, sao os cartoes. "Avaliacao" tem duas paginas, entao mostra uma.
 *
 * Posts apontam para outros posts, pela categoria: e' a lista "Leia tambem"
 * que ja existia, agora com a entrada por scroll e o numeral das demais
 * secoes do site.
 */
export function PaginasRelacionadas({ slug }: { slug: string }) {
  const href = `/${slug}`.normalize("NFC");
  const grupo = NAV_GROUPS.find((g) =>
    g.items.some((i) => i.href.normalize("NFC") === href),
  );
  if (!grupo) return null;

  const itens = grupo.items;
  const eu = itens.findIndex((i) => i.href.normalize("NFC") === href);
  const vizinhas = [1, 2, 3]
    .map((k) => itens[(eu + k) % itens.length])
    .filter((i, idx, arr) => i.href !== href && arr.indexOf(i) === idx);

  if (vizinhas.length === 0) return null;

  return (
    <section
      aria-labelledby="relacionadas-titulo"
      className="relative overflow-hidden border-t border-rule"
    >
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
        <Reveal variante="cortina">
          <p className="flex items-center gap-4">
            <span aria-hidden="true" className="h-px w-14 bg-accent/30" />
            <span
              className="text-[0.6875rem] tracking-[0.2em] text-muted uppercase"
              style={{ fontFamily: "var(--mono)" }}
            >
              {String(vizinhas.length).padStart(2, "0")}
            </span>
          </p>
          <h2
            id="relacionadas-titulo"
            className="mt-6 font-display text-[clamp(1.5rem,1.15rem+1.75vw,2.25rem)] leading-[1.16] font-semibold tracking-[-0.018em] text-ink-strong"
          >
            {grupo.label}
          </h2>
        </Reveal>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {vizinhas.map((item, i) => {
            const Glifo = GLYPHS[item.href];
            return (
              <li key={item.href} className="flex">
                <Reveal delay={90 + i * 90} className="flex w-full">
                  <Link
                    href={item.href}
                    className="group flex w-full flex-col rounded-lg border border-rule bg-paper p-6 shadow-tag transition-[transform,box-shadow,border-color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-1 hover:border-accent/40 hover:shadow-plate lg:p-7"
                  >
                    {Glifo ? (
                      <span
                        aria-hidden="true"
                        className="block h-10 w-10 text-accent"
                      >
                        {Glifo({ className: "h-full w-full" })}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="block h-10 w-10 rounded-full border-[1.5px] border-accent/40"
                      />
                    )}
                    <h3 className="mt-6 [overflow-wrap:anywhere] font-display text-[1.25rem] leading-[1.3] font-medium text-ink-strong group-hover:text-accent">
                      {item.label}
                    </h3>
                    <span className="sublinha mt-auto inline-flex items-center gap-2.5 self-start pt-6 text-[0.9375rem] text-accent">
                      Saiba Mais
                      <svg
                        width="13"
                        height="9"
                        viewBox="0 0 13 9"
                        aria-hidden="true"
                        className="transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:translate-x-1"
                      >
                        <path
                          d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </span>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function PostsRelacionados({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section
      aria-labelledby="leia-tambem"
      className="relative overflow-hidden border-t border-rule bg-surface"
    >
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
        <Reveal variante="cortina">
          <SectionMark n={String(posts.length).padStart(2, "0")} />
          <h2
            id="leia-tambem"
            className="mt-8 font-display text-[clamp(1.5rem,1.15rem+1.75vw,2.25rem)] leading-[1.16] font-semibold tracking-[-0.018em] text-ink-strong"
          >
            Leia também
          </h2>
        </Reveal>

        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((outro, i) => (
            <li key={outro.slug}>
              <Reveal delay={90 + i * 90}>
                <article className="group">
                  <Link href={outro.href} className="block">
                    <div className="overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-tag transition-[transform,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:-translate-y-1 group-hover:shadow-plate">
                      <Image
                        src={outro.cover}
                        alt=""
                        width={640}
                        height={400}
                        sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                        className="aspect-[16/10] w-full rounded-md object-cover saturate-[0.9] transition-[filter,transform] duration-[520ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-[1.03] group-hover:saturate-100"
                      />
                    </div>
                    <time
                      dateTime={outro.dateISO}
                      className="mt-5 block text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {outro.date}
                    </time>
                    <h3 className="mt-3 [overflow-wrap:anywhere] font-display text-[1.125rem] leading-[1.35] font-semibold text-ink-strong group-hover:text-accent">
                      {outro.title}
                    </h3>
                  </Link>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
