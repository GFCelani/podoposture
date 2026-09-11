import Image from "next/image";

import { hrefDaPagina, type ConteudoTratamentos } from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Os cartoes de tratamento, com foto recortada em 4:5. O titulo do cartao nao
 * precisa ser o titulo da pagina de destino: e texto de chamada, e trocar um
 * nao mexe em rota nem em SEO.
 */
export function TreatmentCards({ conteudo }: { conteudo: ConteudoTratamentos }) {
  return (
    <section
      id="tratamentos"
      className="corte-alto-dir relative overflow-hidden border-b border-rule bg-surface"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-20 lg:py-24">
        <Reveal>
          <SectionMark n="07" />
        </Reveal>

        <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {/* Chave pela posicao: dois cartoes podem levar a mesma pagina. */}
          {conteudo.cartoes.map((cartao, i) => (
            <li key={i} className="flex">
              <Reveal delay={i * 110} className="flex w-full">
                <article className="group flex w-full flex-col">
                  <div className="relative overflow-hidden rounded-lg border border-rule bg-paper shadow-plate transition-[box-shadow,transform] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:-translate-y-1 group-hover:shadow-lift">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-accent transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-x-100"
                    />
                    <Image
                      src={cartao.imagem.src}
                      alt={cartao.imagem.alt}
                      width={cartao.imagem.largura}
                      height={cartao.imagem.altura}
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
                      {cartao.titulo}
                    </h3>
                  </div>

                  <div className="mt-auto pt-6">
                    <ButtonLink href={hrefDaPagina(cartao.destino)} variant="secondary">
                      {conteudo.rotuloDoBotao}
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
