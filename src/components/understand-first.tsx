import { ColumnRules, GridPaper, SectionMark } from "./layers";
import { Reveal } from "./reveal";

function Rule({ delay }: { delay: number }) {
  return (
    <Reveal delay={delay}>
      <div aria-hidden="true" className="h-px w-full bg-white/[0.14]" />
    </Reveal>
  );
}

/**
 * Silhueta em Z, deliberadamente diferente da secao 03: titulo em cima a
 * esquerda, tese larga no meio comecando na mesma margem, corpo embaixo a
 * direita. Duas reguas horizontais de largura total dao a densidade que o
 * bloco escuro pede. O prumo vertical retoma o instrumento do hero.
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
        className="pointer-events-none absolute inset-y-0 right-[18%] hidden w-px lg:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-accent-light) 0 3px, transparent 3px 8px)",
          opacity: 0.45,
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal>
          <SectionMark n="04" tone="deep" />
          <h2 className="mt-9 max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.018em] text-balance text-paper">
            Compreender Antes de Tratar
          </h2>
        </Reveal>

        <div className="mt-12">
          <Rule delay={120} />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <Reveal delay={190} className="lg:col-span-8">
            <p className="mt-12 font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] font-medium text-balance text-paper">
              Conviver com dor ou limitações raramente é uma questão local.
            </p>
          </Reveal>
        </div>

        <div className="mt-14">
          <Rule delay={260} />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <Reveal delay={330} className="mt-12 lg:col-span-6 lg:col-start-7">
            <p className="text-[1.0625rem] leading-[1.75] text-on-deep-muted">
              Com o tempo, o corpo se adapta no movimento, no sono, na forma de
              se organizar. Por isso, o ponto de partida não são as técnicas. É
              a escuta clínica, o histórico e a leitura dos sinais que o corpo
              sustenta. As intervenções vêm a partir desse entendimento.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
