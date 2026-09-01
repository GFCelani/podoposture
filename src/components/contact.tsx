import { ButtonLink } from "./button-link";
import { ColumnRules, GridPaper, SectionMark } from "./layers";
import { Reveal } from "./reveal";

const ADDRESS =
  "Avenida Nossa Senhora de Copacabana, 928 - sala 501 - Copacabana, Rio de Janeiro - Rio de Janeiro, Brazil";

const MAP_QUERY = encodeURIComponent(
  "Avenida Nossa Senhora de Copacabana, 928, Copacabana, Rio de Janeiro",
);

const PHONES = [
  { label: "+ 55 21 2255-4845", href: "tel:552122554845", note: null },
  { label: "+ 55 21 99203-5643", href: "tel:5521992035643", note: "WhatsApp" },
];

export function Contact() {
  return (
    <section
      id="contato"
      className="relative overflow-hidden border-b border-rule bg-surface"
    >
      <GridPaper size={96} fade="left" />
      <ColumnRules />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal>
          <SectionMark n="08" />
          <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink">
            Converse com a Podoposture
          </h2>
        </Reveal>

        <div className="mt-14 lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-6">
            <Reveal delay={110}>
              <h3 className="font-display text-[1.375rem] leading-[1.3] font-medium text-ink">
                Sua dor merece ser compreendida
              </h3>
            </Reveal>

            <Reveal delay={180}>
              <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-[1.7] text-ink">
                Se você convive com dor ou sente que seu corpo precisa ser
                avaliado com mais atenção, estamos à disposição para ouvir,
                orientar e entender se uma avaliação faz sentido para o seu
                caso.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-10">
                <ButtonLink href="https://wa.me/5521992035643" variant="primary">
                  Envie uma mensagem
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <Reveal delay={330}>
              <div className="border-t border-rule bg-paper p-8 shadow-[0_18px_44px_-34px_rgba(13,37,54,0.55)]">
                <address
                  className="text-[0.9375rem] leading-[1.75] text-ink not-italic"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  {ADDRESS}
                </address>

                <p className="mt-7 text-[0.9375rem] leading-[1.7] text-ink">
                  Estamos a 11 minutos da estação Cantagalo do metrô.
                </p>

                <div aria-hidden="true" className="mt-7 h-px w-full bg-rule" />

                <ul className="mt-6 space-y-2.5">
                  {PHONES.map((phone) => (
                    <li key={phone.href}>
                      <a
                        href={phone.href}
                        className="text-[0.9375rem] tracking-[0.02em] text-accent transition-colors duration-200 hover:text-accent-deep"
                        style={{ fontFamily: "var(--mono)" }}
                      >
                        {phone.label}
                      </a>
                      {phone.note && (
                        <span className="ml-2.5 text-[0.8125rem] text-muted">
                          {phone.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* Mapa full-bleed, como no site atual. Embed sem chave de API. */}
      <div className="relative border-t border-rule">
        <iframe
          title={ADDRESS}
          src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[340px] w-full border-0 grayscale-[0.55] lg:h-[440px]"
        />
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-5 lg:p-8">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-3 border border-rule bg-paper px-6 py-3 text-[0.9375rem] text-ink shadow-[0_10px_30px_-22px_rgba(13,37,54,0.7)] transition-colors duration-200 hover:bg-ink hover:text-paper"
          >
            Get directions
            <svg width="13" height="9" viewBox="0 0 13 9" aria-hidden="true">
              <path
                d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
