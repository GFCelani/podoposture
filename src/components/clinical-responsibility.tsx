import Image from "next/image";
import Link from "next/link";

import {
  dividirPeloDestaque,
  hrefDaPagina,
  hrefDoDestino,
  precisaDeEspacoAntes,
  type ConteudoResponsabilidade,
} from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { MARCAS_CLINICAS, ReguaDosAnos } from "./illustrations";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * A credencial com a pratica real ao lado: avaliacao postural na clinica.
 * As tres marcas de competencia viram faixa secundaria sob a foto, com a
 * regua dos anos de experiencia fechando a coluna. Sem caixa em volta de texto.
 */
export function ClinicalResponsibility({
  conteudo,
  anos,
  whatsapp,
}: {
  conteudo: ConteudoResponsabilidade;
  /** Anos de experiencia do cadastro de contato: um traco por ano na regua. */
  anos: number;
  whatsapp: string;
}) {
  const { titulo, destaque, paragrafo1, paragrafo2, botao, imagem } = conteudo;
  const grifo = dividirPeloDestaque(titulo, destaque);

  return (
    <section
      id="responsabilidade-clinica"
      className="corte-alto-esq relative overflow-hidden border-b border-rule bg-surface"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        <div className="md:grid md:grid-cols-6 md:gap-x-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="md:col-span-3 lg:col-span-6">
            <Reveal variante="cortina">
              <SectionMark n="03" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
                {grifo ? (
                  <>
                    {grifo.antes}
                    <mark className="marca-grifo marca-grifo-claro">{grifo.destaque}</mark>
                    {grifo.depois}
                  </>
                ) : (
                  titulo
                )}
              </h2>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-9 max-w-[56ch] text-[1.125rem] leading-[1.75] text-ink">
                {paragrafo1.antes}{" "}
                <Link
                  href={hrefDaPagina(paragrafo1.link.destino)}
                  className="inline-block py-1 font-display text-[1.25rem] font-medium text-accent underline decoration-rule underline-offset-[6px] transition-colors duration-[160ms] hover:decoration-accent"
                >
                  {paragrafo1.link.rotulo}
                </Link>
                {precisaDeEspacoAntes(paragrafo1.depois) ? " " : ""}
                {paragrafo1.depois}
              </p>
            </Reveal>

            <Reveal delay={190}>
              <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-[1.7] text-ink">
                {paragrafo2}
              </p>
            </Reveal>

            <Reveal delay={270}>
              <div className="mt-10">
                <ButtonLink href={hrefDoDestino(botao.destino, whatsapp)} variant="secondary">
                  {botao.rotulo}
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          {/* A pratica real, com as competencias como faixa secundaria */}
          <div className="mt-14 md:col-span-3 md:col-start-4 md:mt-0 lg:col-span-5 lg:col-start-8">
            <Reveal delay={140}>
              <figure className="rounded-lg border border-rule bg-paper p-3 shadow-plate">
                <Image
                  src={imagem.src}
                  alt={imagem.alt}
                  width={imagem.largura}
                  height={imagem.altura}
                  sizes="(min-width: 1024px) 440px, 100vw"
                  className="aspect-[4/3] w-full rounded-md object-cover saturate-[0.88]"
                />
              </figure>
            </Reveal>

            <Reveal delay={280}>
              <div className="mt-7 flex items-center justify-between gap-6 px-1">
                {MARCAS_CLINICAS.map(({ chave, Marca }) => (
                  <div key={chave} className="h-14 w-14 text-accent/80">
                    <Marca />
                  </div>
                ))}
                <div className="hidden flex-1 sm:block">
                  <ReguaDosAnos anos={anos} className="w-full" />
                </div>
              </div>
              <div className="mt-4 sm:hidden">
                <ReguaDosAnos anos={anos} className="w-full" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
