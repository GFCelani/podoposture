import Image from "next/image";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Boas-vindas com a chegada real: a recepcao da clinica, em moldura leve.
 * A silhueta de avaliacao mudou-se para a secao 04; aqui a foto aquece.
 */
export function Welcome() {
  return (
    <section
      id="bem-vindo"
      className="relative overflow-hidden"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6">
          <div className="lg:col-span-6">
            <Reveal variante="cortina">
              <SectionMark n="02" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
                Bem-vindo(a) à Podoposture
              </h2>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-9 max-w-[62ch] text-[1.125rem] leading-[1.7] text-ink">
                Com quase três décadas de experiência clínica, cuidamos de
                pessoas que convivem com dor, alterações posturais e disfunções
                da coluna. Aqui, cada tratamento começa pela escuta e por uma
                avaliação cuidadosa do corpo como um todo, respeitando a forma
                como cada pessoa responde ao cuidado.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-8 flex items-center gap-5 font-display text-[1.0625rem] italic text-muted">
                <span aria-hidden="true" className="h-px w-12 bg-rule" />
                (Copacabana – Rio de Janeiro)
              </p>
            </Reveal>
          </div>

          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <Reveal delay={160}>
              <figure className="rounded-lg border border-rule bg-paper p-3 shadow-plate">
                <Image
                  src="/img/galeria/recepcao.webp"
                  alt="Recepção da clínica, com balcão em madeira e placa da Podoposture"
                  width={827}
                  height={1033}
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
