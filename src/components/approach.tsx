import Image from "next/image";

import { hrefDoDestino, type ConteudoAbordagem } from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { PressaoPlantar } from "./illustrations";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Os paragrafos sao momentos do mesmo raciocinio clinico: passos numerados
 * ligados por uma linha, verbatim. Ao lado, o que o exame produz: a foto da
 * baropodometria e o mapa de pressao plantar desenhado.
 */
export function Approach({ conteudo, whatsapp }: { conteudo: ConteudoAbordagem; whatsapp: string }) {
  const { titulo, passos, imagem, legenda, botao } = conteudo;

  return (
    <section
      id="nossa-abordagem"
      className="relative overflow-hidden"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        <div className="md:grid md:grid-cols-6 md:items-start md:gap-x-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="md:col-span-2 lg:sticky lg:top-28 lg:col-span-5">
            {/* Placa da baropodometria. Sem corte: a foto entra na razao
                propria, entao largura e altura precisam ser as do arquivo. */}
            <Reveal>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-3 translate-y-3 rounded-lg border border-rule bg-surface"
                />
                <figure className="relative -rotate-[1.2deg] rounded-lg border border-rule bg-paper p-3 shadow-float transition-transform duration-[520ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-rotate-[0.4deg]">
                  <Image
                    src={imagem.src}
                    alt={imagem.alt}
                    width={imagem.largura}
                    height={imagem.altura}
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className="h-auto w-full rounded-md saturate-[0.88]"
                  />
                  <figcaption
                    className="mt-3 flex items-center gap-3 px-1 pb-1 text-[0.6875rem] tracking-[0.18em] text-muted uppercase"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    <span aria-hidden="true" className="h-px w-6 bg-rule" />
                    {legenda}
                  </figcaption>
                </figure>
              </div>
            </Reveal>

            {/* O que o exame produz: mapa de pressao plantar, desenhado */}
            <Reveal delay={200}>
              <div className="mt-10 hidden lg:block">
                <PressaoPlantar className="mx-auto h-56 w-auto" />
              </div>
            </Reveal>
          </div>

          <div className="mt-16 md:col-span-4 md:col-start-3 md:mt-0 lg:col-span-6 lg:col-start-7">
            <Reveal variante="cortina">
              <SectionMark n="05" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
                {titulo}
              </h2>
            </Reveal>

            {/* Passos: marcadores circulares ligados por uma linha. Chave pela
                posicao: dois passos com o mesmo texto sao possiveis no painel. */}
            <ol className="relative mt-11 space-y-7">
              <div
                aria-hidden="true"
                className="absolute top-4 bottom-4 left-[17px] w-[1.5px] bg-gradient-to-b from-rule via-accent/35 to-rule"
              />
              {passos.map((texto, i) => (
                <li key={i} className="relative pl-14">
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-accent/45 bg-paper text-[0.6875rem] tracking-[0.08em] text-accent shadow-tag"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Reveal delay={140 + i * 90}>
                    <p
                      className={`leading-[1.65] ${
                        i === 0 || i === passos.length - 1
                          ? "font-display text-[1.25rem] font-medium text-ink-strong"
                          : "text-[1.0625rem] text-ink"
                      }`}
                    >
                      {texto}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>

            <Reveal delay={620}>
              <div className="mt-11 pl-14">
                <ButtonLink href={hrefDoDestino(botao.destino, whatsapp)} variant="primary">
                  {botao.rotulo}
                </ButtonLink>
              </div>
            </Reveal>

            {/* No telefone o mapa entra depois dos passos */}
            <Reveal delay={200}>
              <div className="mt-14 lg:hidden">
                <PressaoPlantar className="mx-auto h-52 w-auto" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
