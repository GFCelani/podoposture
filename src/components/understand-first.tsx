import { VINHETAS_ADAPTACAO } from "./illustrations";
import { ColumnRules, GridPaper, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * "o corpo se adapta no movimento, no sono, na forma de se organizar":
 * as tres adaptacoes desenhadas na coluna direita, uma vinheta cada.
 * Sem timeline, sem caixa em volta de texto.
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

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
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

          {/* As tres adaptacoes da copy, desenhadas */}
          <div className="mt-14 lg:col-span-4 lg:col-start-9 lg:mt-2">
            <div className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-9">
              {VINHETAS_ADAPTACAO.map(({ chave, Vinheta }, i) => (
                <Reveal key={chave} delay={200 + i * 130}>
                  <div className="flex justify-center lg:justify-start">
                    <div className="h-24 w-32 text-paper lg:h-32 lg:w-44">
                      <Vinheta />
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
