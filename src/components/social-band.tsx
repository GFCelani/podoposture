import { ColumnRules, SectionMark } from "./layers";
import { Reveal } from "./reveal";
import { SocialLinks } from "./social-links";

export function SocialBand() {
  return (
    <section
      id="ligue-se-a-nos"
      className="relative overflow-hidden border-b border-rule"
    >
      <ColumnRules />

      <div className="relative mx-auto max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
        <Reveal variante="cortina">
          <SectionMark n="11" />
        </Reveal>

        <Reveal delay={90}>
          <div className="mt-10 flex flex-col gap-8 border-t border-rule pt-10 sm:flex-row sm:items-center sm:justify-between">
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
