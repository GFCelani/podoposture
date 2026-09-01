import { Reveal } from "./reveal";
import { SocialLinks } from "./social-links";

export function SocialBand() {
  return (
    <section id="ligue-se-a-nos" className="border-b border-rule">
      <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <Reveal>
          <div className="flex flex-col gap-8 border-t border-rule pt-10 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.2] font-normal text-ink">
              Ligue-se a nós
            </h2>
            <SocialLinks tone="light" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
