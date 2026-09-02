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
                className="mt-12 h-px w-full max-w-[26rem] bg-rule"
              />
              <ul className="mt-8 space-y-6">
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

          {/* A pilha ocupa a largura inteira da coluna, entao o disco e' o maior que
              cabe nela. O -mt-48 sobe a pilha ate o topo do circulo ficar a dois
              quadrados da grade do limite da secao: o vao que existia acima do
              mapa some, e o mapa e' quem cresce para dentro dele. A subida nao
              esbarra no titulo, que vive na metade esquerda.
              Nenhuma das colunas estica para casar com a outra; a diferenca de
              altura sobra no fim. */}
          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:-mt-48">
            {/*
              Mapa na coluna, no lugar da foto do consultorio. O disco ocupa a
              largura inteira da coluna: o anel tracejado e' o limite externo,
              e o recorte do mapa fica para dentro dele, entao nada estoura.

              O embed ancora o cartao de endereco no canto superior esquerdo do
              iframe. Sangrando 180px para fora, o cartao sai do recorte e o
              ponto continua no centro. Isso tambem esconde o credito do Google
              que vem no rodape do iframe, entao ele e' reescrito logo abaixo,
              com o link de termos: obrigatorio, nao pode sumir com a mascara.

              Abaixo de 390 o disco ficaria com menos de 240px uteis. Nessa
              faixa vira retangulo 4:3, que entrega mais mapa no mesmo espaco.
            */}
            <Reveal delay={240}>
              <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
                <div className="relative aspect-[4/3] w-full min-[390px]:aspect-square">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden rounded-full border border-dashed border-rule min-[390px]:block"
                  />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden min-[390px]:block">
                    {["top-0 left-1/2 -translate-x-1/2 h-3 w-px",
                      "bottom-0 left-1/2 -translate-x-1/2 h-3 w-px",
                      "left-0 top-1/2 -translate-y-1/2 w-3 h-px",
                      "right-0 top-1/2 -translate-y-1/2 w-3 h-px"].map((pos) => (
                      <span key={pos} className={`absolute bg-accent/35 ${pos}`} />
                    ))}
                  </div>

                  <div className="absolute inset-0 overflow-hidden rounded-lg border border-rule bg-surface shadow-plate min-[390px]:inset-5 min-[390px]:rounded-full">
                    <iframe
                      title={`Mapa: ${ADDRESS}`}
                      src={`https://www.google.com/maps?q=${MAP_QUERY}&z=16&output=embed`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute -inset-[180px] block h-[calc(100%+360px)] w-[calc(100%+360px)] border-0 grayscale-[0.7]"
                    />
                  </div>
                </div>

                <p
                  className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.6875rem] tracking-[0.04em] text-muted"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  <span>Dados do mapa © Google</span>
                  <a
                    href="https://www.google.com/intl/pt-BR/help/terms_maps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sublinha rounded-sm text-accent transition-colors duration-[160ms] hover:text-accent-deep"
                  >
                    Termos
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sublinha rounded-sm text-accent transition-colors duration-[160ms] hover:text-accent-deep"
                  >
                    Como chegar
                  </a>
                </p>
              </div>
            </Reveal>
            <Reveal delay={330}>
              <div className="mt-3 rounded-lg border border-rule bg-paper p-8 shadow-plate">
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

    </section>
  );
}
