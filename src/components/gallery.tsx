import Image from "next/image";

import type { ConteudoGaleria } from "@/lib/conteudo-tipos";

import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Fotografias reais da clinica. No padrao, recepcao e avaliacao postural
 * moram nas secoes 02 e 03 e ficam fora daqui para nao repetir; a sacola de
 * pano saiu a pedido da cliente (2026-09-07) e no lugar entrou o consultorio.
 * As sete imagens restantes da galeria do site antigo sao pecas de marketing
 * com texto embutido e continuam de fora.
 *
 * Toda foto e' recortada em 4:5 pelo centro. Largura e altura sao as reais do
 * arquivo: com o painel trocando fotos, a medida fixa de antes (900x1125)
 * mentiria sobre qualquer imagem nova.
 */
export function Gallery({ conteudo }: { conteudo: ConteudoGaleria }) {
  return (
    <section
      data-tone="deep"
      id="galeria"
      className="relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        <Reveal variante="cortina">
          <SectionMark n="11" tone="deep" />
          <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.018em] text-balance text-paper">
            {conteudo.titulo}
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div aria-hidden="true" className="mt-10 h-px w-full bg-white/[0.14]" />
        </Reveal>

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {conteudo.fotos.map((foto, i) => (
            <li key={i}>
              <Reveal delay={(i % 3) * 90}>
                <figure className="group relative overflow-hidden rounded-lg border border-white/[0.12] transition-[border-color,transform,box-shadow] duration-[420ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-1 hover:border-white/40 hover:shadow-lift">
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 z-10 rounded-br-md bg-deep-calm px-2.5 py-1.5 text-[0.625rem] tracking-[0.18em] text-on-deep-muted"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Image
                    src={foto.src}
                    alt={foto.alt}
                    width={foto.largura}
                    height={foto.altura}
                    sizes="(min-width: 1024px) 380px, 50vw"
                    className="aspect-[4/5] w-full object-cover saturate-[0.88] transition-[filter,transform] duration-[520ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-[1.04] group-hover:saturate-100"
                  />
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
