import Link from "next/link";
import { ButtonLink } from "./button-link";
import { ColumnRules, SectionMark } from "./layers";
import { Reveal } from "./reveal";

export function ClinicalResponsibility() {
  return (
    <section
      id="responsabilidade-clinica"
      className="relative overflow-hidden border-b border-rule bg-surface"
    >
      <ColumnRules />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-4">
            <Reveal variante="cortina">
              <SectionMark n="03" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink">
                Cuidado com{" "}
                <mark className="marca-grifo marca-grifo-claro">
                  Responsabilidade
                </mark>{" "}
                Clínica
              </h2>
            </Reveal>
          </div>

          <div className="mt-10 lg:col-span-7 lg:col-start-6 lg:mt-0">
            <Reveal delay={110}>
              <p className="max-w-[62ch] text-[1.125rem] leading-[1.7] text-ink">
                Os atendimentos são realizados pela{" "}
                <Link
                  href="/responsável-técnica"
                  className="text-accent underline decoration-rule underline-offset-[6px] transition-colors duration-200 hover:decoration-accent"
                >
                  Dra. Claudia Meirelles
                </Link>
                , Osteopata, Posturóloga e Acupunturista com 30 anos de
                experiência clínica, com atuação em dor crônica, postura e
                regulação do sistema nervoso.
              </p>
            </Reveal>

            <Reveal delay={190}>
              <p className="mt-6 max-w-[62ch] text-[1.125rem] leading-[1.7] text-ink">
                O acompanhamento é individual, com decisões clínicas ajustadas
                ao longo do processo, conforme a resposta de cada corpo
              </p>
            </Reveal>

            <Reveal delay={270}>
              <div
                aria-hidden="true"
                className="mt-11 h-px w-full max-w-[62ch] bg-rule"
              />
              <div className="mt-9">
                <ButtonLink
                  href="/nosso-blog#317e3e15-aeff-4937-84dc-dee4b53f6797"
                  variant="secondary"
                >
                  Acesse o nosso Blog
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
