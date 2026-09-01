const COUNT = 24; // C1..L5
const VB_W = 720;
const VB_H = 640;
const PLUMB_X = 486;
const Y_TOP = 44;
const SPACING = 21;
const BASE_Y = 596;
const FIELD_L = 60;
const FIELD_R = 640;
const LABEL_X = 12;
const LABEL_X_DIR = 712;

/** Amplitude sagital. O perfil abaixo e' a forma; isto e' o quanto ela varre. */
const AMPLITUDE = 1.35;
/** A coluna fantasma exagera a mesma curva: e' a postura fora de prumo. */
const AMPLITUDE_FANTASMA = 2.5;

/* Varredura. O atraso do realce de cada no' e' a fracao do percurso ate ele,
   entao a onda de brilho acompanha a linha exatamente, sem JS. */
const SCAN_DUR = 9;
const SCAN_DE = -40;
const SCAN_ATE = VB_H + 60;
const scanDelay = (y: number) =>
  `${(((y - SCAN_DE) / (SCAN_ATE - SCAN_DE)) * SCAN_DUR).toFixed(2)}s`;

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

function offsetAt(t: number, amplitude = AMPLITUDE): number {
  for (let k = 0; k < PROFILE.length - 1; k++) {
    const [t0, v0] = PROFILE[k];
    const [t1, v1] = PROFILE[k + 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      const s = u * u * (3 - 2 * u); // smoothstep
      return (v0 + (v1 - v0) * s) * amplitude;
    }
  }
  return PROFILE[PROFILE.length - 1][1] * amplitude;
}

function yAt(t: number): number {
  return Y_TOP + t * (COUNT - 1) * SPACING;
}

const n = (v: number) => Number(v.toFixed(1));

/** Catmull-Rom para bezier: a linha de centro da coluna, suave. */
function curva(pts: { x: number; y: number }[]): string {
  let d = `M ${n(pts[0].x)} ${n(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${n(p1.x + (p2.x - p0.x) / 6)} ${n(p1.y + (p2.y - p0.y) / 6)} ${n(
      p2.x - (p3.x - p1.x) / 6,
    )} ${n(p2.y - (p3.y - p1.y) / 6)} ${n(p2.x)} ${n(p2.y)}`;
  }
  return d;
}

type Vertebra = {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  amp: number;
  depth: number;
  spinous: string;
  inDelay: number;
  phase: number;
};

/** Processo espinhoso: sai da borda posterior do corpo, afilando para baixo. */
function spinousPath(x: number, y: number, w: number, t: number): string {
  const back = x - w / 2;
  const ang = t < 0.26 ? 20 : t < 0.78 ? 42 : 12;
  const len = t < 0.26 ? 12 : t < 0.78 ? 19 : 15;
  const half = 2.6 + t * 0.9;
  const rad = (ang * Math.PI) / 180;
  const tipX = back - len * Math.cos(rad);
  const tipY = y + len * Math.sin(rad);
  return `M ${n(back)} ${n(y - half)} Q ${n(back - len * 0.62)} ${n(
    y - half * 0.4 + len * 0.28,
  )} ${n(tipX)} ${n(tipY)} Q ${n(back - len * 0.52)} ${n(
    y + half * 1.1 + len * 0.34,
  )} ${n(back)} ${n(y + half)} Z`;
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
    rot: Number(
      Math.max(-13, Math.min(13, ((Math.atan(slope) * 180) / Math.PI) * 0.85)).toFixed(2),
    ),
    amp: Number((2.8 * (1 - t) + 0.25).toFixed(2)),
    depth: Number((0.55 + t * 0.45).toFixed(2)),
    spinous: spinousPath(x, y, w, t),
    inDelay: 340 + (COUNT - 1 - i) * 30,
    phase: Number((-i * 0.26).toFixed(2)),
  };
});

const L5 = VERTEBRAE[COUNT - 1];
const SACRUM_TOP_Y = L5.y + L5.h / 2;

/** Linha de centro da coluna fantasma, deslocada e exagerada. */
const FANTASMA_D = curva(
  Array.from({ length: COUNT }, (_, i) => {
    const t = i / (COUNT - 1);
    return { x: PLUMB_X - 58 + offsetAt(t, AMPLITUDE_FANTASMA), y: yAt(t) };
  }),
);

const FANTASMA_BLOCOS = VERTEBRAE.filter((v) => v.i % 4 === 1).map((v) => {
  const t = v.i / (COUNT - 1);
  return {
    i: v.i,
    x: PLUMB_X - 58 + offsetAt(t, AMPLITUDE_FANTASMA),
    y: v.y,
    w: v.w * 0.86,
    h: v.h,
  };
});

/**
 * Onde a curva cruza o fio de prumo, mais o ponto em que o prumo encontra o
 * plano de apoio. Sao os pontos que pulsam.
 */
const CROSSINGS: { x: number; y: number; phase: string }[] = (() => {
  const found: { x: number; y: number }[] = [];
  const STEP = 0.002;
  let prev = offsetAt(0);
  for (let t = STEP; t <= 1 + 1e-9; t += STEP) {
    const cur = offsetAt(t);
    if (prev === 0 || prev * cur < 0) {
      const u = prev / (prev - cur);
      found.push({ x: PLUMB_X, y: Number(yAt(t - STEP + u * STEP).toFixed(1)) });
    }
    prev = cur;
  }
  found.push({ x: PLUMB_X, y: BASE_Y });
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
  const RAY = 104;
  return {
    d: `M ${n(p0.x)} ${n(p0.y)} A ${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${n(p1.x)} ${n(p1.y)}`,
    len: Number((r * Math.abs(delta)).toFixed(1)),
    rays: [a0, a1].map(
      (a) => `M ${n(V.x)} ${n(V.y)} L ${n(V.x + RAY * Math.cos(a))} ${n(V.y + RAY * Math.sin(a))}`,
    ),
    vx: n(V.x),
    vy: n(V.y),
  };
})();

/** Arco grande: raio de aprumo ancorado no sacro, varrendo o campo. */
const ARCO_CAMPO = (() => {
  const cx = L5.x;
  const cy = BASE_Y;
  const r = 268;
  const a0 = (196 * Math.PI) / 180;
  const a1 = (250 * Math.PI) / 180;
  const p0 = { x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0) };
  const p1 = { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) };
  return {
    d: `M ${n(p0.x)} ${n(p0.y)} A ${r} ${r} 0 0 0 ${n(p1.x)} ${n(p1.y)}`,
    len: Number((r * (a1 - a0)).toFixed(1)),
  };
})();

/** Miras de medicao distribuidas pelo campo, cada uma ligada a uma vertebra. */
const MIRAS = [
  { x: 148, y: 150, r: 15, alvo: 3, phase: "0s" },
  { x: 262, y: 322, r: 19, alvo: 12, phase: "-9s" },
  { x: 116, y: 452, r: 13, alvo: 17, phase: "-4s" },
  { x: 322, y: 548, r: 16, alvo: 22, phase: "-14s" },
].map((m) => {
  const v = VERTEBRAE[m.alvo];
  const dx = v.x - v.w / 2 - m.x;
  const dy = v.y - m.y;
  const dist = Math.hypot(dx, dy);
  return {
    ...m,
    conector: `M ${n(m.x + (dx / dist) * (m.r + 5))} ${n(
      m.y + (dy / dist) * (m.r + 5),
    )} L ${n(v.x - v.w / 2 - 4)} ${n(v.y)}`,
  };
});

/** Cantoneiras: marca de enquadramento do campo. */
const CANTOS = [
  { x: FIELD_L, y: 26, sx: 1, sy: 1 },
  { x: FIELD_R, y: 26, sx: -1, sy: 1 },
  { x: FIELD_L, y: BASE_Y + 24, sx: 1, sy: -1 },
  { x: FIELD_R, y: BASE_Y + 24, sx: -1, sy: -1 },
];

const FIOS_VERTICAIS = [118, 236, 354];

const BASE_TICKS = Array.from(
  { length: 21 },
  (_, k) => FIELD_L + (k * (FIELD_R - FIELD_L)) / 20,
);

export function SpineColumn({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      /* No desktop o campo cabe inteiro; no telefone o container e' mais alto
         que largo e o corte tira o campo da esquerda, preservando a coluna. */
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      style={{
        ["--scan-dur" as string]: `${SCAN_DUR}s`,
        ["--scan-de" as string]: `${SCAN_DE}px`,
        ["--scan-ate" as string]: `${SCAN_ATE}px`,
      }}
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
          <feDropShadow dx="2" dy="3" stdDeviation="4" floodColor="#04121c" floodOpacity="0.4" />
        </filter>
        <linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-light)" stopOpacity="0" />
          <stop offset="72%" stopColor="var(--color-accent-light)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-accent-light)" stopOpacity="0" />
        </linearGradient>
        {/* Volume do corpo vertebral: luz entrando de cima */}
        <linearGradient id="corpo-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-paper)" stopOpacity="0.3" />
          <stop offset="55%" stopColor="var(--color-paper)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--color-paper)" stopOpacity="0.04" />
        </linearGradient>
        {/* Nucleo do disco: verde com luz no centro, como material vivo */}
        <radialGradient id="disco-grad" cx="0.42" cy="0.36" r="0.9">
          <stop offset="0%" stopColor="#b7d84a" />
          <stop offset="100%" stopColor="#96bf0d" />
        </radialGradient>
        <linearGradient id="fio-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-paper)" stopOpacity="0" />
          <stop offset="30%" stopColor="var(--color-paper)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-paper)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* --- Fios verticais do campo, com pontilhado que anda --- */}
      {FIOS_VERTICAIS.map((x, k) => (
        <line
          key={`fio-${x}`}
          className="fio-corrente"
          style={{ animationDelay: `${k * -2.3}s` }}
          x1={x}
          y1={30}
          x2={x}
          y2={BASE_Y}
          stroke="url(#fio-grad)"
          strokeWidth={1}
          strokeDasharray="2 6"
        />
      ))}

      {/* --- Cantoneiras --- */}
      {CANTOS.map((c) => (
        <path
          key={`canto-${c.x}-${c.y}`}
          className="rule-in"
          style={{ ["--in-delay" as string]: "1500ms" }}
          d={`M ${c.x + c.sx * 22} ${c.y} L ${c.x} ${c.y} L ${c.x} ${c.y + c.sy * 22}`}
          fill="none"
          stroke="var(--color-paper)"
          strokeOpacity={0.28}
          strokeWidth={1.2}
        />
      ))}

      {/* --- Niveis: reguas que se estendem a partir da coluna --- */}
      {VERTEBRAE.map((v) => {
        const mark = LANDMARKS[v.i];
        return (
          <g
            key={`nivel-${v.i}`}
            className="varrido"
            style={{
              ["--base-op" as string]: mark ? 0.34 : 0.1,
              ["--pico-op" as string]: mark ? 1 : 0.62,
              ["--scan-delay" as string]: scanDelay(v.y),
            }}
          >
            <rect
              className="regua-in"
              style={{
                ["--origem" as string]: "right",
                ["--in-delay" as string]: `${420 + v.i * 26}ms`,
              }}
              x={FIELD_L}
              y={v.y}
              width={v.x - v.w / 2 - FIELD_L}
              height={1}
              fill="var(--color-paper)"
            />
            <rect
              className="regua-in"
              style={{
                ["--origem" as string]: "left",
                ["--in-delay" as string]: `${420 + v.i * 26}ms`,
              }}
              x={v.x + v.w / 2}
              y={v.y}
              width={FIELD_R - (v.x + v.w / 2)}
              height={1}
              fill="var(--color-paper)"
            />
            <rect
              x={FIELD_L - (mark ? 16 : 8)}
              y={v.y}
              width={mark ? 16 : 8}
              height={mark ? 1.4 : 1}
              fill="var(--color-paper)"
            />
            {mark && (
              <>
                <rect
                  x={FIELD_R + 4}
                  y={v.y - 0.5}
                  width={14}
                  height={1.4}
                  fill="var(--color-paper)"
                />
                <text
                  x={LABEL_X_DIR}
                  y={v.y + 4}
                  textAnchor="end"
                  fill="var(--color-on-deep-muted)"
                  fontSize={13}
                  letterSpacing="0.16em"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  {mark}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* --- Arco grande de aprumo, ancorado no sacro --- */}
      <path
        className="arc-in"
        style={{
          ["--arc-len" as string]: ARCO_CAMPO.len,
          ["--in-delay" as string]: "1250ms",
        }}
        d={ARCO_CAMPO.d}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeOpacity={0.3}
        strokeWidth={1}
        strokeDasharray={ARCO_CAMPO.len}
      />

      {/* --- Miras de medicao no campo --- */}
      {MIRAS.map((m, k) => (
        <g
          key={`mira-${m.x}`}
          className="rule-in"
          style={{ ["--in-delay" as string]: `${1300 + k * 130}ms` }}
        >
          <path
            d={m.conector}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity={0.16}
            strokeWidth={1}
            strokeDasharray="2 5"
          />
          <g className="mira" style={{ ["--phase" as string]: m.phase }}>
            <circle
              cx={m.x}
              cy={m.y}
              r={m.r}
              fill="none"
              stroke="var(--color-accent-light)"
              strokeOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <path
              d={`M ${m.x - m.r - 6} ${m.y} h ${m.r * 2 + 12} M ${m.x} ${m.y - m.r - 6} v ${m.r * 2 + 12}`}
              stroke="var(--color-accent-light)"
              strokeOpacity={0.28}
              strokeWidth={1}
            />
          </g>
          <circle cx={m.x} cy={m.y} r={1.8} fill="var(--color-accent-light)" fillOpacity={0.75} />
        </g>
      ))}

      {/* --- Coluna fantasma: a postura fora de prumo, que oscila --- */}
      <g className="fantasma">
        <g className="rule-in" style={{ ["--in-delay" as string]: "900ms" }}>
          <path
            d={FANTASMA_D}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity={0.14}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={FANTASMA_D}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity={0.4}
            strokeWidth={1.2}
            strokeDasharray="1 7"
            strokeLinecap="round"
          />
          {FANTASMA_BLOCOS.map((b) => (
            <circle
              key={`f-${b.i}`}
              cx={b.x}
              cy={b.y}
              r={4}
              fill="var(--color-accent-deep)"
              stroke="var(--color-paper)"
              strokeOpacity={0.42}
              strokeWidth={1.2}
            />
          ))}
        </g>
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
                className="varrido"
                style={{
                  ["--base-op" as string]: v.depth,
                  ["--pico-op" as string]: 1,
                  ["--scan-delay" as string]: scanDelay(v.y),
                }}
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
                      fillOpacity={0.05}
                      stroke="var(--color-paper)"
                      strokeOpacity={0.4}
                      strokeWidth={1.2}
                      strokeLinejoin="round"
                    />
                    <rect
                      x={v.x - v.w / 2}
                      y={v.y - v.h / 2}
                      width={v.w}
                      height={v.h}
                      rx={3.5}
                      fill="url(#corpo-grad)"
                      stroke="var(--color-paper)"
                      strokeWidth={1.8}
                    />
                  </g>
                  {next && (
                    <ellipse
                      cx={(v.x + next.x) / 2}
                      cy={(v.y + next.y) / 2}
                      rx={v.w * 0.34}
                      ry={1.8 + (v.i / (COUNT - 1)) * 1.2}
                      fill="url(#disco-grad)"
                      fillOpacity={0.95}
                    />
                  )}
                </g>
              </g>
            </g>
          );
        })}

        {/* Sacro, inclinado na base da lordose lombar */}
        <g className="vertebra-in" style={{ ["--in-delay" as string]: "300ms" }}>
          <g transform={`rotate(15 ${L5.x} ${SACRUM_TOP_Y})`}>
            <path
              d={`M ${L5.x - 40} ${SACRUM_TOP_Y}
                  L ${L5.x + 40} ${SACRUM_TOP_Y}
                  L ${L5.x + 14} ${SACRUM_TOP_Y + 48}
                  Q ${L5.x} ${SACRUM_TOP_Y + 57} ${L5.x - 14} ${SACRUM_TOP_Y + 48} Z`}
              fill="url(#corpo-grad)"
              stroke="var(--color-paper)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </g>
        </g>
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

      {/* --- Fio de prumo --- */}
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

      {/* --- Plano de apoio, de ponta a ponta do campo --- */}
      <g className="rule-in" style={{ ["--in-delay" as string]: "80ms" }}>
        <rect
          className="regua-in"
          style={{ ["--origem" as string]: "center", ["--in-delay" as string]: "180ms" }}
          x={FIELD_L}
          y={BASE_Y}
          width={FIELD_R - FIELD_L}
          height={1.6}
          fill="var(--color-paper)"
          fillOpacity={0.85}
        />
        <rect
          x={FIELD_L}
          y={BASE_Y + 5}
          width={FIELD_R - FIELD_L}
          height={1}
          fill="var(--color-paper)"
          fillOpacity={0.18}
        />
        {BASE_TICKS.map((x, k) => (
          <line
            key={x}
            x1={x}
            y1={BASE_Y + 5}
            x2={x}
            y2={BASE_Y + 5 + (k % 5 === 0 ? 13 : 6)}
            stroke="var(--color-paper)"
            strokeOpacity={k % 5 === 0 ? 0.42 : 0.2}
            strokeWidth={1}
          />
        ))}
      </g>

      {/* --- Varredura: desce o campo e acende o que cruza --- */}
      <g className="varredura">
        <rect
          x={FIELD_L - 24}
          y={-26}
          width={FIELD_R - FIELD_L + 48}
          height={52}
          fill="url(#scan-grad)"
        />
        <rect
          x={FIELD_L - 24}
          y={0}
          width={FIELD_R - FIELD_L + 48}
          height={1}
          fill="var(--color-accent-light)"
          fillOpacity={0.85}
        />
      </g>
    </svg>
  );
}
