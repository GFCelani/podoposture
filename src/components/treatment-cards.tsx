import Image from "next/image";
import { ButtonLink } from "./button-link";
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
    <section id="tratamentos" className="border-b border-rule bg-surface">
      <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-28">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <li key={card.href} className="flex">
              <Reveal delay={i * 110} className="flex w-full">
                <article className="group flex w-full flex-col">
                  <div className="relative overflow-hidden border border-rule bg-paper">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-action transition-transform duration-[240ms] ease-out group-hover:scale-x-100"
                    />
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={card.width}
                      height={card.height}
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      className="aspect-[4/5] w-full object-cover saturate-[0.85] transition-[filter] duration-[240ms] ease-out group-hover:saturate-100"
                    />
                  </div>

                  <h3 className="mt-7 font-display text-[1.375rem] leading-[1.25] text-balance text-ink">
                    {card.title}
                  </h3>

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
