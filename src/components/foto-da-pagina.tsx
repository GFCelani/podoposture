import Image from "next/image";

import { PageGrid } from "./layers";
import { Reveal } from "./reveal";
import type { Foto } from "@/lib/ilustracao-da-pagina";

/**
 * A fotografia da pagina, entre o texto e o convite.
 *
 * Todas as fotos da clinica sao retrato (4:5). Esticar uma delas numa faixa
 * larga com object-cover jogaria fora dois tercos da imagem e cortaria o que
 * importa, entao aqui a proporcao nativa e' respeitada: a foto ocupa uma
 * coluna estreita e a legenda fica ao lado a partir do tablet, em vez de a
 * foto ocupar a largura toda.
 *
 * width/height vem das medidas reais do arquivo, para o navegador reservar o
 * espaco antes de baixar e o CLS continuar em zero.
 */
export function FotoDaPagina({ foto }: { foto: Foto }) {
  return (
    <section className="relative overflow-hidden border-t border-rule bg-paper">
      <PageGrid />

      <figure className="relative mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-18 lg:px-10 lg:py-20">
        <div className="md:grid md:grid-cols-6 md:items-center md:gap-x-8 lg:grid-cols-12">
          <Reveal className="md:col-span-3 lg:col-span-4 lg:col-start-2">
            <div className="mx-auto max-w-[400px] overflow-hidden rounded-lg border border-rule bg-surface p-2 shadow-plate md:max-w-none">
              <Image
                src={foto.src}
                alt={foto.alt}
                width={foto.largura}
                height={foto.altura}
                sizes="(min-width: 1024px) 380px, (min-width: 768px) 44vw, 400px"
                className="w-full rounded-md saturate-[0.9]"
              />
            </div>
          </Reveal>

          <Reveal
            delay={140}
            className="mt-7 md:col-span-3 md:mt-0 lg:col-span-5 lg:col-start-7"
          >
            <figcaption
              className="max-w-[38ch] text-[0.9375rem] leading-[1.65] text-muted"
              style={{ fontFamily: "var(--mono)" }}
            >
              {foto.legenda}
            </figcaption>
          </Reveal>
        </div>
      </figure>
    </section>
  );
}
