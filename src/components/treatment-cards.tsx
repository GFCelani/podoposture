import Image from "next/image";
import { ButtonLink } from "./button-link";
import { GridPaper, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Os tres cartoes do site atual. Cada um carrega tres <h4> no HTML de origem,
 * sendo dois lixo de edicao do builder com o titulo de outro cartao. Aqui fica
 * so o titulo visivel de cada um, que e a correcao de duplicacao autorizada.
 */
const CARDS = [
  {
    title: "Tratamento da Dor Lombar",
    href: "/dor-lombar-crônica",
    src: "/img/card-dor-lombar.jpg",
    width: 1024,
    height: 1280,
    alt: "Homem sentado à mesa com dor na região lombar",
  },
  {
    title: "Tratamento da Dor Crônica",
    href: "/tratamento-da-dor",
    src: "/img/card-dor-cronica.jpg",
    width: 1024,
    height: 1280,
    alt: "Mulher em pé levando a mão ao pescoço, com dor cervical",
  },
  {
    title: "Tratamento do Zumbido, Bruxismo, Cefaleias e DTMs",
    href: "/tratamento-do-zumbido",
    src: "/img/card-zumbido.jpg",
    width: 819,
    height: 1024,
    alt: "Mulher diante de um computador com as mãos nas têmporas, com cefaleia",
  },
];

export function TreatmentCards() {
  return (
    <section
      id="tratamentos"
      className="relative overflow-hidden border-b border-rule bg-surface"
    >
      <GridPaper size={112} fade="top" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <Reveal>
          <SectionMark n="06" />
        </Reveal>

        <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <li key={card.href} className="flex">
              <Reveal delay={i * 110} className="flex w-full">
                <article className="group flex w-full flex-col">
                  <div className="relative overflow-hidden rounded-lg border border-rule bg-paper shadow-plate transition-[box-shadow,transform] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:-translate-y-1 group-hover:shadow-lift">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-accent transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-x-100"
                    />
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={card.width}
                      height={card.height}
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      className="aspect-[4/5] w-full scale-100 object-cover saturate-[0.88] transition-[filter,transform] duration-[520ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-[1.04] group-hover:saturate-100"
                    />
                  </div>

                  <div className="mt-7 flex items-baseline gap-4">
                    <span
                      aria-hidden="true"
                      className="text-[0.6875rem] tracking-[0.18em] text-muted transition-colors duration-200 group-hover:text-accent"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display text-[1.375rem] leading-[1.25] font-medium text-balance text-ink-strong">
                      {card.title}
                    </h3>
                  </div>

                  <div className="mt-auto pt-6">
                    <ButtonLink href={card.href} variant="secondary">
                      Saiba Mais
                    </ButtonLink>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
