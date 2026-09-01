import Image from "next/image";
import { ButtonLink } from "./button-link";
import { Reveal } from "./reveal";

const PARAGRAPHS = [
  "Na Podoposture, o cuidado não começa por protocolos prontos.",
  "Começa pela observação dos padrões de movimento, das estratégias de adaptação e da forma como o sistema nervoso participa desse processo.",
  "Cada atendimento se desenvolve a partir de uma avaliação clínica e evolui conforme as respostas do organismo.",
  "Os recursos são definidos ao longo do processo, orientados por um raciocínio clínico que acompanha cada etapa.",
  "Não se trata apenas de aplicar técnicas, mas de saber quando e por que utilizá-las.",
];

export function Approach() {
  return (
    <section id="nossa-abordagem" className="border-b border-rule">
      <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-36">
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-6">
          {/* Placa da baropodometria. Fonte 1080x816 de faixa util, renderizada
              a no maximo 480 CSS: 2,25x de densidade, sem esticar nada. */}
          <Reveal className="lg:col-span-5">
            <figure className="border border-rule bg-surface p-3">
              <Image
                src="/img/baropodometria.jpg"
                alt="Análise de marcha com marcadores sobre plataforma de baropodometria"
                width={1080}
                height={816}
                sizes="(min-width: 1024px) 480px, 100vw"
                className="h-auto w-full"
              />
              <figcaption
                className="mt-3 flex items-center gap-3 px-1 pb-1 text-[0.6875rem] tracking-[0.18em] text-muted uppercase"
                style={{ fontFamily: "var(--mono)" }}
              >
                <span aria-hidden="true" className="h-px w-6 bg-rule" />
                Baropodometria
              </figcaption>
            </figure>
          </Reveal>

          <div className="mt-12 lg:col-span-6 lg:col-start-7 lg:mt-0">
            <Reveal delay={110}>
              <h2 className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-normal text-balance text-ink">
                Nossa Abordagem
              </h2>
            </Reveal>

            <div className="mt-9 space-y-5">
              {PARAGRAPHS.map((text, i) => (
                <Reveal key={text} delay={180 + i * 70}>
                  <p
                    className={`text-[1.0625rem] leading-[1.7] ${
                      i === 0 ? "text-ink" : "text-muted"
                    }`}
                  >
                    {text}
                  </p>
                </Reveal>
              ))}
            </div>

            <Reveal delay={560}>
              <div className="mt-11">
                <ButtonLink
                  href="https://wa.me/message/WFGOB3AVBI63J1"
                  variant="primary"
                >
                  Falar Sobre o Meu Caso
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
