import { SERVICES } from "@/lib/services";
import { ButtonLink } from "./button-link";
import { Reveal } from "./reveal";

/**
 * A secao mais densa da pagina: 12 celulas em 3 colunas, separadas por regua
 * horizontal. No hover a regua da celula passa de --rule para --accent e a
 * seta do link desliza. Nivel terciario de botao, o unico dos tres que nao
 * desenha caixa.
 */
export function ServicesGrid() {
  return (
    <section id="servicos" className="border-b border-rule">
      <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <li key={service.href} className="flex">
              <Reveal delay={(i % 3) * 90} className="flex w-full">
                <article className="group flex w-full flex-col border-t border-rule pt-6 pb-10 transition-colors duration-200 hover:border-accent">
                  <span
                    aria-hidden="true"
                    className="block text-[0.6875rem] tracking-[0.18em] text-muted transition-colors duration-200 group-hover:text-accent"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <h3 className="mt-4 text-[0.9375rem] leading-[1.45] font-semibold tracking-[0.07em] text-ink">
                    {service.title}
                  </h3>

                  <div className="mt-5 space-y-3.5">
                    {service.body.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[0.9375rem] leading-[1.7] text-muted"
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
