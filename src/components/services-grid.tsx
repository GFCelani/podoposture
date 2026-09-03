import { SERVICES } from "@/lib/services";
import { GLYPHS } from "./service-glyphs";
import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * A secao mais densa da pagina: 12 celulas em 3 colunas, separadas por regua
 * horizontal. No hover a regua da celula passa de --rule para --accent e a
 * seta do link desliza. Nivel terciario de botao, o unico dos tres que nao
 * desenha caixa. A numeracao 01..12 e' de item; a da secao vem em cima, com
 * a regua do SectionMark, para os dois niveis nao se confundirem.
 */
export function ServicesGrid() {
  return (
    <section
      id="servicos"
      aria-labelledby="servicos-titulo"
      className="relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/70 via-transparent to-surface/70"
      />
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <Reveal>
          <SectionMark n="07" />
        </Reveal>

        {/* O "07" e' um numeral, nao um nome: sem um h2 a secao entrava no
            sumario do leitor de tela como doze h3 soltos, sem dizer do que
            eram. Fica invisivel porque esta banda e a de tratamentos formam
            um par de grades sem titulo aparente — o rotulo e' para quem nao
            ve o desenho. */}
        <h2 id="servicos-titulo" className="sr-only">
          Serviços
        </h2>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <li key={service.href} className="flex">
              <Reveal delay={(i % 3) * 90} className="flex w-full">
                <article className="group flex w-full flex-col rounded-lg border border-rule bg-paper p-6 shadow-tag transition-[border-color,box-shadow,transform] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-1 hover:border-accent/50 hover:shadow-lift lg:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      aria-hidden="true"
                      className="flex items-center gap-3 text-[0.6875rem] tracking-[0.18em] text-muted transition-colors duration-200 group-hover:text-accent"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                      <span className="h-px w-0 bg-accent transition-all duration-[240ms] ease-out group-hover:w-8" />
                    </span>
                    {/* o servico desenhado, nao icone de biblioteca */}
                    <span
                      aria-hidden="true"
                      className="-mt-1 block h-14 w-14 shrink-0 text-accent transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:-translate-y-0.5 group-hover:scale-[1.06]"
                    >
                      {GLYPHS[service.href]?.({})}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[0.9375rem] leading-[1.45] font-semibold tracking-[0.07em] text-ink">
                    {service.title}
                  </h3>

                  <div className="mt-5 space-y-3.5">
                    {service.body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[0.9375rem] leading-[1.7] text-ink"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="mt-auto pt-7">
                    <ButtonLink href={service.href} variant="tertiary">
                      {service.cta}
                    </ButtonLink>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
