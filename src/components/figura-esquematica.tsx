/**
 * A peca grafica do hero: uma figura humana esquematica, de pe, em vista
 * lateral (de frente para a esquerda). E' lateral porque so nela a curvatura
 * da coluna existe de verdade: lordose cervical, cifose toracica, lordose
 * lombar, sacro inclinado. De frente, a coluna e' uma reta.
 *
 * Esquematica do comeco ao fim. Vertebra e' retangulo arredondado sobre a
 * tangente da curva; disco e' um traco; articulacao e' anel com ponto;
 * silhueta e' um contorno unico fechado, sem volume; o braco e' um segundo
 * contorno mais fraco por cima do tronco. Nada de anatomia desenhada: ja
 * se tentou duas vezes neste projeto e nao funcionou.
 *
 * Tudo nasce de numeros, nao de curvas ajustadas a mao. A linha media da
 * coluna e' x(y) por tres senos (um por curvatura); as 24 vertebras sao
 * amostradas dessa funcao, com o tamanho crescendo de cima para baixo.
 * O contorno e' Catmull-Rom sobre poucos pontos, como a silhueta da
 * secao 04.
 *
 * viewBox 240 x 560 com width/height declarados: proporcao conhecida antes
 * do CSS, sem CLS. Um grupo por camada, para animar cada uma sozinha.
 */

const n = (v: number) => Number(v.toFixed(1));

type Pt = { x: number; y: number };

/** Catmull-Rom para bezier cubica; fechado ou aberto. */
function curva(pts: Pt[], fechar = false): string {
  const P = fechar ? [...pts, pts[0], pts[1]] : pts;
  let d = `M ${n(P[0].x)} ${n(P[0].y)}`;
  for (let i = 0; i < P.length - 1 - (fechar ? 1 : 0); i++) {
    const p0 = P[i - 1] ?? P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] ?? p2;
    d += ` C ${n(p1.x + (p2.x - p0.x) / 6)} ${n(p1.y + (p2.y - p0.y) / 6)} ${n(
      p2.x - (p3.x - p1.x) / 6,
    )} ${n(p2.y - (p3.y - p1.y) / 6)} ${n(p2.x)} ${n(p2.y)}`;
  }
  if (fechar) d += " Z";
  return d;
}

/** Fio de prumo: passa pela orelha, pelo ombro e pelo quadril. */
const PRUMO = 126;

/* ---------------------------------------------------------------
   Coluna: linha media x(y). Anterior e' a esquerda (x menor).
   Cervical curva para a frente, toracica para tras, lombar para a
   frente; o sacro sai para tras. Amplitudes em unidades do viewBox.
   --------------------------------------------------------------- */
const EIXO = 131;
const CURVAS = [
  { de: 84, ate: 136, amp: -5 }, // lordose cervical
  { de: 136, ate: 232, amp: 9 }, // cifose toracica
  { de: 232, ate: 300, amp: -6 }, // lordose lombar
] as const;

function xColuna(y: number): number {
  for (const c of CURVAS) {
    if (y >= c.de && y <= c.ate) {
      return EIXO + c.amp * Math.sin((Math.PI * (y - c.de)) / (c.ate - c.de));
    }
  }
  return EIXO;
}

/** Inclinacao da tangente em graus (positivo = desce para tras). */
function anguloColuna(y: number): number {
  const dx = xColuna(y + 1) - xColuna(y - 1);
  return (Math.atan2(dx, 2) * 180) / Math.PI;
}

type Vertebra = { y: number; w: number; h: number; nivel: "c" | "t" | "l" };

/** 24 vertebras: 7 cervicais, 12 toracicas, 5 lombares. Crescem descendo. */
const VERTEBRAS: Vertebra[] = [
  ...Array.from({ length: 7 }, (_, i) => ({
    y: 90 + i * 6.4,
    w: 7.5 + i * 0.3,
    h: 3.6,
    nivel: "c" as const,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    y: 138 + i * 8.4,
    w: 10 + i * 0.4,
    h: 5 + i * 0.12,
    nivel: "t" as const,
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    y: 242 + i * 11.5,
    w: 15 + i * 0.6,
    h: 7.4,
    nivel: "l" as const,
  })),
];

/* ---------------------------------------------------------------
   Articulacoes e cadeia.
   --------------------------------------------------------------- */
const ARTICULACOES = {
  occipital: { x: 129, y: 83 },
  ombro: { x: PRUMO, y: 130 },
  cotovelo: { x: 129, y: 222 },
  punho: { x: 116, y: 322 },
  sacro: { x: 146, y: 318 },
  quadril: { x: PRUMO, y: 306 },
  joelho: { x: 118, y: 420 },
  tornozelo: { x: 131, y: 530 },
} as const;

type Articulacao = keyof typeof ARTICULACOES;

/** Sonar: duracao e fase proprias por articulacao, nunca em unissono. */
const SONAR: Record<Articulacao, { dur: number; fase: number }> = {
  occipital: { dur: 4.2, fase: 0.4 },
  ombro: { dur: 3.7, fase: 1.9 },
  cotovelo: { dur: 4.6, fase: 3.1 },
  punho: { dur: 4.0, fase: 0.9 },
  sacro: { dur: 4.4, fase: 2.5 },
  quadril: { dur: 3.9, fase: 0.0 },
  joelho: { dur: 4.8, fase: 1.4 },
  tornozelo: { dur: 4.1, fase: 3.6 },
};

const A = ARTICULACOES;

/** Ritmo da corrente por segmento, na ordem de CADEIA. */
const CORRENTE = [
  { dur: 6.5, fase: 0.0 },
  { dur: 6.5, fase: 0.7 },
  { dur: 6.5, fase: 1.6 },
  { dur: 6.5, fase: 3.1 },
  { dur: 7.0, fase: 0.3 },
  { dur: 7.0, fase: 1.4 },
  { dur: 7.0, fase: 2.4 },
  { dur: 7.0, fase: 4.0 },
];

/** Ligacoes: cada par e' um segmento da cadeia. */
const CADEIA: [Pt, Pt][] = [
  [A.occipital, { x: xColuna(90), y: 90 }],
  [A.ombro, { x: xColuna(138), y: 138 }],
  [A.ombro, A.cotovelo],
  [A.cotovelo, A.punho],
  [A.quadril, A.sacro],
  [A.sacro, { x: xColuna(290), y: 290 }],
  [A.quadril, A.joelho],
  [A.joelho, A.tornozelo],
];

/* ---------------------------------------------------------------
   Contornos. Sentido horario a partir do topo da cabeca.
   --------------------------------------------------------------- */
const SILHUETA: Pt[] = [
  { x: 116, y: 20 },
  { x: 138, y: 30 },
  { x: 148, y: 56 },
  { x: 142, y: 80 },
  { x: 136, y: 96 },
  { x: 138, y: 114 },
  { x: 152, y: 136 },
  { x: 158, y: 182 },
  { x: 150, y: 228 },
  { x: 141, y: 264 },
  { x: 152, y: 300 },
  { x: 156, y: 334 },
  { x: 148, y: 372 },
  { x: 138, y: 420 },
  { x: 146, y: 462 },
  { x: 136, y: 506 },
  { x: 142, y: 538 },
  { x: 140, y: 551 },
  { x: 72, y: 551 },
  { x: 74, y: 542 },
  { x: 100, y: 532 },
  { x: 110, y: 500 },
  { x: 106, y: 452 },
  { x: 104, y: 420 },
  { x: 100, y: 372 },
  { x: 98, y: 332 },
  { x: 94, y: 292 },
  { x: 92, y: 252 },
  { x: 90, y: 204 },
  { x: 94, y: 162 },
  { x: 102, y: 136 },
  { x: 108, y: 112 },
  { x: 100, y: 96 },
  { x: 94, y: 78 },
  { x: 90, y: 56 },
  { x: 96, y: 32 },
];

/** Braco pendido ao lado do tronco: contorno proprio, mais fraco. */
const BRACO: Pt[] = [
  { x: 110, y: 128 },
  { x: 106, y: 154 },
  { x: 112, y: 190 },
  { x: 118, y: 222 },
  { x: 112, y: 262 },
  { x: 111, y: 318 },
  { x: 114, y: 344 },
  { x: 122, y: 344 },
  { x: 128, y: 318 },
  { x: 132, y: 262 },
  { x: 139, y: 222 },
  { x: 138, y: 180 },
  { x: 132, y: 142 },
  { x: 124, y: 128 },
];

const PAPEL = "var(--color-paper)";
const AZUL = "var(--color-accent-light)";
const VERDE = "var(--color-action)";

export function FiguraEsquematica({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 560"
      width={240}
      height={560}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 3: a figura inteira respira; unico transform deste no'. Origem no
          centro do viewBox para os pes nao sairem do chao visivelmente. */}
      <g className="figura-respira" style={{ transformBox: "view-box", transformOrigin: "120px 300px" }}>
      {/* 2.5 eixo de prumo: do topo ao chao, com marcas nas duas cinturas */}
      <g data-camada="prumo" stroke={PAPEL}>
        <line x1={PRUMO} y1={4} x2={PRUMO} y2={556} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 6" />
        {[A.ombro.y, A.quadril.y].map((y) => (
          <line key={y} x1={PRUMO - 16} y1={y} x2={PRUMO + 16} y2={y} strokeOpacity={0.45} strokeWidth={1} />
        ))}
        <line x1={60} y1={552} x2={176} y2={552} strokeOpacity={0.3} strokeWidth={1} />
      </g>

      {/* 2.1 silhueta: contorno unico, fino, quase sem preenchimento */}
      <g data-camada="silhueta">
        <path d={curva(SILHUETA, true)} fill={PAPEL} fillOpacity={0.04} stroke={PAPEL} strokeOpacity={0.85} strokeWidth={1.4} />
        <path d={curva(BRACO, true)} stroke={PAPEL} strokeOpacity={0.4} strokeWidth={1} />
      </g>

      {/* 2.4 cadeia: liga articulacoes entre si e a coluna */}
      <g data-camada="cadeia" stroke={PAPEL} strokeOpacity={0.35} strokeWidth={0.9}>
        {CADEIA.map(([a, b], i) => (
          <line key={i} x1={n(a.x)} y1={n(a.y)} x2={n(b.x)} y2={n(b.y)} />
        ))}
      </g>
      {/* 3: corrente. Um ponto por segmento, nasce numa ponta e morre na outra
          (translate + opacity); base em opacity 0, entao com movimento
          reduzido nao existe. Fase escalonada ao longo de cada cadeia. */}
      <g data-camada="corrente" fill={PAPEL} stroke="none">
        {CADEIA.map(([a, b], i) => (
          <circle
            key={i}
            className="corrente"
            cx={n(a.x)}
            cy={n(a.y)}
            r={1.7}
            style={{
              ["--dx" as string]: `${n(b.x - a.x)}px`,
              ["--dy" as string]: `${n(b.y - a.y)}px`,
              ["--dur" as string]: `${CORRENTE[i].dur}s`,
              ["--fase" as string]: `${CORRENTE[i].fase}s`,
            }}
          />
        ))}
      </g>

      {/* 2.2 coluna: 24 retangulos sobre a tangente da curva, discos como
          tracos entre eles, sacro como um retangulo inclinado */}
      <g data-camada="coluna">
        {VERTEBRAS.map((v, i) => {
          const cx = xColuna(v.y);
          const ang = anguloColuna(v.y);
          const seg = VERTEBRAS[i + 1];
          return (
            <g key={i} transform={`rotate(${n(ang)} ${n(cx)} ${n(v.y)})`}>
              <rect
                x={n(cx - v.w / 2)}
                y={n(v.y - v.h / 2)}
                width={n(v.w)}
                height={n(v.h)}
                rx={v.nivel === "c" ? 1.2 : 1.8}
                fill={AZUL}
                fillOpacity={0.9}
              />
              <rect
                className="vertebra-acende"
                x={n(cx - v.w / 2)}
                y={n(v.y - v.h / 2)}
                width={n(v.w)}
                height={n(v.h)}
                rx={v.nivel === "c" ? 1.2 : 1.8}
                fill={PAPEL}
                style={{ ["--fase" as string]: `${n(i * 0.16)}s` }}
              />
              {seg && (
                <line
                  x1={n(cx - v.w * 0.32)}
                  y1={n(v.y + (seg.y - v.y) / 2)}
                  x2={n(cx + v.w * 0.32)}
                  y2={n(v.y + (seg.y - v.y) / 2)}
                  stroke={AZUL}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}
        <rect
          x={133}
          y={302}
          width={17}
          height={7.5}
          rx={2}
          transform="rotate(44 141.5 305.8)"
          fill={AZUL}
          fillOpacity={0.55}
        />
      </g>

      {/* 2.3 articulacoes: anel com ponto, sobre a cadeia */}
      <g data-camada="articulacoes">
        {(Object.keys(ARTICULACOES) as Articulacao[]).map((k) => {
          const p = ARTICULACOES[k];
          const menor = k === "sacro" || k === "occipital";
          const ritmo = SONAR[k];
          return (
            <g key={k} data-articulacao={k}>
              {[0, 1 / 2].map((t) => (
                <circle
                  key={t}
                  className="sonar-onda"
                  cx={p.x}
                  cy={p.y}
                  r={menor ? 4.2 : 5.5}
                  stroke={VERDE}
                  strokeOpacity={0.75}
                  strokeWidth={0.9}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    ["--escala" as string]: menor ? 3 : 3.4,
                    ["--dur" as string]: `${ritmo.dur}s`,
                    ["--fase" as string]: `${n(ritmo.fase + t * ritmo.dur)}s`,
                  }}
                />
              ))}
              <circle cx={p.x} cy={p.y} r={menor ? 4.2 : 5.5} fill="var(--color-accent-deep)" fillOpacity={0.7} stroke={PAPEL} strokeOpacity={0.95} strokeWidth={1.3} />
              <circle
                className="sonar-ponto"
                cx={p.x}
                cy={p.y}
                r={menor ? 1.7 : 2.2}
                fill={VERDE}
                style={{ ["--dur" as string]: `${ritmo.dur}s`, ["--fase" as string]: `${ritmo.fase}s` }}
              />
            </g>
          );
        })}
      </g>
      </g>
    </svg>
  );
}
