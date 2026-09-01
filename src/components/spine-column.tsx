const COUNT = 24; // C1..L5
const VB_W = 300;
const VB_H = 634;
const PLUMB_X = 150;
const Y_TOP = 38;
const SPACING = 21;
const BASE_Y = 604;
const CHART_L = 26;
const CHART_R = 288;

const LANDMARKS: Record<number, string> = {
  0: "C1",
  6: "C7",
  18: "T12",
  23: "L5",
};

/**
 * Perfil sagital: lordose cervical, cifose toracica, lordose lombar.
 * Deslocamento anteroposterior em px, positivo = anterior.
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
      return v0 + (v1 - v0) * s;
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}

type Vertebra = {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  amp: number;
  opacity: number;
  inDelay: number;
  phase: number;
};

const VERTEBRAE: Vertebra[] = Array.from({ length: COUNT }, (_, i) => {
  const t = i / (COUNT - 1);
  const dt = 1 / (COUNT - 1);
  const slope =
    (offsetAt(Math.min(1, t + dt)) - offsetAt(Math.max(0, t - dt))) /
    (2 * SPACING);
  return {
    i,
    x: PLUMB_X + offsetAt(t),
    y: Y_TOP + i * SPACING,
    // Corpo vertebral cresce da cervical para a lombar.
    w: 34 + t * 30,
    h: 11.5 + t * 4.5,
    // Cada corpo acompanha a tangente da curva, atenuada e limitada.
    rot: Number(
      Math.max(-13, Math.min(13, (Math.atan(slope) * 180) / Math.PI * 0.85)).toFixed(2),
    ),
    // A coluna pivota no sacro: quem oscila mais e' o topo.
    amp: Number((2.8 * (1 - t) + 0.25).toFixed(2)),
    opacity: Number((0.5 + t * 0.38).toFixed(2)),
    inDelay: 240 + (COUNT - 1 - i) * 30,
    phase: Number((-i * 0.26).toFixed(2)),
  };
});

const L5 = VERTEBRAE[COUNT - 1];
const SACRUM_TOP_Y = L5.y + L5.h / 2;

export function SpineColumn({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Linhas de referencia do grafico */}
      {VERTEBRAE.filter((v) => LANDMARKS[v.i]).map((v) => (
        <g
          key={`ref-${v.i}`}
          className="rule-in"
          style={{ ["--in-delay" as string]: `${v.inDelay + 220}ms` }}
        >
          <line
            x1={CHART_L}
            y1={v.y}
            x2={CHART_R}
            y2={v.y}
            stroke="var(--color-rule)"
            strokeWidth={1}
          />
          <text
            x={0}
            y={v.y - 8}
            fill="var(--color-muted)"
            fontSize={14}
            letterSpacing="0.12em"
            style={{ fontFamily: "var(--mono)" }}
          >
            {LANDMARKS[v.i]}
          </text>
        </g>
      ))}

      {/* Fio de prumo */}
      <line
        x1={PLUMB_X}
        y1={12}
        x2={PLUMB_X}
        y2={BASE_Y}
        stroke="var(--color-accent)"
        strokeOpacity={0.45}
        strokeWidth={1}
        strokeDasharray="3 6"
        className="rule-in"
        style={{ ["--in-delay" as string]: "120ms" }}
      />

      {/* Vertebras: entrada no no' externo, oscilacao no interno,
          inclinacao no atributo transform do proprio rect. */}
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
              <rect
                x={v.x - v.w / 2}
                y={v.y - v.h / 2}
                width={v.w}
                height={v.h}
                rx={3}
                transform={`rotate(${v.rot} ${v.x} ${v.y})`}
                fill="var(--color-paper)"
                stroke="var(--color-accent)"
                strokeOpacity={v.opacity}
                strokeWidth={1.2}
              />
              {/* Disco intervertebral */}
              {next && (
                <circle
                  cx={(v.x + next.x) / 2}
                  cy={(v.y + next.y) / 2}
                  r={2.6 + (v.i / (COUNT - 1)) * 1.8}
                  fill="var(--color-action)"
                />
              )}
            </g>
          </g>
        );
      })}

      {/* Sacro, inclinado na base da lordose lombar */}
      <g className="vertebra-in" style={{ ["--in-delay" as string]: "215ms" }}>
        <g transform={`rotate(15 ${L5.x} ${SACRUM_TOP_Y})`}>
          <path
            d={`M ${L5.x - 30} ${SACRUM_TOP_Y}
                L ${L5.x + 30} ${SACRUM_TOP_Y}
                L ${L5.x + 11} ${SACRUM_TOP_Y + 40}
                Q ${L5.x} ${SACRUM_TOP_Y + 47} ${L5.x - 11} ${SACRUM_TOP_Y + 40} Z`}
            fill="var(--color-paper)"
            stroke="var(--color-accent)"
            strokeOpacity={0.88}
            strokeWidth={1.2}
          />
        </g>
      </g>

      {/* Plano de apoio */}
      <g className="rule-in" style={{ ["--in-delay" as string]: "60ms" }}>
        <line
          x1={CHART_L}
          y1={BASE_Y}
          x2={CHART_R}
          y2={BASE_Y}
          stroke="var(--color-ink)"
          strokeWidth={1.4}
        />
        {Array.from(
          { length: 15 },
          (_, k) => CHART_L + (k * (CHART_R - CHART_L)) / 14,
        ).map((x, k) => (
          <line
            key={x}
            x1={x}
            y1={BASE_Y}
            x2={x}
            y2={BASE_Y + (k % 7 === 0 ? 10 : 5)}
            stroke="var(--color-rule)"
            strokeWidth={1}
          />
        ))}
      </g>
    </svg>
  );
}
