"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A boia da anotacao do hero: o texto flutua num raio pequeno em volta do
 * repouso e o fio gira e estica para continuar preso ao anel e ao texto. O
 * anel fica fora daqui, parado no ponto.
 *
 * Por que Web Animations, e nao CSS: a versao anterior animava dois numeros
 * registrados (@property --boia-x/--boia-y) e tirava deles os transforms do
 * texto e do fio com atan2() e hypot(). Animacao de propriedade customizada
 * nao roda no compositor: era um recalculo de estilo por quadro na thread
 * principal, e o texto, sem camada propria, era repintado a cada quadro e
 * encaixado no pixel inteiro. A uns 2px/s isso aparecia como degraus: um
 * terco dos quadros parado e saltos de 1px.
 *
 * Aqui o caminho inteiro e' calculado uma vez, em amostras de 50ms, e vira
 * duas animacoes de `transform` com valores finais em px (sem var(), sem
 * calc()): uma no texto, outra no fio. Animacao de transform pura roda no
 * compositor, a camada do texto e' rasterizada uma vez e so desliza, em
 * subpixel. Entre amostras a interpolacao e' linear; o desvio do caminho
 * exato fica abaixo de 0,01px.
 *
 * O caminho e' o mesmo de antes: os mesmos pontos de parada, com o mesmo
 * ease-in-out por trecho, x num ciclo de 17s e y num de 11,33s (antes 11,3s,
 * ajustado para fechar 3 ciclos em 34s, que e' o laco das animacoes).
 *
 * Movimento reduzido: nada anima, a anotacao fica no repouso do CSS.
 */

type Parada = readonly [fracao: number, valor: number];

/** Deslocamento do texto em unidades de --a. Raio maximo: hypot(3,6; 2,8). */
const PARADAS_X: readonly Parada[] = [
  [0, 0],
  [0.14, 2.6],
  [0.31, -1.4],
  [0.47, 3.6],
  [0.63, -3.2],
  [0.81, 1.2],
  [1, 0],
];
const PARADAS_Y: readonly Parada[] = [
  [0, 0],
  [0.19, -2.4],
  [0.38, 1.6],
  [0.56, 2.8],
  [0.77, -1.8],
  [1, 0],
];

const LACO_MS = 34_000;
const CICLO_X_MS = LACO_MS / 2;
const CICLO_Y_MS = LACO_MS / 3;
const PASSO_MS = 50;

/** Geometria do fio, em unidades de --a (ver ANOTACAO em globals.css). */
const RAIO_DO_ANEL = 11;
const FIO = {
  ciatica: { alcance: 63, comprimento: 52 },
  lombar: { alcance: 35, comprimento: 24 },
} as const;

/** cubic-bezier(0.42, 0, 0.58, 1), o ease-in-out do CSS. */
function easeInOut(p: number): number {
  const x1 = 0.42;
  const x2 = 0.58;
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const meio = (lo + hi) / 2;
    if (bx(meio) < p) lo = meio;
    else hi = meio;
  }
  return by((lo + hi) / 2);
}

function valorEm(paradas: readonly Parada[], fracao: number): number {
  for (let i = 1; i < paradas.length; i++) {
    const [f0, v0] = paradas[i - 1];
    const [f1, v1] = paradas[i];
    if (fracao <= f1) return v0 + (v1 - v0) * easeInOut((fracao - f0) / (f1 - f0));
  }
  return paradas[paradas.length - 1][1];
}

function quadrosDoCaminho(lado: "ciatica" | "lombar", a: number) {
  const { alcance, comprimento } = FIO[lado];
  const texto: Keyframe[] = [];
  const fio: Keyframe[] = [];
  for (let t = 0; t <= LACO_MS; t += PASSO_MS) {
    const x = valorEm(PARADAS_X, (t % CICLO_X_MS) / CICLO_X_MS);
    const y = valorEm(PARADAS_Y, (t % CICLO_Y_MS) / CICLO_Y_MS);
    const offset = t / LACO_MS;
    texto.push({ offset, transform: `translate(${(x * a).toFixed(3)}px, ${(y * a).toFixed(3)}px)` });
    // O fio gira em volta do centro do anel (RAIO_DO_ANEL antes da origem
    // dele) e estica do contorno ate 7 unidades antes do texto.
    const r = RAIO_DO_ANEL * a;
    const ang = lado === "ciatica" ? Math.atan2(y, alcance + x) : Math.atan2(-y, alcance - x);
    const esc = (Math.hypot(lado === "ciatica" ? alcance + x : alcance - x, y) - RAIO_DO_ANEL) / comprimento;
    const ida = lado === "ciatica" ? -r : r;
    fio.push({
      offset,
      transform: `translateX(${ida.toFixed(3)}px) rotate(${ang.toFixed(5)}rad) translateX(${(-ida).toFixed(3)}px) scaleX(${esc.toFixed(5)})`,
    });
  }
  return { texto, fio };
}

export function BoiaDaAnotacao({ lado, children }: { lado: "ciatica" | "lombar"; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const boia = ref.current;
    const anot = boia?.parentElement;
    const anel = anot?.querySelector<HTMLElement>(".pd-anot-anel");
    const texto = boia?.querySelector<HTMLElement>(".pd-anot-texto");
    const fio = boia?.querySelector<HTMLElement>(".pd-anot-fio");
    if (!boia || !anel || !texto || !fio || typeof texto.animate !== "function") return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animacoes: Animation[] = [];
    let a = 0;

    const parar = () => {
      animacoes.forEach((x) => x.cancel());
      animacoes = [];
    };

    const montar = () => {
      const novoA = anel.getBoundingClientRect().width / 22;
      if (reduzido.matches || novoA <= 0) {
        parar();
        a = 0;
        return;
      }
      if (animacoes.length && Math.abs(novoA - a) < 0.001) return;
      // Na troca de escala o laco continua do mesmo instante, sem salto.
      const instante = Number(animacoes[0]?.currentTime ?? 0);
      parar();
      a = novoA;
      const q = quadrosDoCaminho(lado, a);
      const opcoes: KeyframeAnimationOptions = { duration: LACO_MS, iterations: Infinity, easing: "linear" };
      animacoes = [texto.animate(q.texto, opcoes), fio.animate(q.fio, opcoes)];
      animacoes.forEach((x) => (x.currentTime = instante));
    };

    montar();
    const ro = new ResizeObserver(montar);
    ro.observe(anel);
    reduzido.addEventListener("change", montar);
    return () => {
      ro.disconnect();
      reduzido.removeEventListener("change", montar);
      parar();
    };
  }, [lado]);

  return (
    <span ref={ref} className="pd-anot-boia">
      {children}
    </span>
  );
}
