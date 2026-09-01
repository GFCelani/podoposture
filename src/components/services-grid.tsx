import { SERVICES } from "@/lib/services";
import { ButtonLink } from "./button-link";
import { ColumnRules, GridPaper, SectionMark } from "./layers";
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
      className="relative overflow-hidden border-b border-rule"
    >
      <GridPaper size={56} fade="right" />
      <ColumnRules />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <Reveal>
          <SectionMark n="07" />
        </Reveal>

        <ul className="mt-12 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <li key={service.href} className="flex">
              <Reveal delay={(i % 3) * 90} className="flex w-full">
                <article className="group flex w-full flex-col rounded-md border-t border-rule px-4 pt-6 pb-10 transition-[border-color,background-color,transform] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-0.5 hover:border-accent hover:bg-surface/70">
                  <span
                    aria-hidden="true"
                    className="flex items-center gap-3 text-[0.6875rem] tracking-[0.18em] text-muted transition-colors duration-200 group-hover:text-accent"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                    <span className="h-px w-0 bg-accent transition-all duration-[240ms] ease-out group-hover:w-8" />
                  </span>

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
