import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * O fecho das paginas informativas.
 *
 * As 18 paginas de servico e os 68 posts terminavam sem nada: a mais longa
 * acaba numa lista de referencias que leva a leitora para fora do site. Uma
 * pessoa com dor cronica lia 900 palavras e chegava ao fim sem saber o que
 * fazer.
 *
 * Um botao solido so, no verde que a casa reserva para acao, e dois caminhos
 * mais leves ao lado. O texto nao promete cura nem cria urgencia: o publico
 * daqui costuma ja ter passado por varios tratamentos, e responde a ser
 * entendido, nao a pressao.
 *
 * O id existe para o disco flutuante se calar quando este bloco esta na tela —
 * dois convites verdes ao mesmo tempo competem entre si.
 */
export function ConviteConsulta() {
  return (
    <section
      id="convite-consulta"
      aria-labelledby="convite-consulta-titulo"
      className="relative overflow-hidden border-t border-rule bg-surface"
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
        <div className="md:grid md:grid-cols-6 md:gap-x-8 lg:grid-cols-12">
          <div className="md:col-span-4 lg:col-span-7">
            <Reveal variante="cortina">
              <SectionMark n="PRÓXIMO PASSO" />
              <h2
                id="convite-consulta-titulo"
                className="mt-8 max-w-[22ch] font-display text-[clamp(1.5rem,1.15rem+1.75vw,2.25rem)] leading-[1.16] font-semibold tracking-[-0.018em] text-balance text-ink-strong"
              >
                Quer saber se este tratamento serve para o seu caso?
              </h2>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-6 max-w-[54ch] text-[1.0625rem] leading-[1.7] text-ink">
                Conte o que você sente e há quanto tempo. A gente responde
                dizendo o que dá para investigar e se uma avaliação faz sentido
                agora — sem compromisso de iniciar tratamento.
              </p>
            </Reveal>
          </div>

          <div className="mt-10 md:col-span-2 md:mt-0 lg:col-span-4 lg:col-start-9">
            <Reveal delay={200}>
              <ButtonLink href="https://wa.me/5521992035643" variant="primary">
                Falar sobre o meu caso
              </ButtonLink>

              <p className="mt-8">
                <a
                  href="tel:552122554845"
                  className="sublinha inline-flex min-h-[44px] items-center text-[1.0625rem] text-accent"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  (21) 2255-4845
                </a>
              </p>

              <p className="mt-1">
                <ButtonLink href="/contato" variant="tertiary">
                  Endereço e horários
                </ButtonLink>
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
