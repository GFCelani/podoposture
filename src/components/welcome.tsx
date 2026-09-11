import Image from "next/image";

import type { ConteudoBemVindo } from "@/lib/conteudo-tipos";

import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Boas-vindas com a chegada real: a recepcao da clinica, em moldura leve.
 * A silhueta de avaliacao mudou-se para a secao 04; aqui a foto aquece.
 */
export function Welcome({ conteudo }: { conteudo: ConteudoBemVindo }) {
  const { titulo, paragrafo, local, imagem } = conteudo;

  return (
    <section
      id="bem-vindo"
      className="relative overflow-hidden"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        <div className="md:grid md:grid-cols-6 md:items-center md:gap-x-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="md:col-span-3 lg:col-span-6">
            <Reveal variante="cortina">
              <SectionMark n="02" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
                {titulo}
              </h2>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-9 max-w-[62ch] text-[1.125rem] leading-[1.7] text-ink">
                {paragrafo}
              </p>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-8 flex items-center gap-5 font-display text-[1.0625rem] italic text-muted">
                <span aria-hidden="true" className="h-px w-12 bg-rule" />
                {local}
              </p>
            </Reveal>
          </div>

          <div className="mt-14 md:col-span-3 md:col-start-4 md:mt-0 lg:col-span-5 lg:col-start-8">
            <Reveal delay={160}>
              <figure className="rounded-lg border border-rule bg-paper p-3 shadow-plate">
                <Image
                  src={imagem.src}
                  alt={imagem.alt}
                  width={imagem.largura}
                  height={imagem.altura}
                  sizes="(min-width: 1024px) 440px, 100vw"
                  className="aspect-[4/3] w-full rounded-md object-cover saturate-[0.88] lg:aspect-[5/4]"
                />
              </figure>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
