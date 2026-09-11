"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Os tres graficos da aba "Numeros", em SVG escrito a mao.
 *
 * Sem biblioteca de grafico: sao barras e uma linha, e uma dependencia de
 * centenas de kilobytes para isso pesaria no painel inteiro. Regras que vieram
 * da skill dataviz e que valem para os tres:
 *
 * - Uma serie so, entao uma cor so: o azul de grafico (`accent-vivid`), que da
 *   4.39 sobre o papel — passa os 3:1 de marca de grafico e nunca recebe texto.
 * - Numero e rotulo sempre em cor de texto, nunca na cor da marca.
 * - Barra fina com ponta arredondada e base reta; linha de 2px; grade em fio
 *   de 1px na cor `rule`, continuo.
 * - Todo valor tambem pode ser lido sem cor e sem mouse: o numero escrito ao
 *   lado da barra, e nos graficos de tempo a leitura por teclado e a tabela.
 *
 * Os desenhos sao medidos em pixels reais do contêiner, e nao esticados por
 * `viewBox`: esticar deformaria a ponta arredondada e a espessura da linha, e
 * em 320px de largura isso aparece.
 */

/** Largura do conteudo do elemento, acompanhando mudancas (inclusive sair de `hidden`). */
function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.floor(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return [ref, largura] as const;
}

/** Barra horizontal: base reta a esquerda, ponta arredondada a direita. */
function barraHorizontal(largura: number, altura: number): string {
  const r = Math.min(4, largura / 2, altura / 2);
  return `M0,0 H${largura - r} A${r},${r} 0 0 1 ${largura},${r} V${altura - r} A${r},${r} 0 0 1 ${largura - r},${altura} H0 Z`;
}

/** Coluna: base reta embaixo, ponta arredondada em cima. */
function coluna(x: number, topo: number, largura: number, base: number): string {
  const altura = base - topo;
  const r = Math.min(4, largura / 2, altura);
  return `M${x},${base} V${topo + r} A${r},${r} 0 0 1 ${x + r},${topo} H${x + largura - r} A${r},${r} 0 0 1 ${x + largura},${topo + r} V${base} Z`;
}

/** O menor numero "redondo" (1, 2, 5 vezes potencia de 10) que cabe o maior valor. */
function tetoRedondo(valor: number): number {
  if (valor <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  for (const passo of [1, 2, 5, 10]) if (passo * potencia >= valor) return passo * potencia;
  return 10 * potencia;
}

const NUMERO_CURTO = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/* ------------------------------------------------------ barras horizontais */

export type ItemDeBarra = { chave: string; rotulo: string; valor: number; valorEscrito: string };

/**
 * Ranking em barras. O rotulo mora em cima da barra, e nao ao lado: titulo de
 * texto do blog passa de 60 caracteres, e ao lado ele espremeria a barra ate
 * sumir no celular.
 */
export function BarrasHorizontais({ itens, rotulo }: { itens: ItemDeBarra[]; rotulo: string }) {
  const [ref, largura] = useLargura<HTMLOListElement>();
  const maior = Math.max(1, ...itens.map((i) => i.valor));

  return (
    <ol ref={ref} aria-label={rotulo} className="space-y-4">
      {itens.map((item) => {
        const comprimento = largura > 0 && item.valor > 0 ? Math.max(3, (item.valor / maior) * largura) : 0;
        return (
          <li key={item.chave}>
            <div className="flex items-baseline justify-between gap-4 text-[0.9375rem] leading-[1.45]">
              <span className="min-w-0 [overflow-wrap:anywhere] text-ink">{item.rotulo}</span>
              <span className="shrink-0 text-ink-strong tabular-nums">{item.valorEscrito}</span>
            </div>
            <svg aria-hidden="true" height={8} className="mt-1.5 block w-full">
              {comprimento > 0 && <path d={barraHorizontal(comprimento, 8)} className="fill-accent-vivid" />}
            </svg>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------ graficos de tempo (base) */

export type Ponto = {
  chave: string;
  /** Rotulo por extenso, para a leitura e a tabela ("9 de setembro"). */
  rotulo: string;
  /** Rotulo do eixo ("9 set."). */
  rotuloCurto: string;
  /** null = sem dado guardado (nao e zero). */
  valor: number | null;
  valorEscrito: string;
};

/**
 * O que os dois graficos de tempo dividem: medida, leitura do ponto sob o
 * dedo ou o mouse, setas do teclado e a tabela equivalente.
 *
 * A leitura fica numa linha de texto ACIMA do grafico, e nao num balao sobre
 * ele: no celular o balao cairia debaixo do dedo que o chamou. Sem interacao,
 * ela mostra o ponto mais recente — o numero que se procura primeiro.
 */
function GraficoDeTempo({
  pontos,
  rotulo,
  cabecalhos,
  altura,
  indiceNoX,
  desenhar,
}: {
  pontos: Ponto[];
  rotulo: string;
  cabecalhos: readonly [string, string];
  altura: number;
  indiceNoX: (x: number, largura: number) => number;
  desenhar: (largura: number, destaque: number | null) => ReactNode;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [destaque, setDestaque] = useState<number | null>(null);
  const ultimo = pontos.length - 1;
  const lido = pontos[destaque ?? ultimo];

  const limitar = (i: number) => Math.max(0, Math.min(ultimo, i));

  function aoMoverPonteiro(e: React.PointerEvent<HTMLDivElement>) {
    const caixa = e.currentTarget.getBoundingClientRect();
    setDestaque(limitar(indiceNoX(e.clientX - caixa.left, caixa.width)));
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    const atual = destaque ?? ultimo;
    let proximo: number;
    if (e.key === "ArrowLeft") proximo = atual - 1;
    else if (e.key === "ArrowRight") proximo = atual + 1;
    else if (e.key === "Home") proximo = 0;
    else if (e.key === "End") proximo = ultimo;
    else return;
    e.preventDefault();
    setDestaque(limitar(proximo));
  }

  return (
    <figure>
      <p aria-live="polite" className="min-h-[1.6rem] text-[0.9375rem] leading-[1.6] text-ink">
        {lido && (
          <>
            <span className="text-muted">{lido.rotulo}: </span>
            <span className="font-medium text-ink-strong">{lido.valorEscrito}</span>
          </>
        )}
      </p>
      <div
        ref={ref}
        role="group"
        tabIndex={0}
        aria-label={`${rotulo}. Use as setas para ler cada ponto.`}
        onPointerMove={aoMoverPonteiro}
        onPointerDown={aoMoverPonteiro}
        onPointerLeave={() => setDestaque(null)}
        onBlur={() => setDestaque(null)}
        onKeyDown={aoTeclar}
        // pan-y: arrastar na horizontal le o grafico, na vertical rola a pagina
        className="mt-2 touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        style={{ height: altura }}
      >
        {largura > 0 && desenhar(largura, destaque)}
      </div>
      <details className="mt-2">
        <summary className="sublinha inline-flex min-h-[44px] cursor-pointer items-center text-[0.9375rem] text-accent hover:text-accent-deep">
          Ver os mesmos números em tabela
        </summary>
        <div className="max-h-[22rem] overflow-y-auto rounded-md border border-rule">
          <table className="w-full text-left text-[0.9375rem]">
            <thead className="sticky top-0 bg-surface text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{cabecalhos[0]}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{cabecalhos[1]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {pontos.map((p) => (
                <tr key={p.chave}>
                  <td className="px-3 py-2 text-ink">{p.rotulo}</td>
                  <td className="px-3 py-2 text-right text-ink-strong tabular-nums">{p.valorEscrito}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/* ------------------------------------------------------------ linha diaria */

const LINHA_ALTURA = 180;
const LINHA_TOPO = 24;
const LINHA_EIXO = 22;
const LINHA_MARGEM_DIREITA = 6;
const LINHA_MARGEM_ESQUERDA = 4;

export function LinhaDiaria({ pontos, rotulo }: { pontos: Ponto[]; rotulo: string }) {
  const n = pontos.length;
  const passo = (largura: number) => (n > 1 ? (largura - LINHA_MARGEM_ESQUERDA - LINHA_MARGEM_DIREITA) / (n - 1) : 0);
  const xDe = (i: number, largura: number) =>
    n > 1 ? LINHA_MARGEM_ESQUERDA + i * passo(largura) : largura / 2;

  return (
    <GraficoDeTempo
      pontos={pontos}
      rotulo={rotulo}
      cabecalhos={["Dia", "Pessoas"]}
      altura={LINHA_ALTURA}
      indiceNoX={(x, largura) => (n > 1 ? Math.round((x - LINHA_MARGEM_ESQUERDA) / passo(largura)) : 0)}
      desenhar={(largura, destaque) => {
        const base = LINHA_ALTURA - LINHA_EIXO;
        const alturaUtil = base - LINHA_TOPO;
        const teto = tetoRedondo(Math.max(0, ...pontos.map((p) => p.valor ?? 0)));
        const yDe = (v: number) => base - (v / teto) * alturaUtil;

        // Dia sem dado guardado interrompe a linha em vez de liga-la por cima:
        // uma reta atravessando o buraco desenharia visitas que ninguem mediu.
        const trechos: { x: number; y: number }[][] = [];
        let trechoAtual: { x: number; y: number }[] = [];
        pontos.forEach((p, i) => {
          if (p.valor === null) {
            if (trechoAtual.length) trechos.push(trechoAtual);
            trechoAtual = [];
            return;
          }
          trechoAtual.push({ x: xDe(i, largura), y: yDe(p.valor) });
        });
        if (trechoAtual.length) trechos.push(trechoAtual);
        const caminhoDe = (t: { x: number; y: number }[]) =>
          t.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
        const traco = trechos.map(caminhoDe).join(" ");
        const final = trechos.at(-1)?.at(-1);
        const destacado = destaque === null || pontos[destaque]?.valor == null ? null : destaque;

        return (
          <svg aria-hidden="true" width={largura} height={LINHA_ALTURA} className="block overflow-visible">
            {/* grade: base, meio e teto; so o teto leva numero */}
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={0} x2={largura} y1={yDe(teto * f)} y2={yDe(teto * f)} className="stroke-rule" strokeWidth={1} />
            ))}
            <text x={0} y={yDe(teto) - 6} className="fill-muted text-[11px] tabular-nums">
              {NUMERO_CURTO.format(teto)}
            </text>

            {final && (
              <>
                {trechos.map((t) => (
                  <path
                    key={t[0].x}
                    d={`${caminhoDe(t)} L${t[t.length - 1].x.toFixed(1)},${base} L${t[0].x.toFixed(1)},${base} Z`}
                    className="fill-accent-vivid/10"
                  />
                ))}
                <path
                  d={traco}
                  fill="none"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="stroke-accent-vivid"
                />
                {destacado === null && (
                  <circle cx={final.x} cy={final.y} r={4} strokeWidth={2} className="fill-accent-vivid stroke-paper" />
                )}
              </>
            )}

            {destacado !== null && (
              <>
                <line
                  x1={xDe(destacado, largura)}
                  x2={xDe(destacado, largura)}
                  y1={LINHA_TOPO}
                  y2={base}
                  strokeWidth={1}
                  className="stroke-ink/40"
                />
                <circle
                  cx={xDe(destacado, largura)}
                  cy={yDe(pontos[destacado].valor ?? 0)}
                  r={4}
                  strokeWidth={2}
                  className="fill-accent-vivid stroke-paper"
                />
              </>
            )}

            <text x={0} y={LINHA_ALTURA - 4} className="fill-muted text-[11px]">
              {pontos[0]?.rotuloCurto}
            </text>
            {n > 1 && (
              <text x={largura} y={LINHA_ALTURA - 4} textAnchor="end" className="fill-muted text-[11px]">
                {pontos[n - 1].rotuloCurto}
              </text>
            )}
          </svg>
        );
      }}
    />
  );
}

/* --------------------------------------------------------- colunas por mes */

const COLUNAS_ALTURA = 200;
const COLUNAS_TOPO = 40;
const COLUNAS_EIXO = 22;

/**
 * Cliques por mes com uma marca vertical no mes da mudanca do site.
 *
 * So dois valores levam numero em cima da coluna: o maior e o mais recente.
 * Numero em toda coluna, com 16 meses em 320px, vira um borrao que ninguem le;
 * o resto esta na leitura e na tabela.
 */
export function ColunasMensais({
  pontos,
  marca,
  rotulo,
  rotuloDaMarca,
}: {
  pontos: Ponto[];
  /** `chave` do ponto onde a marca cai, ou null. */
  marca: string | null;
  rotulo: string;
  rotuloDaMarca: string;
}) {
  const n = pontos.length;

  return (
    <GraficoDeTempo
      pontos={pontos}
      rotulo={rotulo}
      cabecalhos={["Mês", "Cliques"]}
      altura={COLUNAS_ALTURA}
      indiceNoX={(x, largura) => Math.floor(x / (largura / n))}
      desenhar={(largura, destaque) => {
        const base = COLUNAS_ALTURA - COLUNAS_EIXO;
        const alturaUtil = base - COLUNAS_TOPO;
        const valores = pontos.map((p) => p.valor ?? 0);
        const teto = tetoRedondo(Math.max(0, ...valores));
        const banda = largura / n;
        const espessura = Math.min(24, Math.max(4, banda * 0.6));
        const topoDe = (v: number) => base - (v / teto) * alturaUtil;
        const indiceDoMaior = valores.indexOf(Math.max(...valores));
        const rotulados = new Set([indiceDoMaior, n - 1]);
        const indiceDaMarca = marca ? pontos.findIndex((p) => p.chave === marca) : -1;
        const xDaMarca = indiceDaMarca * banda;

        return (
          <svg aria-hidden="true" width={largura} height={COLUNAS_ALTURA} className="block overflow-visible">
            <line x1={0} x2={largura} y1={base} y2={base} strokeWidth={1} className="stroke-rule" />

            {pontos.map((p, i) => {
              if (p.valor === null) return null;
              const x = i * banda + (banda - espessura) / 2;
              const topo = p.valor > 0 ? Math.min(topoDe(p.valor), base - 2) : base;
              return (
                <g key={p.chave}>
                  {p.valor > 0 && (
                    <path
                      d={coluna(x, topo, espessura, base)}
                      className={i === destaque ? "fill-accent" : "fill-accent-vivid"}
                    />
                  )}
                  {rotulados.has(i) && p.valor > 0 && (
                    <text x={x + espessura / 2} y={topo - 6} textAnchor="middle" className="fill-ink-strong text-[11px] tabular-nums">
                      {NUMERO_CURTO.format(p.valor)}
                    </text>
                  )}
                </g>
              );
            })}

            {indiceDaMarca >= 0 && (
              <>
                <line x1={xDaMarca} x2={xDaMarca} y1={14} y2={base} strokeWidth={1} className="stroke-ink-strong" />
                <text
                  x={xDaMarca > largura * 0.6 ? xDaMarca - 6 : xDaMarca + 6}
                  y={12}
                  textAnchor={xDaMarca > largura * 0.6 ? "end" : "start"}
                  className="fill-ink text-[12px]"
                >
                  {rotuloDaMarca}
                </text>
              </>
            )}

            <text x={0} y={COLUNAS_ALTURA - 4} className="fill-muted text-[11px]">
              {pontos[0]?.rotuloCurto}
            </text>
            {n > 1 && (
              <text x={largura} y={COLUNAS_ALTURA - 4} textAnchor="end" className="fill-muted text-[11px]">
                {pontos[n - 1].rotuloCurto}
              </text>
            )}
          </svg>
        );
      }}
    />
  );
}
