import { ColumnRules, GridPaper, SeamRuler, SectionMark } from "./layers";
import { Reveal } from "./reveal";

export function Welcome() {
  return (
    <>
      <SeamRuler />

      <section id="bem-vindo" className="relative overflow-hidden border-b border-rule">
        <GridPaper size={64} fade="right" />
        <ColumnRules />

        <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-32">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
            <Reveal className="lg:col-span-2">
              <SectionMark n="02" />
            </Reveal>

            <div className="mt-10 lg:col-span-9 lg:col-start-3 lg:mt-0 lg:border-l lg:border-rule lg:pl-12">
              <Reveal>
                <h2 className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink">
                  Bem-vindo(a) à Podoposture
                </h2>
              </Reveal>

              <Reveal delay={110}>
                <p className="mt-9 max-w-[62ch] text-[1.125rem] leading-[1.7] text-ink">
                  Com quase três décadas de experiência clínica, cuidamos de
                  pessoas que convivem com dor, alterações posturais e disfunções
                  da coluna. Aqui, cada tratamento começa pela escuta e por uma
                  avaliação cuidadosa do corpo como um todo, respeitando a forma
                  como cada pessoa responde ao cuidado.
                </p>
              </Reveal>

              <Reveal delay={200}>
                <p className="mt-8 flex items-center gap-5 font-display text-[1.0625rem] italic text-muted">
                  <span aria-hidden="true" className="h-px w-12 bg-rule" />
                  (Copacabana – Rio de Janeiro)
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
