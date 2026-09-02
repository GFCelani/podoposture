import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "./button-link";
import { MARCAS_CLINICAS, Regua30 } from "./illustrations";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * A credencial com a pratica real ao lado: avaliacao postural na clinica.
 * As tres marcas de competencia viram faixa secundaria sob a foto, com a
 * regua dos 30 anos fechando a coluna. Sem caixa em volta de texto.
 */
export function ClinicalResponsibility() {
  return (
    <section
      id="responsabilidade-clinica"
      className="corte-alto-esq relative overflow-hidden border-b border-rule bg-surface"
    >
      <PageGrid />

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

          {/* A pratica real, com as competencias como faixa secundaria */}
          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <Reveal delay={140}>
              <figure className="rounded-lg border border-rule bg-paper p-3 shadow-plate">
                <Image
                  src="/img/galeria/avaliacao-postural.jpg"
                  alt="Paciente em avaliação postural sobre a plataforma, de perfil ao espelho"
                  width={900}
                  height={1125}
                  sizes="(min-width: 1024px) 440px, 100vw"
                  className="aspect-[4/3] w-full rounded-md object-cover saturate-[0.88]"
                />
              </figure>
            </Reveal>

            <Reveal delay={280}>
              <div className="mt-7 flex items-center justify-between gap-6 px-1">
                {MARCAS_CLINICAS.map(({ chave, Marca }) => (
                  <div key={chave} className="h-14 w-14 text-accent/80">
                    <Marca />
                  </div>
                ))}
                <div className="hidden flex-1 sm:block">
                  <Regua30 className="w-full" />
                </div>
              </div>
              <div className="mt-4 sm:hidden">
                <Regua30 className="w-full" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
