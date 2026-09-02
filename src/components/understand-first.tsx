import { FigurePoints } from "./illustrations";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * "avaliacao cuidadosa do corpo como um todo", desenhada: a silhueta com os
 * pontos de avaliacao acendendo mora aqui, em traco claro sobre o petroleo
 * suave, ocupando a coluna direita inteira. Sem caixa, sem timeline.
 */
export function UnderstandFirst() {
  return (
    <section
      id="compreender-antes-de-tratar"
      data-tone="deep"
      className="relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      {/* Prumo: o mesmo instrumento do hero, atravessando o bloco */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-[10%] hidden w-px lg:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-accent-light) 0 3px, transparent 3px 8px)",
          opacity: 0.28,
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6">
          <div className="lg:col-span-7">
            <Reveal variante="cortina">
              <SectionMark n="04" tone="deep" />
              <h2 className="mt-9 max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.018em] text-balance text-paper">
                Compreender Antes de Tratar
              </h2>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-10 max-w-[26ch] font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] font-medium text-balance text-paper">
                Conviver com dor ou limitações raramente é uma questão local.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <div
                aria-hidden="true"
                className="mt-10 h-px w-full max-w-[420px] bg-paper/[0.14]"
              />
              <p className="mt-10 max-w-[58ch] text-[1.0625rem] leading-[1.75] text-on-deep-muted">
                Com o tempo, o corpo se adapta no movimento, no sono, na forma
                de se organizar. Por isso, o ponto de partida não são as
                técnicas. É a escuta clínica, o histórico e a leitura dos
                sinais que o corpo sustenta. As intervenções vêm a partir desse
                entendimento.
              </p>
            </Reveal>
          </div>

          {/* O corpo como um todo, lido nivel a nivel */}
          <div className="mt-14 lg:col-span-4 lg:col-start-9 lg:mt-0">
            <Reveal delay={200}>
              <FigurePoints className="mx-auto h-[clamp(300px,40vh,440px)] w-auto text-paper/90" />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
