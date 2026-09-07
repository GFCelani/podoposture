import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { FiguraLeitura } from "./figura-leitura";
import { Reveal } from "./reveal";

/**
 * Destino do botao. A pagina do metodo ainda nao existe: com null o botao
 * nasce inativo (aria-disabled, sem href; ver ButtonLink). Quando a pagina
 * entrar no ar, a mudanca e' esta linha.
 */
const DESTINO_DO_METODO: string | null = null;

/**
 * Copy da cliente, verbatim. Duas grafias, as duas intencionais: "MÉTODO
 * REGULADOR®" no titulo, "Método RegulaDOR" no corpo e no botao. Nao
 * uniformizar. O hifen em "da dor - desde" tambem e' dela.
 */
const TITULO = "MÉTODO REGULADOR";
const ABERTURA = "Dor persistente não é analisada por uma única estrutura.";
const CORPO = [
  "O Método RegulaDOR organiza a avaliação clínica para compreender diferentes fatores que podem participar da manutenção da dor - desde os sinais dos tecidos e a função musculoesquelética até o processamento do sistema nervoso, o movimento, o estado do organismo e o contexto do paciente.",
  "A partir dessa leitura, são definidos os recursos terapêuticos mais adequados para cada caso.",
];
const BOTAO = "Conheça o Método RegulaDOR";

/**
 * Secao 06 da home, entre a abordagem (05) e as condicoes tratadas (07).
 *
 * Banda escura, como a 04: e' a peca propria da clinica, e o valor de fundo
 * e' a alavanca mais barata de presenca. Duas colunas: numeral, titulo e a
 * figura a esquerda; a frase de abertura, o corpo e o botao a direita. A
 * figura ocupa a largura da coluna e nada mais, que e' o tamanho que ela
 * pede: seis entradas, um ponto e uma saida nao precisam de placa.
 */
export function MetodoRegulador() {
  return (
    <section
      id="metodo-regulador"
      data-tone="deep"
      className="relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-5">
            <Reveal variante="cortina">
              <SectionMark n="06" tone="deep" />
              {/* Caixa alta e' a escrita da cliente, nao CSS: por isso o
                  tracking abre em vez de fechar, que e' o que versal pede
                  em corpo de display. O ® desce de tamanho e sobe de linha,
                  mas continua no texto. */}
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[0.04em] text-paper">
                {TITULO}
                <span className="align-super text-[0.5em] tracking-normal">®</span>
              </h2>
            </Reveal>

            <Reveal delay={200}>
              <FiguraLeitura className="mt-12 w-full max-w-[440px] lg:mt-16" />
            </Reveal>
          </div>

          <div className="mt-14 lg:col-span-6 lg:col-start-7 lg:mt-0">
            <Reveal delay={120}>
              <p className="max-w-[26ch] font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] font-medium text-balance text-paper">
                {ABERTURA}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div
                aria-hidden="true"
                className="mt-10 h-px w-full max-w-[420px] bg-paper/[0.14]"
              />
              <div className="mt-10 max-w-[58ch] space-y-6">
                {CORPO.map((paragrafo) => (
                  <p
                    key={paragrafo}
                    className="text-[1.0625rem] leading-[1.75] text-on-deep-muted"
                  >
                    {paragrafo}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={360}>
              <div className="mt-11">
                <ButtonLink href={DESTINO_DO_METODO} variant="secondary-deep">
                  {BOTAO}
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
