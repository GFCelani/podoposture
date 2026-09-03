import { SILHUETA_D } from "./silhueta-corpo-path";

/**
 * A peca grafica do hero: figura humana esquematica, de pe, vista frontal.
 *
 * A silhueta e' a vetorizacao de assets/silhueta-corpo.png (ver
 * silhueta-corpo-path.ts): laco unico fechado, nao redesenhado. Todo o resto
 * (coluna, articulacoes, cadeia, prumo) foi realinhado a ela por medida, nao
 * por estimativa: os pontos saem das corridas de pixel da propria mascara do
 * PNG (ombro na largura do deltoide, cotovelo no meio do braco, quadril na
 * pelve, joelho entre quadril e tornozelo, tornozelo no ponto mais estreito
 * da perna). Eixo do corpo em x = 110,5, medido no centro do tronco.
 *
 * Esquematica do comeco ao fim: vertebra e' retangulo arredondado, disco e'
 * um traco, articulacao e' anel com ponto, silhueta e' contorno unico sem
 * volume. Nada de anatomia desenhada dentro do contorno.
 *
 * De frente a coluna nao tem curvatura lateral, e fingir uma seria desenhar
 * um desvio que a clinica trata. Entao a coluna fica exatamente sobre o fio
 * de prumo (que e' o que a posturologia procura) e a curvatura sagital e'
 * sugerida por ritmo: os discos abrem no meio das lordoses (cervical e
 * lombar) e fecham no apice da cifose toracica, e o corpo vertebral cresce
 * de cima para baixo.
 *
 * viewBox 221 x 560 com width/height declarados: proporcao conhecida antes
 * do CSS, sem CLS. Um grupo por camada, para animar cada uma sozinha.
 */

const n = (v: number) => Number(v.toFixed(1));

type Pt = { x: number; y: number };

/** Eixo do corpo, medido no centro do tronco da silhueta. */
const EIXO = 110.5;

/* ---------------------------------------------------------------
   Coluna. Cada regiao distribui suas vertebras num bloco [y0, y1]:
   a fatia de cada uma e' proporcional a um peso senoidal, entao o
   disco (fatia menos corpo vertebral) abre ou fecha no meio da
   regiao. abertura > 0 abre no meio (lordose), < 0 fecha (cifose).
   --------------------------------------------------------------- */
type Regiao = {
  chave: "cervical" | "toracica" | "lombar";
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

const REGIOES: Regiao[] = [
  { chave: "cervical", qtd: 7, y0: 90, y1: 118, w0: 6.4, w1: 8.4, h0: 1.9, h1: 1.9, abertura: 0.35, rx: 0.9 },
  { chave: "toracica", qtd: 12, y0: 122, y1: 220, w0: 9.4, w1: 12.4, h0: 4.2, h1: 4.8, abertura: -0.3, rx: 1.5 },
  { chave: "lombar", qtd: 5, y0: 225, y1: 272, w0: 13.6, w1: 16, h0: 6, h1: 6, abertura: 0.35, rx: 2 },
];

type Vertebra = { y: number; w: number; h: number; rx: number };

function montarColuna(): Vertebra[] {
  const out: Vertebra[] = [];
  for (const r of REGIOES) {
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
        y: topo + fatia / 2,
        w: r.w0 + (r.w1 - r.w0) * t,
        h: r.h0 + (r.h1 - r.h0) * t,
        rx: r.rx,
      });
      topo += fatia;
    });
  }
  return out;
}

const VERTEBRAS = montarColuna();

/* ---------------------------------------------------------------
   Articulacoes. Os pares nao ganham lado: numa vista frontal a
   esquerda do desenho e' a direita de quem esta ali. Cada par e' o
   mesmo ponto espelhado no eixo.
   --------------------------------------------------------------- */
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

type Junta = { chave: string; x: number; y: number; r: number; dur: number; fase: number };

const JUNTAS: Junta[] = [
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

function junta(chave: string): Pt {
  const j = JUNTAS.find((k) => k.chave === chave);
  if (!j) throw new Error(`junta desconhecida: ${chave}`);
  return { x: j.x, y: j.y };
}

/** Ponto da coluna na altura y: a coluna esta sobre o eixo. */
const naColuna = (y: number): Pt => ({ x: EIXO, y });

/**
 * Cadeia: cada cintura ligada a coluna e cada membro descendo em serie.
 * Duracao e fase por segmento, escalonadas, para o sinal descer a cadeia em
 * vez de piscar tudo junto.
 */
const CADEIA: { a: Pt; b: Pt; dur: number; fase: number }[] = [
  { a: junta("occipital"), b: naColuna(90), dur: 6.5, fase: 0 },
  // cintura escapular: os dois ombros para o alto da toracica
  { a: junta("ombro-0"), b: naColuna(122), dur: 6.5, fase: 0.5 },
  { a: junta("ombro-1"), b: naColuna(122), dur: 6.5, fase: 0.9 },
  { a: junta("ombro-0"), b: junta("cotovelo-0"), dur: 6.5, fase: 1.7 },
  { a: junta("ombro-1"), b: junta("cotovelo-1"), dur: 6.5, fase: 2.1 },
  // cintura pelvica: o sacro para os dois quadris
  { a: junta("sacro"), b: junta("quadril-0"), dur: 7, fase: 0.4 },
  { a: junta("sacro"), b: junta("quadril-1"), dur: 7, fase: 0.8 },
  { a: junta("quadril-0"), b: junta("joelho-0"), dur: 7, fase: 1.7 },
  { a: junta("quadril-1"), b: junta("joelho-1"), dur: 7, fase: 2.1 },
  { a: junta("joelho-0"), b: junta("tornozelo-0"), dur: 7, fase: 3.0 },
  { a: junta("joelho-1"), b: junta("tornozelo-1"), dur: 7, fase: 3.4 },
];

const PAPEL = "var(--color-paper)";
const AZUL = "var(--color-accent-light)";
const VERDE = "var(--color-action)";

export function FiguraEsquematica({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 221 560"
      width={221}
      height={560}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A figura inteira respira; unico transform deste no'. */}
      <g
        className="figura-respira"
        style={{ transformBox: "view-box", transformOrigin: "110.5px 300px" }}
      >
        {/* Eixo de prumo: do alto ao chao, com marcas nas duas cinturas */}
        <g data-camada="prumo" stroke={PAPEL}>
          <line x1={EIXO} y1={4} x2={EIXO} y2={556} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 6" />
          {PARES.filter((p) => p.chave === "ombro" || p.chave === "quadril").map((p) => (
            <line
              key={p.chave}
              x1={EIXO - 16}
              y1={p.y}
              x2={EIXO + 16}
              y2={p.y}
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          ))}
          <line x1={50} y1={542} x2={171} y2={542} strokeOpacity={0.3} strokeWidth={1} />
        </g>

        {/* Silhueta: o contorno vetorizado, traco fino e preenchimento quase
            transparente. Mesma pesagem da silhueta anterior. */}
        <g data-camada="silhueta">
          <path
            d={SILHUETA_D}
            fill={PAPEL}
            fillOpacity={0.04}
            stroke={PAPEL}
            strokeOpacity={0.85}
            strokeWidth={1.4}
          />
        </g>

        {/* Cadeia: liga as articulacoes entre si e a coluna */}
        <g data-camada="cadeia" stroke={PAPEL} strokeOpacity={0.35} strokeWidth={0.9}>
          {CADEIA.map((c, i) => (
            <line key={i} x1={n(c.a.x)} y1={n(c.a.y)} x2={n(c.b.x)} y2={n(c.b.y)} />
          ))}
        </g>

        {/* Corrente: um ponto por segmento nasce numa ponta e morre na outra.
            Base em opacity 0, entao com movimento reduzido nao existe. */}
        <g data-camada="corrente" fill={PAPEL} stroke="none">
          {CADEIA.map((c, i) => (
            <circle
              key={i}
              className="corrente"
              cx={n(c.a.x)}
              cy={n(c.a.y)}
              r={1.7}
              style={{
                ["--dx" as string]: `${n(c.b.x - c.a.x)}px`,
                ["--dy" as string]: `${n(c.b.y - c.a.y)}px`,
                ["--dur" as string]: `${c.dur}s`,
                ["--fase" as string]: `${c.fase}s`,
              }}
            />
          ))}
        </g>

        {/* Coluna: 24 retangulos sobre o eixo, discos como tracos no vao,
            sacro como retangulo na base */}
        <g data-camada="coluna">
          {VERTEBRAS.map((v, i) => {
            const seg = VERTEBRAS[i + 1];
            const vao = seg ? seg.y - seg.h / 2 - (v.y + v.h / 2) : 0;
            return (
              <g key={i}>
                <rect
                  x={n(EIXO - v.w / 2)}
                  y={n(v.y - v.h / 2)}
                  width={n(v.w)}
                  height={n(v.h)}
                  rx={v.rx}
                  fill={AZUL}
                  fillOpacity={0.85}
                />
                <rect
                  className="vertebra-acende"
                  x={n(EIXO - v.w / 2)}
                  y={n(v.y - v.h / 2)}
                  width={n(v.w)}
                  height={n(v.h)}
                  rx={v.rx}
                  fill={PAPEL}
                  style={{ ["--fase" as string]: `${n(i * 0.16)}s` }}
                />
                {seg && vao > 1.2 && (
                  <line
                    x1={n(EIXO - v.w * 0.31)}
                    y1={n(v.y + v.h / 2 + vao / 2)}
                    x2={n(EIXO + v.w * 0.31)}
                    y2={n(v.y + v.h / 2 + vao / 2)}
                    stroke={AZUL}
                    strokeOpacity={0.55}
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}
          <rect x={n(EIXO - 7.5)} y={274} width={15} height={16} rx={3} fill={AZUL} fillOpacity={0.55} />
        </g>

        {/* Articulacoes: anel com ponto e o sonar em verde */}
        <g data-camada="articulacoes">
          {JUNTAS.map((j) => (
            <g key={j.chave} data-articulacao={j.chave}>
              {[0, 1 / 2].map((t) => (
                <circle
                  key={t}
                  className="sonar-onda"
                  cx={n(j.x)}
                  cy={n(j.y)}
                  r={j.r}
                  stroke={VERDE}
                  strokeOpacity={0.75}
                  strokeWidth={0.9}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    ["--escala" as string]: 3.2,
                    ["--dur" as string]: `${j.dur}s`,
                    ["--fase" as string]: `${n(j.fase + t * j.dur)}s`,
                  }}
                />
              ))}
              <circle
                cx={n(j.x)}
                cy={n(j.y)}
                r={j.r}
                fill="var(--color-accent-deep)"
                fillOpacity={0.7}
                stroke={PAPEL}
                strokeOpacity={0.95}
                strokeWidth={1.3}
              />
              <circle
                className="sonar-ponto"
                cx={n(j.x)}
                cy={n(j.y)}
                r={j.r < 5 ? 1.7 : 2.2}
                fill={VERDE}
                style={{ ["--dur" as string]: `${j.dur}s`, ["--fase" as string]: `${j.fase}s` }}
              />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
