import {
  COLUNA_PERFIL_X,
  COLUNA_PERFIL_X0,
  SILHUETA_PERFIL_D,
} from "./silhueta-perfil-path";

/**
 * A segunda peca grafica do hero: a mesma figura humana esquematica, de pe,
 * vista de PERFIL, olhando para a direita. Fica a direita da frontal, com as
 * costas voltadas para ela (a curvatura da coluna fica no meio do par).
 *
 * Mesmo sistema da frontal (ver figura-esquematica.tsx): silhueta vetorizada
 * pela linha de centro do traco (silhueta-perfil-path.ts), coluna esquematica,
 * articulacoes com sonar, cadeia com corrente, prumo e respiracao. Mesmo
 * traco, mesma cor, mesma opacidade. O que muda e' o que a vista lateral
 * mostra de verdade:
 *
 * - A coluna tem a curvatura sagital real: lordose cervical, cifose toracica
 *   e lordose lombar. A linha de centro foi medida na mascara da referencia
 *   (COLUNA_PERFIL_X) e cada vertebra e' girada pela tangente da curva; o
 *   disco tambem. O sacro inclina para tras, como no plano sagital. Como a
 *   curvatura e' real, os discos tem espacamento uniforme, sem o ritmo
 *   senoidal que a frontal usa para sugerir o que nao pode desenhar.
 * - O prumo e' a linha de gravidade sagital da avaliacao postural: passa pela
 *   orelha, pelo trocanter, a frente do joelho e a frente do maleolo. E' um
 *   x so (56), medido no trocanter da propria silhueta.
 * - De perfil so ha um lado: sete articulacoes, seis segmentos de cadeia.
 *
 * Todas as fases levam FASE_PROPRIA somado, e a respiracao tem atraso
 * proprio, para as duas figuras nao pulsarem em unissono.
 *
 * viewBox 118 x 560 com width/height declarados: proporcao conhecida antes
 * do CSS, sem CLS. O corpo ocupa o mesmo y da frontal (24,2..534,7), entao
 * as duas figuras renderizadas com a mesma altura CSS tem exatamente a mesma
 * altura de corpo.
 */

const n = (v: number) => Number(v.toFixed(1));

type Pt = { x: number; y: number };

const VB_W = 118;
/** Prumo sagital, medido no trocanter da silhueta. */
const PRUMO = 56;
/** Extensao horizontal do corpo no viewBox (linha do chao). */
const CORPO_X0 = 16.1;
const CORPO_X1 = 101.9;
/** Deslocamento de fase de todas as animacoes, para nao pulsar junto com a frontal. */
const FASE_PROPRIA = 2.3;

/** x da linha de centro da coluna em y, por interpolacao linear na curva medida. */
function xColuna(y: number): number {
  const t = y - COLUNA_PERFIL_X0;
  const i = Math.max(0, Math.min(COLUNA_PERFIL_X.length - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i));
  return COLUNA_PERFIL_X[i] + (COLUNA_PERFIL_X[i + 1] - COLUNA_PERFIL_X[i]) * f;
}

/** Angulo da tangente em relacao a vertical (graus); positivo inclina para a frente descendo. */
function anguloColuna(y: number, h = 3): number {
  const dx = xColuna(y + h) - xColuna(y - h);
  return (Math.atan2(dx, 2 * h) * 180) / Math.PI;
}

/* ---------------------------------------------------------------
   Coluna: mesmas regioes e mesmos tamanhos da frontal, espacamento
   uniforme. Cada vertebra e' um retangulo arredondado centrado na
   curva e girado pela tangente.
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
  rx: number;
};

const REGIOES: Regiao[] = [
  { chave: "cervical", qtd: 7, y0: 90, y1: 118, w0: 6.4, w1: 8.4, h0: 1.9, h1: 1.9, rx: 0.9 },
  { chave: "toracica", qtd: 12, y0: 122, y1: 220, w0: 9.4, w1: 12.4, h0: 4.2, h1: 4.8, rx: 1.5 },
  { chave: "lombar", qtd: 5, y0: 225, y1: 272, w0: 13.6, w1: 16, h0: 6, h1: 6, rx: 2 },
];

type Vertebra = { y: number; w: number; h: number; rx: number };

function montarColuna(): Vertebra[] {
  const out: Vertebra[] = [];
  for (const r of REGIOES) {
    const fatia = (r.y1 - r.y0) / r.qtd;
    for (let i = 0; i < r.qtd; i++) {
      const t = r.qtd === 1 ? 0 : i / (r.qtd - 1);
      out.push({
        y: r.y0 + fatia * (i + 0.5),
        w: r.w0 + (r.w1 - r.w0) * t,
        h: r.h0 + (r.h1 - r.h0) * t,
        rx: r.rx,
      });
    }
  }
  return out;
}

const VERTEBRAS = montarColuna();

/* ---------------------------------------------------------------
   Articulacoes: uma por ponto, medidas na mascara da referencia.
   Ombro no terco posterior da profundidade do tronco, cotovelo no
   meio (o braco cai ao lado do corpo), trocanter, joelho e maleolo
   no centro do segmento. Mesmos y da frontal, para as linhas de
   referencia cruzarem as duas figuras na mesma articulacao.
   --------------------------------------------------------------- */
type Junta = { chave: string; x: number; y: number; r: number; dur: number; fase: number };

const JUNTAS: Junta[] = [
  { chave: "occipital", x: 50, y: 78, r: 4.2, dur: 4.2, fase: 0.4 },
  { chave: "sacro", x: 41, y: 281, r: 4.2, dur: 4.4, fase: 2.5 },
  { chave: "ombro", x: 41, y: 149.5, r: 5.5, dur: 3.7, fase: 0 },
  { chave: "cotovelo", x: 60, y: 250.5, r: 5.2, dur: 4.6, fase: 3.1 },
  { chave: "quadril", x: 56.5, y: 309.5, r: 5.5, dur: 3.9, fase: 1.2 },
  { chave: "joelho", x: 50, y: 408, r: 5.5, dur: 4.8, fase: 0.5 },
  { chave: "tornozelo", x: 46, y: 489.3, r: 5, dur: 4.1, fase: 3.6 },
];

function junta(chave: string): Pt {
  const j = JUNTAS.find((k) => k.chave === chave);
  if (!j) throw new Error(`junta desconhecida: ${chave}`);
  return { x: j.x, y: j.y };
}

const naColuna = (y: number): Pt => ({ x: xColuna(y), y });

/** Cadeia: um lado so. Duracao e fase escalonadas, como na frontal. */
const CADEIA: { a: Pt; b: Pt; dur: number; fase: number }[] = [
  { a: junta("occipital"), b: naColuna(90), dur: 6.5, fase: 0 },
  { a: junta("ombro"), b: naColuna(122), dur: 6.5, fase: 0.5 },
  { a: junta("ombro"), b: junta("cotovelo"), dur: 6.5, fase: 1.7 },
  { a: junta("sacro"), b: junta("quadril"), dur: 7, fase: 0.4 },
  { a: junta("quadril"), b: junta("joelho"), dur: 7, fase: 1.7 },
  { a: junta("joelho"), b: junta("tornozelo"), dur: 7, fase: 3.0 },
];

const PAPEL = "var(--color-paper)";
const AZUL = "var(--color-accent-light)";
const VERDE = "var(--color-action)";

const fase = (v: number) => `${n(v + FASE_PROPRIA)}s`;

export function FiguraPerfil({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} 560`}
      width={VB_W}
      height={560}
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A figura inteira respira; unico transform deste no'. Atraso proprio. */}
      <g
        className="figura-respira"
        style={{
          transformBox: "view-box",
          transformOrigin: `${VB_W / 2}px 300px`,
          animationDelay: `${n(1.2 + FASE_PROPRIA)}s`,
        }}
      >
        {/* Prumo sagital, com marcas no ombro e no trocanter */}
        <g data-camada="prumo" stroke={PAPEL}>
          <line x1={PRUMO} y1={4} x2={PRUMO} y2={556} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 6" />
          {JUNTAS.filter((j) => j.chave === "ombro" || j.chave === "quadril").map((j) => (
            <line
              key={j.chave}
              x1={PRUMO - 16}
              y1={j.y}
              x2={PRUMO + 16}
              y2={j.y}
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          ))}
          <line x1={CORPO_X0} y1={542} x2={CORPO_X1} y2={542} strokeOpacity={0.3} strokeWidth={1} />
        </g>

        {/* Silhueta: contorno unico, mesmo traco e preenchimento da frontal */}
        <g data-camada="silhueta" stroke={PAPEL} strokeOpacity={0.85} strokeWidth={1.4}>
          <path d={SILHUETA_PERFIL_D} fill={PAPEL} fillOpacity={0.04} />
        </g>

        {/* Cadeia */}
        <g data-camada="cadeia" stroke={PAPEL} strokeOpacity={0.35} strokeWidth={0.9}>
          {CADEIA.map((c, i) => (
            <line key={i} x1={n(c.a.x)} y1={n(c.a.y)} x2={n(c.b.x)} y2={n(c.b.y)} />
          ))}
        </g>

        {/* Corrente: base em opacity 0, entao com movimento reduzido nao existe. */}
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
                ["--fase" as string]: fase(c.fase),
              }}
            />
          ))}
        </g>

        {/* Coluna: 24 retangulos sobre a curva sagital, girados pela tangente;
            discos como tracos no vao, tambem girados; sacro inclinado para tras */}
        <g data-camada="coluna">
          {VERTEBRAS.map((v, i) => {
            const cx = xColuna(v.y);
            const ang = anguloColuna(v.y);
            const giro = `rotate(${n(ang)} ${n(cx)} ${n(v.y)})`;
            const seg = VERTEBRAS[i + 1];
            const vao = seg ? seg.y - seg.h / 2 - (v.y + v.h / 2) : 0;
            const ym = v.y + v.h / 2 + vao / 2;
            const xm = xColuna(ym);
            return (
              <g key={i}>
                <rect
                  x={n(cx - v.w / 2)}
                  y={n(v.y - v.h / 2)}
                  width={n(v.w)}
                  height={n(v.h)}
                  rx={v.rx}
                  fill={AZUL}
                  fillOpacity={0.85}
                  transform={giro}
                />
                <rect
                  className="vertebra-acende"
                  x={n(cx - v.w / 2)}
                  y={n(v.y - v.h / 2)}
                  width={n(v.w)}
                  height={n(v.h)}
                  rx={v.rx}
                  fill={PAPEL}
                  transform={giro}
                  style={{ ["--fase" as string]: fase(i * 0.16) }}
                />
                {seg && vao > 1.2 && (
                  <line
                    x1={n(xm - v.w * 0.31)}
                    y1={n(ym)}
                    x2={n(xm + v.w * 0.31)}
                    y2={n(ym)}
                    stroke={AZUL}
                    strokeOpacity={0.55}
                    strokeWidth={1}
                    transform={`rotate(${n(anguloColuna(ym))} ${n(xm)} ${n(ym)})`}
                  />
                )}
              </g>
            );
          })}
          <rect x={39} y={275} width={9} height={16} rx={3} fill={AZUL} fillOpacity={0.55} transform="rotate(-29 43.5 283)" />
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
                    ["--fase" as string]: fase(j.fase + t * j.dur),
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
                style={{ ["--dur" as string]: `${j.dur}s`, ["--fase" as string]: fase(j.fase) }}
              />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
