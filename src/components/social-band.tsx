import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";
import { SocialLinks } from "./social-links";

/**
 * O numeral e' da sequencia da home (01 a 11). Nas paginas internas a faixa
 * fecha um documento que tem a propria numeracao de secoes, e um "11" solto
 * ali nao conta nada: sem `n`, a faixa vai so com o fio e o titulo.
 */
export function SocialBand({ n }: { n?: string }) {
  return (
    <section
      id="ligue-se-a-nos"
      className="relative overflow-hidden border-b border-rule"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        {n && (
          <Reveal variante="cortina">
            <SectionMark n={n} />
          </Reveal>
        )}

        <Reveal delay={90}>
          <div className={`flex flex-col gap-8 border-t border-rule pt-10 sm:flex-row sm:items-center sm:justify-between${n ? " mt-10" : ""}`}>
            <h2 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.2] font-semibold tracking-[-0.015em] text-ink-strong">
              Ligue-se a nós
            </h2>
            <SocialLinks tone="light" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
