import { FiguraCorpo } from "./figura-corpo";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * "avaliacao cuidadosa do corpo como um todo", desenhada: a figura do
 * projeto (a mesma do hero, ver figura-corpo.tsx) na coluna direita, em
 * traco claro sobre o petroleo suave. Sem caixa, sem timeline.
 *
 * Camadas escolhidas para ESTA secao: silhueta, prumo, cadeia e
 * articulacoes; a coluna fica de fora. A coluna e' o vocabulario da
 * osteopatia e ja e' o assunto do hero e da lateral das paginas internas;
 * aqui a copy fala de adaptacao e de "leitura dos sinais que o corpo
 * sustenta", e quem diz isso e' a cadeia (os segmentos que ligam as
 * articulacoes entre si e ao eixo) com o sonar das articulacoes. Sem as 24
 * vertebras por cima, a cadeia finalmente aparece: ela existia na figura do
 * hero e ficava escondida atras da coluna.
 *
 * Geometria da banda: a figura e' ancorada a direita do contentor, nao
 * centrada num vao, e cresce ate a altura do bloco de texto. O fio de prumo
 * da secao deixa de correr a 10% da borda e passa exatamente pelo eixo da
 * figura, entao os dois prumos que existiam viram um so: o fio e' a
 * continuacao do eixo dela, subindo e descendo alem do corpo. As medidas
 * saem de --fig-h em globals.css (.secao-corpo), e o fio e' posicionado pela
 * mesma variavel.
 */
export function UnderstandFirst() {
  return (
    <section
      id="compreender-antes-de-tratar"
      data-tone="deep"
      className="secao-corpo relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        {/* Prumo: o mesmo instrumento do hero, atravessando a banda pelo eixo
            da figura. Vive DENTRO do contentor, nao da secao: posicionado por
            100vw ele errava a barra de rolagem e caia 8px ao lado do eixo, o
            que se le como duas linhas paralelas em vez de uma.
            Ver .secao-corpo-prumo em globals.css. */}
        <div aria-hidden="true" className="secao-corpo-prumo pointer-events-none" />
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6">
          <div className="lg:col-span-7">
            <Reveal variante="cortina">
              <SectionMark n="04" tone="deep" />
              <h2 className="mt-9 max-w-[22ch] font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.018em] text-balance text-paper">
                Compreender Antes de Tratar
              </h2>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-10 max-w-[26ch] font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] font-medium text-balance text-paper">
                Conviver com dor ou limitações raramente é uma questão local.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <div
                aria-hidden="true"
                className="mt-10 h-px w-full max-w-[420px] bg-paper/[0.14]"
              />
              <p className="mt-10 max-w-[58ch] text-[1.0625rem] leading-[1.75] text-on-deep-muted">
                Com o tempo, o corpo se adapta no movimento, no sono, na forma
                de se organizar. Por isso, o ponto de partida não são as
                técnicas. É a escuta clínica, o histórico e a leitura dos
                sinais que o corpo sustenta. As intervenções vêm a partir desse
                entendimento.
              </p>
            </Reveal>
          </div>

          {/* O corpo como um todo, lido nivel a nivel */}
          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:justify-self-end">
            <Reveal delay={200}>
              <FiguraCorpo
                vista="frontal"
                camadas={["silhueta", "faixas"]}
                peso={2.4}
                opacidade={0.92}
                className="secao-corpo-figura"
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
