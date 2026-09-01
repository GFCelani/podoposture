import { ColumnRules, GridPaper, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Os tres blocos da secao sao tres etapas do mesmo argumento: o titulo, a
 * tese e o desdobramento. Viram tres nos ligados por uma linha, verbatim.
 * O prumo vertical a direita retoma o instrumento do hero.
 */
export function UnderstandFirst() {
  return (
    <section
      id="compreender-antes-de-tratar"
      data-tone="deep"
      className="relative overflow-hidden bg-accent-deep"
    >
      <GridPaper tone="deep" size={104} fade="bottom" />
      <ColumnRules tone="deep" />

      {/* Prumo: o mesmo instrumento do hero, atravessando o bloco */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-[14%] hidden w-px lg:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-accent-light) 0 3px, transparent 3px 8px)",
          opacity: 0.45,
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <ol className="relative space-y-14 lg:space-y-16">
          <div
            aria-hidden="true"
            className="absolute top-5 bottom-5 left-[17px] w-[1.5px] bg-gradient-to-b from-paper/10 via-accent-light/55 to-paper/10"
          />

          {/* Etapa 1: o titulo */}
          <li className="relative pl-14 lg:pl-20">
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-accent-light/55 bg-accent-deep text-[0.6875rem] tracking-[0.08em] text-accent-light"
              style={{ fontFamily: "var(--mono)" }}
            >
              01
            </span>
            <Reveal variante="cortina">
              <SectionMark n="04" tone="deep" />
              <h2 className="mt-7 max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.018em] text-balance text-paper">
                Compreender Antes de Tratar
              </h2>
            </Reveal>
          </li>

          {/* Etapa 2: a tese */}
          <li className="relative pl-14 lg:pl-20">
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-accent-light/55 bg-accent-deep text-[0.6875rem] tracking-[0.08em] text-accent-light"
              style={{ fontFamily: "var(--mono)" }}
            >
              02
            </span>
            <Reveal delay={140}>
              <p className="max-w-[26ch] font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] font-medium text-balance text-paper">
                Conviver com dor ou limitações raramente é uma questão local.
              </p>
            </Reveal>
          </li>

          {/* Etapa 3: o desdobramento, em placa sobre o petroleo */}
          <li className="relative pl-14 lg:pl-20">
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-accent-light/55 bg-accent-deep text-[0.6875rem] tracking-[0.08em] text-accent-light"
              style={{ fontFamily: "var(--mono)" }}
            >
              03
            </span>
            <Reveal delay={260}>
              <div className="max-w-[58ch] rounded-lg border border-paper/[0.14] bg-paper/[0.045] p-7 lg:p-9">
                <p className="text-[1.0625rem] leading-[1.75] text-on-deep-muted">
                  Com o tempo, o corpo se adapta no movimento, no sono, na forma
                  de se organizar. Por isso, o ponto de partida não são as
                  técnicas. É a escuta clínica, o histórico e a leitura dos
                  sinais que o corpo sustenta. As intervenções vêm a partir
                  desse entendimento.
                </p>
              </div>
            </Reveal>
          </li>
        </ol>
      </div>
    </section>
  );
}
