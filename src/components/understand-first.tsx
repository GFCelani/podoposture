import { Reveal } from "./reveal";

/** Grade de colunas visivel: a camada que da densidade ao bloco escuro. */
function ColumnGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mx-auto max-w-[1240px] px-6 lg:px-10"
    >
      <div className="grid h-full grid-cols-4 gap-x-6 lg:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className={`border-l border-white/[0.07] ${i >= 4 ? "hidden lg:block" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

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
 * bloco escuro pede.
 */
export function UnderstandFirst() {
  return (
    <section
      id="compreender-antes-de-tratar"
      className="relative overflow-hidden bg-accent-deep"
    >
      <ColumnGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
        <Reveal>
          <h2 className="max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-normal text-balance text-paper">
            Compreender Antes de Tratar
          </h2>
        </Reveal>

        <div className="mt-12">
          <Rule delay={120} />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <Reveal delay={190} className="lg:col-span-8">
            <p className="mt-12 font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] text-balance text-paper">
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
