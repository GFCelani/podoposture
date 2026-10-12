import { ETAPAS_DO_ATENDIMENTO } from "@/lib/atendimento";
import { hrefDoDestino, type ConteudoAtendimentoSecao } from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Secao 06 da home: apresenta "Como e o meu atendimento" e leva a ela. So o
 * titulo, as duas frases de abertura da pagina e o botao; o conteudo fica la.
 *
 * Banda em areia entre a abordagem (05, papel) e o metodo (07, azul), para a
 * sequencia papel, areia, azul nao repetir fundo.
 *
 * Sem foto: o acervo nao tem foto atual da sala reformada que ja nao esteja
 * em outro lugar do site (pedido em /fotos-que-faltam). No lugar, o percurso
 * da consulta: um trilho com um marco por etapa da pagina (o numero vem do
 * proprio texto), e um ponto que o percorre do primeiro ao ultimo, acendendo
 * cada marco ao passar. Sem rotulos: qualquer palavra seria copy que a
 * cliente nao escreveu. Com movimento reduzido fica o trilho parado.
 */
export function AtendimentoNaHome({
  conteudo,
  whatsapp,
}: {
  conteudo: ConteudoAtendimentoSecao;
  whatsapp: string;
}) {
  const { titulo, texto, botao } = conteudo;
  return (
    <section
      id="como-e-o-meu-atendimento"
      className="relative overflow-hidden border-y border-rule bg-surface"
    >
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 md:py-24 lg:px-10 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6">
          <div className="lg:col-span-6">
            <Reveal variante="cortina">
              <SectionMark n="06" />
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
                {titulo}
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-8 max-w-[34ch] text-[clamp(1.25rem,1.05rem+0.8vw,1.5rem)] leading-[1.5] text-pretty text-ink-strong">
                {texto}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10">
                <ButtonLink href={hrefDoDestino(botao.destino, whatsapp)} variant="secondary">
                  {botao.rotulo}
                </ButtonLink>
              </div>
            </Reveal>
          </div>
          <div className="mt-16 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <Reveal delay={200}>
              <Percurso etapas={ETAPAS_DO_ATENDIMENTO.length} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

const X0 = 24;
const X1 = 396;
const Y = 58;

/** O trilho das etapas, com o ponto que o percorre. */
function Percurso({ etapas }: { etapas: number }) {
  const passo = (X1 - X0) / (etapas - 1);
  const dur = 1.2 * etapas;
  return (
    <svg
      viewBox="0 0 420 108"
      aria-hidden="true"
      className="percurso block h-auto w-full overflow-visible"
      style={{ ["--dur" as string]: `${dur}s`, ["--trajeto" as string]: `${X1 - X0}px` }}
    >
      <line x1={X0} y1={Y} x2={X1} y2={Y} className="stroke-rule" strokeWidth="1.5" />
      {Array.from({ length: etapas }, (_, i) => {
        const x = X0 + passo * i;
        return (
          <g key={i}>
            <line x1={x} y1={Y - 14} x2={x} y2={Y + 14} className="stroke-rule" strokeWidth="1" />
            <circle
              cx={x}
              cy={Y}
              r="6"
              className="percurso-onda fill-none stroke-accent"
              strokeWidth="1.5"
              style={{ ["--fase" as string]: `${(0.8 * dur * i) / (etapas - 1)}s` }}
            />
            <circle cx={x} cy={Y} r="4.5" className="fill-paper stroke-accent" strokeWidth="1.5" />
            <text
              x={x}
              y={Y + 38}
              textAnchor="middle"
              className="fill-muted"
              style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em" }}
            >
              {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        );
      })}
      <circle cx={X0} cy={Y} r="4.5" className="percurso-ponto fill-accent" />
    </svg>
  );
}
