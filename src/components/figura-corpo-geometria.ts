import { DETALHE_D, SILHUETA_D } from "./silhueta-corpo-path";
import {
  COLUNA_PERFIL_X,
  COLUNA_PERFIL_X0,
  SILHUETA_PERFIL_D,
} from "./silhueta-perfil-path";

/**
 * Geometria da figura humana esquematica do projeto, nas duas vistas.
 *
 * Aqui mora TUDO o que difere entre a vista frontal e a de perfil: contorno,
 * coluna, articulacoes, cadeia e as medidas do prumo. O componente
 * (figura-corpo.tsx) so desenha o que este arquivo descreve, entao corrigir
 * uma silhueta ou mover uma articulacao e' mexer em um lugar so.
 *
 * As duas vistas partilham o mesmo viewBox de 560 de altura e o mesmo
 * intervalo de corpo (24,2 a 534,7): renderizadas com a mesma altura CSS,
 * as duas figuras tem exatamente a mesma altura de corpo. Os contornos sao
 * gerados, nao desenhados a mao (ver silhueta-corpo-path.ts e
 * silhueta-perfil-path.ts): laco fechado sobre a LINHA DE CENTRO do traco da
 * referencia.
 *
 * Esquematica do comeco ao fim: vertebra e' retangulo arredondado, disco e'
 * um traco, articulacao e' anel com ponto, silhueta e' contorno unico sem
 * volume. Nada de anatomia desenhada dentro do contorno.
 */

const n = (v: number) => Number(v.toFixed(1));

export type Pt = { x: number; y: number };

/** Vertebra ja posicionada: centro, medida e giro (0 na frontal). */
export type Vertebra = {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  giro: number;
};

/** Disco entre duas vertebras: um traco no vao, com o mesmo giro. */
export type Disco = { x: number; y: number; meia: number; giro: number };

export type Junta = {
  chave: string;
  x: number;
  y: number;
  r: number;
  dur: number;
  fase: number;
};

export type Segmento = { a: Pt; b: Pt; dur: number; fase: number };

export type Vista = {
  /** Largura do viewBox; a altura e' sempre 560. */
  largura: number;
  /** x do fio de prumo. */
  prumo: number;
  /** Extremos da linha do chao. */
  chao: [number, number];
  /** y dos niveis horizontais do prumo (cinturas). */
  niveis: number[];
  /** Contorno do corpo, laco fechado. */
  silhueta: string;
  /** Tracos internos curtos (dedos, polegar, virilha); so a vista frontal tem. */
  detalhe?: string;
  vertebras: Vertebra[];
  discos: Disco[];
  /** Sacro: retangulo na base da coluna. */
  sacro: { x: number; y: number; w: number; h: number; giro: number };
  juntas: Junta[];
  cadeia: Segmento[];
};

/* ===============================================================
   VISTA FRONTAL
   =============================================================== */

/** Eixo do corpo, medido no centro do tronco da silhueta frontal. */
const EIXO = 110.5;

/**
 * Cada regiao distribui suas vertebras num bloco [y0, y1]: a fatia de cada
 * uma e' proporcional a um peso senoidal, entao o disco (fatia menos corpo
 * vertebral) abre ou fecha no meio da regiao. abertura > 0 abre no meio
 * (lordose), < 0 fecha (cifose).
 *
 * De frente a coluna nao tem curvatura lateral, e fingir uma seria desenhar
 * um desvio que a clinica trata. Entao a coluna fica exatamente sobre o fio
 * de prumo (que e' o que a posturologia procura) e a curvatura sagital e'
 * sugerida por ritmo. Na vista de perfil ela e' desenhada de verdade, medida
 * na referencia.
 */
type RegiaoFrontal = {
  qtd: number;
  y0: number;
  y1: number;
  w0: number;
  w1: number;
  h0: number;
  h1: number;
  abertura: number;
  rx: number;
};

const REGIOES_FRONTAL: RegiaoFrontal[] = [
  { qtd: 7, y0: 90, y1: 118, w0: 6.4, w1: 8.4, h0: 1.9, h1: 1.9, abertura: 0.35, rx: 0.9 },
  { qtd: 12, y0: 122, y1: 220, w0: 9.4, w1: 12.4, h0: 4.2, h1: 4.8, abertura: -0.3, rx: 1.5 },
  { qtd: 5, y0: 225, y1: 272, w0: 13.6, w1: 16, h0: 6, h1: 6, abertura: 0.35, rx: 2 },
];

function colunaFrontal(): Vertebra[] {
  const out: Vertebra[] = [];
  for (const r of REGIOES_FRONTAL) {
    const pesos = Array.from(
      { length: r.qtd },
      (_, i) => 1 + r.abertura * Math.sin((Math.PI * (i + 0.5)) / r.qtd),
    );
    const soma = pesos.reduce((a, b) => a + b, 0);
    const escala = (r.y1 - r.y0) / soma;
    let topo = r.y0;
    pesos.forEach((p, i) => {
      const fatia = p * escala;
      const t = r.qtd === 1 ? 0 : i / (r.qtd - 1);
      out.push({
        x: EIXO,
        y: topo + fatia / 2,
        w: r.w0 + (r.w1 - r.w0) * t,
        h: r.h0 + (r.h1 - r.h0) * t,
        rx: r.rx,
        giro: 0,
      });
      topo += fatia;
    });
  }
  return out;
}

/**
 * Os pares nao ganham lado: numa vista frontal a esquerda do desenho e' a
 * direita de quem esta ali. Cada par e' o mesmo ponto espelhado no eixo. Os
 * pontos saem das corridas de pixel da mascara do PNG (ombro na largura do
 * deltoide, cotovelo no meio do braco, quadril na pelve, joelho entre
 * quadril e tornozelo, tornozelo no ponto mais estreito da perna).
 */
const PARES = [
  { chave: "ombro", dx: 56, y: 149.5, r: 5.5, dur: 3.7, fase: [0.0, 1.9] },
  { chave: "cotovelo", dx: 73.8, y: 250.5, r: 5.2, dur: 4.6, fase: [3.1, 0.8] },
  { chave: "quadril", dx: 27.6, y: 309.5, r: 5.5, dur: 3.9, fase: [1.2, 2.7] },
  { chave: "joelho", dx: 31.7, y: 408, r: 5.5, dur: 4.8, fase: [0.5, 2.2] },
  { chave: "tornozelo", dx: 26.1, y: 489.3, r: 5, dur: 4.1, fase: [3.6, 1.5] },
] as const;

const NO_EIXO = [
  { chave: "occipital", y: 78, r: 4.2, dur: 4.2, fase: 0.4 },
  { chave: "sacro", y: 281, r: 4.2, dur: 4.4, fase: 2.5 },
] as const;

function montarFrontal(): Vista {
  const vertebras = colunaFrontal();
  const discos: Disco[] = [];
  vertebras.forEach((v, i) => {
    const seg = vertebras[i + 1];
    if (!seg) return;
    const vao = seg.y - seg.h / 2 - (v.y + v.h / 2);
    if (vao > 1.2) {
      discos.push({ x: EIXO, y: v.y + v.h / 2 + vao / 2, meia: v.w * 0.31, giro: 0 });
    }
  });

  const juntas: Junta[] = [
    ...NO_EIXO.map((a) => ({ chave: a.chave, x: EIXO, y: a.y, r: a.r, dur: a.dur, fase: a.fase })),
    ...PARES.flatMap((p) =>
      [-1, 1].map((s, i) => ({
        chave: `${p.chave}-${i}`,
        x: EIXO + s * p.dx,
        y: p.y,
        r: p.r,
        dur: p.dur,
        fase: p.fase[i],
      })),
    ),
  ];

  const j = (chave: string): Pt => {
    const k = juntas.find((q) => q.chave === chave);
    if (!k) throw new Error(`junta desconhecida: ${chave}`);
    return { x: k.x, y: k.y };
  };
  /** Ponto da coluna na altura y: na frontal a coluna esta sobre o eixo. */
  const naColuna = (y: number): Pt => ({ x: EIXO, y });

  /**
   * Cadeia: cada cintura ligada a coluna e cada membro descendo em serie.
   * Duracao e fase por segmento, escalonadas, para o sinal descer a cadeia
   * em vez de piscar tudo junto.
   */
  const cadeia: Segmento[] = [
    { a: j("occipital"), b: naColuna(90), dur: 6.5, fase: 0 },
    { a: j("ombro-0"), b: naColuna(122), dur: 6.5, fase: 0.5 },
    { a: j("ombro-1"), b: naColuna(122), dur: 6.5, fase: 0.9 },
    { a: j("ombro-0"), b: j("cotovelo-0"), dur: 6.5, fase: 1.7 },
    { a: j("ombro-1"), b: j("cotovelo-1"), dur: 6.5, fase: 2.1 },
    { a: j("sacro"), b: j("quadril-0"), dur: 7, fase: 0.4 },
    { a: j("sacro"), b: j("quadril-1"), dur: 7, fase: 0.8 },
    { a: j("quadril-0"), b: j("joelho-0"), dur: 7, fase: 1.7 },
    { a: j("quadril-1"), b: j("joelho-1"), dur: 7, fase: 2.1 },
    { a: j("joelho-0"), b: j("tornozelo-0"), dur: 7, fase: 3.0 },
    { a: j("joelho-1"), b: j("tornozelo-1"), dur: 7, fase: 3.4 },
  ];

  return {
    largura: 221,
    prumo: EIXO,
    chao: [50, 171],
    niveis: PARES.filter((p) => p.chave === "ombro" || p.chave === "quadril").map((p) => p.y),
    silhueta: SILHUETA_D,
    detalhe: DETALHE_D,
    vertebras,
    discos,
    sacro: { x: EIXO, y: 282, w: 15, h: 16, giro: 0 },
    juntas,
    cadeia,
  };
}

/* ===============================================================
   VISTA DE PERFIL
   =============================================================== */

/** Prumo sagital, medido no trocanter da silhueta de perfil. */
const PRUMO_PERFIL = 56;

/** x da linha de centro da coluna em y, interpolado na curva medida. */
function xColuna(y: number): number {
  const t = y - COLUNA_PERFIL_X0;
  const i = Math.max(0, Math.min(COLUNA_PERFIL_X.length - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i));
  return COLUNA_PERFIL_X[i] + (COLUNA_PERFIL_X[i + 1] - COLUNA_PERFIL_X[i]) * f;
}

/** Angulo da tangente da coluna em relacao a vertical, em graus. */
function giroColuna(y: number, h = 3): number {
  return (Math.atan2(xColuna(y + h) - xColuna(y - h), 2 * h) * 180) / Math.PI;
}

/**
 * Mesmas regioes e mesmos tamanhos da frontal, espacamento uniforme: aqui a
 * curvatura e' real (a linha de centro foi medida na mascara da referencia),
 * entao nao ha por que sugeri-la pelo ritmo dos discos.
 */
const REGIOES_PERFIL = [
  { qtd: 7, y0: 90, y1: 118, w0: 6.4, w1: 8.4, h0: 1.9, h1: 1.9, rx: 0.9 },
  { qtd: 12, y0: 122, y1: 220, w0: 9.4, w1: 12.4, h0: 4.2, h1: 4.8, rx: 1.5 },
  { qtd: 5, y0: 225, y1: 272, w0: 13.6, w1: 16, h0: 6, h1: 6, rx: 2 },
];

function montarPerfil(): Vista {
  const vertebras: Vertebra[] = [];
  for (const r of REGIOES_PERFIL) {
    const fatia = (r.y1 - r.y0) / r.qtd;
    for (let i = 0; i < r.qtd; i++) {
      const t = r.qtd === 1 ? 0 : i / (r.qtd - 1);
      const y = r.y0 + fatia * (i + 0.5);
      vertebras.push({
        x: xColuna(y),
        y,
        w: r.w0 + (r.w1 - r.w0) * t,
        h: r.h0 + (r.h1 - r.h0) * t,
        rx: r.rx,
        giro: giroColuna(y),
      });
    }
  }

  const discos: Disco[] = [];
  vertebras.forEach((v, i) => {
    const seg = vertebras[i + 1];
    if (!seg) return;
    const vao = seg.y - seg.h / 2 - (v.y + v.h / 2);
    if (vao > 1.2) {
      const y = v.y + v.h / 2 + vao / 2;
      discos.push({ x: xColuna(y), y, meia: v.w * 0.31, giro: giroColuna(y) });
    }
  });

  /**
   * De perfil so ha um lado. Ombro no terco posterior da profundidade do
   * tronco, cotovelo no meio (o braco cai ao lado do corpo), trocanter,
   * joelho e maleolo no centro do segmento. Os y sao os MESMOS da frontal,
   * para as linhas de referencia do hero cruzarem as duas figuras na mesma
   * articulacao.
   */
  const juntas: Junta[] = [
    { chave: "occipital", x: 50, y: 78, r: 4.2, dur: 4.2, fase: 0.4 },
    { chave: "sacro", x: 41, y: 281, r: 4.2, dur: 4.4, fase: 2.5 },
    { chave: "ombro", x: 41, y: 149.5, r: 5.5, dur: 3.7, fase: 0 },
    { chave: "cotovelo", x: 60, y: 250.5, r: 5.2, dur: 4.6, fase: 3.1 },
    { chave: "quadril", x: 56.5, y: 309.5, r: 5.5, dur: 3.9, fase: 1.2 },
    { chave: "joelho", x: 50, y: 408, r: 5.5, dur: 4.8, fase: 0.5 },
    { chave: "tornozelo", x: 46, y: 489.3, r: 5, dur: 4.1, fase: 3.6 },
  ];
  const j = (chave: string): Pt => {
    const k = juntas.find((q) => q.chave === chave);
    if (!k) throw new Error(`junta desconhecida: ${chave}`);
    return { x: k.x, y: k.y };
  };
  const naColuna = (y: number): Pt => ({ x: xColuna(y), y });

  const cadeia: Segmento[] = [
    { a: j("occipital"), b: naColuna(90), dur: 6.5, fase: 0 },
    { a: j("ombro"), b: naColuna(122), dur: 6.5, fase: 0.5 },
    { a: j("ombro"), b: j("cotovelo"), dur: 6.5, fase: 1.7 },
    { a: j("sacro"), b: j("quadril"), dur: 7, fase: 0.4 },
    { a: j("quadril"), b: j("joelho"), dur: 7, fase: 1.7 },
    { a: j("joelho"), b: j("tornozelo"), dur: 7, fase: 3.0 },
  ];

  return {
    largura: 118,
    prumo: PRUMO_PERFIL,
    chao: [16.1, 101.9],
    niveis: [149.5, 309.5],
    silhueta: SILHUETA_PERFIL_D,
    vertebras,
    discos,
    /** Inclinado para tras, como no plano sagital. */
    sacro: { x: 43.5, y: 283, w: 9, h: 16, giro: -29 },
    juntas,
    cadeia,
  };
}

/**
 * Trama de leitura: as alturas das linhas que atravessam o corpo na camada
 * "faixas". Cobrem o intervalo do corpo (24,2 a 534,7) com passo constante;
 * o recorte pelo contorno e' feito no desenho, por clipPath, entao aqui basta
 * a altura de cada uma.
 *
 * O passo e' contado para a figura PEQUENA, que e' onde a trama vive: 16
 * unidades dao 32 linhas, e numa figura de 234px de altura elas caem a 6,7px
 * uma da outra. Passo menor (11) foi testado e fecha a trama: de longe vira
 * uma mancha cinza dentro do contorno em vez de linhas.
 */
export const FAIXAS_Y: number[] = Array.from(
  { length: Math.floor((534.7 - 24.2) / 16) + 1 },
  (_, i) => Number((30 + i * 16).toFixed(1)),
).filter((y) => y < 530);

export type NomeVista = "frontal" | "perfil";

/** As cinco camadas do desenho, na ordem em que sao pintadas. */
export type CamadaFigura =
  | "prumo"
  | "silhueta"
  | "coluna"
  | "cadeia"
  | "articulacoes"
  | "faixas";

export const VISTAS: Record<NomeVista, Vista> = {
  frontal: montarFrontal(),
  perfil: montarPerfil(),
};

export { n as arredondar };
