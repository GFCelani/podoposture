import Image from "next/image";
import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

const ADDRESS =
  "Avenida Nossa Senhora de Copacabana, 928 - sala 501 - Copacabana, Rio de Janeiro - RJ, Brasil";

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
      className="corte-alto-esq relative overflow-hidden border-b border-rule bg-surface"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal variante="cortina">
          <SectionMark n="08" />
          <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
            Converse com a Podoposture
          </h2>
        </Reveal>

        <div className="mt-14 lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-6">
            <Reveal delay={110}>
              <h3 className="font-display text-[1.375rem] leading-[1.3] font-medium text-ink-strong">
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
              <div className="mt-12">
                <ButtonLink href="https://wa.me/5521992035643" variant="primary">
                  Envie uma mensagem
                </ButtonLink>
              </div>
            </Reveal>

            {/* O outro jeito de conversar. Estava preso na ficha de endereco,
                que e' sobre onde a clinica fica, nao sobre falar com ela. */}
            <Reveal delay={340}>
              <div
                aria-hidden="true"
                className="mt-14 h-px w-full max-w-[26rem] bg-rule"
              />
              <ul className="mt-10 space-y-7">
                {PHONES.map((phone) => (
                  <li key={phone.href} className="flex items-baseline gap-4">
                    <span
                      aria-hidden="true"
                      className="h-px w-8 shrink-0 translate-y-[-0.35em] bg-accent/40"
                    />
                    <a
                      href={phone.href}
                      className="sublinha text-[1.0625rem] tracking-[0.02em] text-accent transition-colors duration-[160ms] hover:text-accent-deep"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {phone.label}
                    </a>
                    {phone.note && (
                      <span className="text-[0.8125rem] text-muted">
                        {phone.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <Reveal delay={240}>
              <figure className="mb-6 rounded-lg border border-rule bg-paper p-3 shadow-plate">
                <Image
                  src="/img/galeria/consultorio.jpg"
                  alt="Consultório com mesa de atendimento, espelho de avaliação e bolas suíças"
                  width={900}
                  height={1125}
                  sizes="(min-width: 1024px) 440px, 100vw"
                  className="aspect-[16/9] w-full rounded-md object-cover saturate-[0.88]"
                />
              </figure>
            </Reveal>
            <Reveal delay={330}>
              <div className="rounded-lg border border-rule bg-paper p-8 shadow-plate">
                <address
                  className="text-[0.9375rem] leading-[1.75] text-ink not-italic"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  {ADDRESS}
                </address>

                <p className="mt-7 text-[0.9375rem] leading-[1.7] text-ink">
                  Estamos a 11 minutos da estação Cantagalo do metrô.
                </p>

              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/*
        Mapa em disco. Sai da faixa de ponta a ponta e vira objeto sobre o
        papel: a grade da pagina passa a aparecer em volta dele, e o recorte
        redondo repete a linguagem de instrumento da pagina (a mira do hero,
        os discos da coluna). O anel externo tracejado e os quatro tracos
        cardeais sao a mesma regua das outras secoes, nao ornamento novo.
        Embed sem chave de API.
      */}
      <div className="relative border-t border-rule py-16 lg:py-24">
        <Reveal>
          <div className="relative mx-auto flex w-[min(84vw,620px)] flex-col items-center">
            <div className="relative aspect-square w-full">
              {/* Anel externo e tracos cardeais, fora do recorte do mapa */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-5 rounded-full border border-dashed border-rule lg:-inset-8"
              />
              <div aria-hidden="true" className="pointer-events-none absolute -inset-5 lg:-inset-8">
                {["top-0 left-1/2 -translate-x-1/2 h-3 w-px",
                  "bottom-0 left-1/2 -translate-x-1/2 h-3 w-px",
                  "left-0 top-1/2 -translate-y-1/2 w-3 h-px",
                  "right-0 top-1/2 -translate-y-1/2 w-3 h-px"].map((pos) => (
                  <span key={pos} className={`absolute bg-accent/35 ${pos}`} />
                ))}
              </div>

              {/* O embed ancora o cartao de endereco no canto superior
                  esquerdo do iframe. Com o iframe do tamanho do disco, o
                  recorte redondo cortava o cartao ao meio. Sangrando 180px
                  para fora em todos os lados, o cartao e os botoes do Google
                  caem fora do circulo e o ponto continua no centro; a escala
                  do que se ve e a mesma em qualquer largura, so muda o corte. */}
              <div className="relative h-full w-full overflow-hidden rounded-full border border-rule bg-surface shadow-plate">
                <iframe
                  title={`Mapa: ${ADDRESS}`}
                  src={`https://www.google.com/maps?q=${MAP_QUERY}&z=16&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute -inset-[180px] block h-[calc(100%+360px)] w-[calc(100%+360px)] border-0 grayscale-[0.7]"
                />
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/dir mt-10 inline-flex items-center gap-3 rounded-md border-[1.5px] border-rule bg-paper px-6 py-3 text-[0.9375rem] text-ink shadow-tag transition-[transform,box-shadow,background-color,color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-0.5 hover:bg-ink hover:text-paper hover:shadow-lift active:translate-y-0 lg:mt-14"
            >
              Como chegar
              <svg width="13" height="9" viewBox="0 0 13 9" aria-hidden="true" className="transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/dir:translate-x-1">
                <path
                  d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
