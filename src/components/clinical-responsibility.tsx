import Link from "next/link";
import { ButtonLink } from "./button-link";
import { MARCAS_CLINICAS, Regua30 } from "./illustrations";
import { ColumnRules, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * As tres competencias da credencial (Osteopata, Posturologa, Acupunturista)
 * desenhadas como tres marcas proprias, e os 30 anos da copy como regua de
 * 30 tracos com o cursor percorrendo. Sem caixa em volta de texto.
 */
export function ClinicalResponsibility() {
  return (
    <section
      id="responsabilidade-clinica"
      className="relative overflow-hidden border-b border-rule bg-surface"
    >
      <ColumnRules />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-6">
            <Reveal variante="cortina">
              <SectionMark n="03" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
                Cuidado com{" "}
                <mark className="marca-grifo marca-grifo-claro">
                  Responsabilidade
                </mark>{" "}
                Clínica
              </h2>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-9 max-w-[56ch] text-[1.125rem] leading-[1.75] text-ink">
                Os atendimentos são realizados pela{" "}
                <Link
                  href="/responsável-técnica"
                  className="font-display text-[1.25rem] font-medium text-accent underline decoration-rule underline-offset-[6px] transition-colors duration-[160ms] hover:decoration-accent"
                >
                  Dra. Claudia Meirelles
                </Link>
                , Osteopata, Posturóloga e Acupunturista com 30 anos de
                experiência clínica, com atuação em dor crônica, postura e
                regulação do sistema nervoso.
              </p>
            </Reveal>

            <Reveal delay={190}>
              <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-[1.7] text-ink">
                O acompanhamento é individual, com decisões clínicas ajustadas
                ao longo do processo, conforme a resposta de cada corpo
              </p>
            </Reveal>

            <Reveal delay={270}>
              <div className="mt-10">
                <ButtonLink
                  href="/nosso-blog#317e3e15-aeff-4937-84dc-dee4b53f6797"
                  variant="secondary"
                >
                  Acesse o nosso Blog
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          {/* As tres competencias desenhadas, e a regua dos 30 anos */}
          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <div className="grid grid-cols-3 gap-x-4">
              {MARCAS_CLINICAS.map(({ chave, Marca }, i) => (
                <Reveal key={chave} delay={160 + i * 110}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-24 w-24 text-accent lg:h-28 lg:w-28">
                      <Marca />
                    </div>
                    <span
                      aria-hidden="true"
                      className="h-px w-10 bg-rule"
                    />
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={480}>
              <div className="mt-10">
                <Regua30 className="w-full" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
