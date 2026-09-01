const COUNT = 24; // C1..L5
const VB_W = 360;
const VB_H = 600;
const PLUMB_X = 190;
const Y_TOP = 40;
const SPACING = 20;
const BASE_Y = 568;
const CHART_L = 46;
const CHART_R = 336;

/** Amplitude sagital. O perfil abaixo e' a forma; isto e' o quanto ela varre. */
const AMPLITUDE = 1.35;

const LANDMARKS: Record<number, string> = {
  0: "C1",
  6: "C7",
  18: "T12",
  23: "L5",
};

/**
 * Perfil sagital: lordose cervical, cifose toracica, lordose lombar.
 * Deslocamento anteroposterior em px, positivo = anterior (direita).
 */
const PROFILE: [number, number][] = [
  [0.0, 2],
  [0.1, 12],
  [0.22, 16],
  [0.3, 8],
  [0.45, -12],
  [0.6, -16],
  [0.75, -6],
  [0.88, 12],
  [1.0, 16],
];

function offsetAt(t: number): number {
  for (let k = 0; k < PROFILE.length - 1; k++) {
    const [t0, v0] = PROFILE[k];
    const [t1, v1] = PROFILE[k + 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      const s = u * u * (3 - 2 * u); // smoothstep
      return (v0 + (v1 - v0) * s) * AMPLITUDE;
    }
  }
  return PROFILE[PROFILE.length - 1][1] * AMPLITUDE;
}

function yAt(t: number): number {
  return Y_TOP + t * (COUNT - 1) * SPACING;
}

type Vertebra = {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  amp: number;
  /** Profundidade: cervical mais ao fundo, lombar na frente. */
  depth: number;
  spinous: string;
  inDelay: number;
  phase: number;
};

/** Processo espinhoso: sai da borda posterior do corpo, afilando para baixo. */
function spinousPath(x: number, y: number, w: number, t: number): string {
  const back = x - w / 2;
  const ang = t < 0.26 ? 20 : t < 0.78 ? 42 : 12; // cervical, toracica, lombar
  const len = t < 0.26 ? 12 : t < 0.78 ? 19 : 15;
  const half = 2.6 + t * 0.9;
  const rad = (ang * Math.PI) / 180;
  const tipX = back - len * Math.cos(rad);
  const tipY = y + len * Math.sin(rad);
  const r = (n: number) => Number(n.toFixed(1));
  return `M ${r(back)} ${r(y - half)} Q ${r(back - len * 0.62)} ${r(y - half * 0.4 + len * 0.28)} ${r(tipX)} ${r(tipY)} Q ${r(back - len * 0.52)} ${r(y + half * 1.1 + len * 0.34)} ${r(back)} ${r(y + half)} Z`;
}

const VERTEBRAE: Vertebra[] = Array.from({ length: COUNT }, (_, i) => {
  const t = i / (COUNT - 1);
  const dt = 1 / (COUNT - 1);
  const slope =
    (offsetAt(Math.min(1, t + dt)) - offsetAt(Math.max(0, t - dt))) /
    (2 * SPACING);
  const x = PLUMB_X + offsetAt(t);
  const y = yAt(t);
  const w = 46 + t * 34;
  return {
    i,
    x,
    y,
    w,
    h: 9 + t * 3,
    // Cada corpo acompanha a tangente da curva, atenuada e limitada.
    rot: Number(
      Math.max(-13, Math.min(13, ((Math.atan(slope) * 180) / Math.PI) * 0.85)).toFixed(2),
    ),
    // A coluna pivota no sacro: quem oscila mais e' o topo.
    amp: Number((2.8 * (1 - t) + 0.25).toFixed(2)),
    depth: Number((0.55 + t * 0.45).toFixed(2)),
    spinous: spinousPath(x, y, w, t),
    inDelay: 300 + (COUNT - 1 - i) * 32,
    phase: Number((-i * 0.26).toFixed(2)),
  };
});

const L5 = VERTEBRAE[COUNT - 1];
const SACRUM_TOP_Y = L5.y + L5.h / 2;

/**
 * Onde a curva cruza o fio de prumo, mais o ponto em que o prumo encontra o
 * plano de apoio. Sao os tres pontos que pulsam.
 */
const CROSSINGS: { x: number; y: number; phase: string }[] = (() => {
  const found: { x: number; y: number; phase: string }[] = [];
  const STEP = 0.002;
  let prev = offsetAt(0);
  for (let t = STEP; t <= 1 + 1e-9; t += STEP) {
    const cur = offsetAt(t);
    if (prev === 0 || prev * cur < 0) {
      const u = prev / (prev - cur);
      found.push({
        x: PLUMB_X,
        y: Number(yAt(t - STEP + u * STEP).toFixed(1)),
        phase: "0s",
      });
    }
    prev = cur;
  }
  found.push({ x: PLUMB_X, y: BASE_Y, phase: "0s" });
  return found.map((p, k) => ({ ...p, phase: `${(k * 1.2).toFixed(1)}s` }));
})();

/**
 * Arco de relacao entre C7, T12 e L5. Geometria de aprumo, sem valor numerico:
 * um numero em graus aqui seria medida de um paciente que nao existe.
 */
const ANGLE = (() => {
  const V = VERTEBRAE[18];
  const A = VERTEBRAE[6];
  const B = VERTEBRAE[23];
  const a0 = Math.atan2(A.y - V.y, A.x - V.x);
  const a1 = Math.atan2(B.y - V.y, B.x - V.x);
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const r = 64;
  const p0 = { x: V.x + r * Math.cos(a0), y: V.y + r * Math.sin(a0) };
  const p1 = { x: V.x + r * Math.cos(a1), y: V.y + r * Math.sin(a1) };
  const n = (v: number) => Number(v.toFixed(1));
  const RAY = 104;
  return {
    d: `M ${n(p0.x)} ${n(p0.y)} A ${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${n(p1.x)} ${n(p1.y)}`,
    len: Number((r * Math.abs(delta)).toFixed(1)),
    rays: [a0, a1].map(
      (a) =>
        `M ${n(V.x)} ${n(V.y)} L ${n(V.x + RAY * Math.cos(a))} ${n(V.y + RAY * Math.sin(a))}`,
    ),
    vx: n(V.x),
    vy: n(V.y),
  };
})();

const BASE_TICKS = Array.from(
  { length: 15 },
  (_, k) => CHART_L + (k * (CHART_R - CHART_L)) / 14,
);

export function SpineColumn({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id="spine-shadow"
          x="-20%"
          y="-10%"
          width="150%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="2"
            dy="3"
            stdDeviation="4"
            floodColor="#04121c"
            floodOpacity="0.4"
          />
        </filter>
      </defs>

      {/* --- Grade de aprumo: um nivel para cada vertebra --- */}
      <g>
        {VERTEBRAE.map((v) => {
          const mark = LANDMARKS[v.i];
          return (
            <g
              key={`grid-${v.i}`}
              className="rule-in"
              style={{ ["--in-delay" as string]: `${120 + v.i * 26}ms` }}
            >
              <line
                x1={CHART_L}
                y1={v.y}
                x2={CHART_R}
                y2={v.y}
                stroke="var(--color-paper)"
                strokeOpacity={mark ? 0.3 : 0.11}
                strokeWidth={1}
              />
              <line
                x1={CHART_L - (mark ? 14 : 7)}
                y1={v.y}
                x2={CHART_L}
                y2={v.y}
                stroke="var(--color-paper)"
                strokeOpacity={mark ? 0.6 : 0.24}
                strokeWidth={mark ? 1.4 : 1}
              />
              {mark && (
                <text
                  x={2}
                  y={v.y - 9}
                  fill="var(--color-on-deep-muted)"
                  fontSize={13}
                  letterSpacing="0.14em"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  {mark}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* --- Arco de relacao C7 / T12 / L5 --- */}
      <g className="rule-in" style={{ ["--in-delay" as string]: "1180ms" }}>
        {ANGLE.rays.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--color-accent-light)"
            strokeOpacity={0.34}
            strokeWidth={1}
            strokeDasharray="2 5"
          />
        ))}
        <path
          className="arc-in"
          style={{
            ["--arc-len" as string]: ANGLE.len,
            ["--in-delay" as string]: "1320ms",
          }}
          d={ANGLE.d}
          fill="none"
          stroke="var(--color-accent-light)"
          strokeOpacity={0.85}
          strokeWidth={1.4}
          strokeDasharray={ANGLE.len}
        />
        <circle cx={ANGLE.vx} cy={ANGLE.vy} r={2} fill="var(--color-accent-light)" />
      </g>

      {/* --- Coluna --- */}
      <g filter="url(#spine-shadow)">
        {VERTEBRAE.map((v, k) => {
          const next = VERTEBRAE[k + 1];
          return (
            <g
              key={v.i}
              className="vertebra-in"
              style={{ ["--in-delay" as string]: `${v.inDelay}ms` }}
            >
              <g
                className="vertebra-sway"
                style={{
                  ["--amp" as string]: v.amp,
                  ["--phase" as string]: `${v.phase}s`,
                }}
              >
                <g transform={`rotate(${v.rot} ${v.x} ${v.y})`}>
                  <path
                    d={v.spinous}
                    fill="var(--color-paper)"
                    fillOpacity={0.05 * v.depth}
                    stroke="var(--color-paper)"
                    strokeOpacity={v.depth * 0.4}
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                  <rect
                    x={v.x - v.w / 2}
                    y={v.y - v.h / 2}
                    width={v.w}
                    height={v.h}
                    rx={3.5}
                    fill="var(--color-paper)"
                    fillOpacity={0.13 * v.depth}
                    stroke="var(--color-paper)"
                    strokeOpacity={v.depth}
                    strokeWidth={1.8}
                  />
                </g>
                {/* Disco intervertebral */}
                {next && (
                  <ellipse
                    cx={(v.x + next.x) / 2}
                    cy={(v.y + next.y) / 2}
                    rx={v.w * 0.34}
                    ry={1.8 + (v.i / (COUNT - 1)) * 1.2}
                    fill="var(--color-action)"
                    fillOpacity={0.9}
                  />
                )}
              </g>
            </g>
          );
        })}

        {/* Sacro, inclinado na base da lordose lombar */}
        <g className="vertebra-in" style={{ ["--in-delay" as string]: "270ms" }}>
          <g transform={`rotate(15 ${L5.x} ${SACRUM_TOP_Y})`}>
            <path
              d={`M ${L5.x - 40} ${SACRUM_TOP_Y}
                  L ${L5.x + 40} ${SACRUM_TOP_Y}
                  L ${L5.x + 14} ${SACRUM_TOP_Y + 48}
                  Q ${L5.x} ${SACRUM_TOP_Y + 57} ${L5.x - 14} ${SACRUM_TOP_Y + 48} Z`}
              fill="var(--color-paper)"
              fillOpacity={0.1}
              stroke="var(--color-paper)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </g>
        </g>
      </g>

      {/* --- Fio de prumo: traca de cima para baixo --- */}
      <g className="plumb-in">
        <line
          x1={PLUMB_X}
          y1={24}
          x2={PLUMB_X}
          y2={BASE_Y}
          stroke="var(--color-accent-light)"
          strokeOpacity={0.7}
          strokeWidth={1.1}
          strokeDasharray="3 5"
        />
      </g>

      {/* --- Pulsos nos cruzamentos do prumo --- */}
      {CROSSINGS.map((c) => (
        <circle
          key={`${c.x}-${c.y}`}
          className="node-pulse"
          style={{ ["--phase" as string]: c.phase }}
          cx={c.x}
          cy={c.y}
          r={4.5}
          fill="none"
          stroke="var(--color-accent-light)"
          strokeWidth={1.4}
        />
      ))}

      {/* --- Plano de apoio --- */}
      <g className="rule-in" style={{ ["--in-delay" as string]: "80ms" }}>
        <line
          x1={CHART_L}
          y1={BASE_Y}
          x2={CHART_R}
          y2={BASE_Y}
          stroke="var(--color-paper)"
          strokeOpacity={0.85}
          strokeWidth={1.6}
        />
        <line
          x1={CHART_L}
          y1={BASE_Y + 4}
          x2={CHART_R}
          y2={BASE_Y + 4}
          stroke="var(--color-paper)"
          strokeOpacity={0.18}
          strokeWidth={1}
        />
        {BASE_TICKS.map((x, k) => (
          <line
            key={x}
            x1={x}
            y1={BASE_Y + 4}
            x2={x}
            y2={BASE_Y + 4 + (k % 7 === 0 ? 12 : 6)}
            stroke="var(--color-paper)"
            strokeOpacity={k % 7 === 0 ? 0.42 : 0.2}
            strokeWidth={1}
          />
        ))}
      </g>
    </svg>
  );
}
