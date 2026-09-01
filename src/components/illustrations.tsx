/**
 * Ilustracoes vetoriais da pagina: o conteudo da copy desenhado, nao
 * ornamento. Todas no mesmo idioma do campo de aprumo: traco continuo fino,
 * pontos de medicao, azul do acento sobre papel, papel sobre petroleo.
 * Silhuetas geradas por pontos + Catmull-Rom, espelhadas por codigo.
 */

const n = (v: number) => Number(v.toFixed(1));

type Pt = { x: number; y: number };

/** Catmull-Rom para bezier, aberto ou fechado. */
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

/* ================================================================
   02 — SILHUETA DE AVALIACAO
   "avaliacao cuidadosa do corpo como um todo": corpo em pe, frontal,
   com os pontos de avaliacao acendendo em sequencia.
   ================================================================ */

/** Metade direita do contorno, do topo da cabeca ao centro da base. */
const MEIA_SILHUETA: Pt[] = [
  { x: 100, y: 14 },
  { x: 117, y: 20 },
  { x: 122, y: 38 },
  { x: 116, y: 56 },
  { x: 108, y: 64 },
  { x: 108, y: 76 },
  { x: 128, y: 84 },
  { x: 148, y: 94 },
  { x: 156, y: 112 },
  { x: 160, y: 142 },
  { x: 164, y: 176 },
  { x: 168, y: 208 },
  { x: 162, y: 216 },
  { x: 152, y: 210 },
  { x: 148, y: 184 },
  { x: 142, y: 152 },
  { x: 138, y: 128 },
  { x: 136, y: 160 },
  { x: 138, y: 196 },
  { x: 142, y: 232 },
  { x: 138, y: 262 },
  { x: 130, y: 300 },
  { x: 126, y: 336 },
  { x: 124, y: 372 },
  { x: 126, y: 392 },
  { x: 138, y: 398 },
  { x: 138, y: 404 },
  { x: 112, y: 404 },
  { x: 108, y: 380 },
  { x: 108, y: 344 },
  { x: 106, y: 308 },
  { x: 100, y: 270 },
];

function espelhar(pts: Pt[]): Pt[] {
  return pts.map((p) => ({ x: 200 - p.x, y: p.y }));
}

const SILHUETA_D =
  curva(MEIA_SILHUETA) +
  " " +
  curva(espelhar(MEIA_SILHUETA).reverse()).replace(/^M/, "L");

/** Pontos de avaliacao, na ordem em que acendem. */
const PONTOS_AVALIACAO: { x: number; y: number; nivel: string }[] = [
  { x: 100, y: 74, nivel: "cervical" },
  { x: 138, y: 92, nivel: "ombro-d" },
  { x: 62, y: 92, nivel: "ombro-e" },
  { x: 100, y: 226, nivel: "pelve" },
  { x: 122, y: 306, nivel: "joelho-d" },
  { x: 78, y: 306, nivel: "joelho-e" },
  { x: 122, y: 396, nivel: "pe-d" },
  { x: 78, y: 396, nivel: "pe-e" },
];

export function FigurePoints({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 430"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* fio de prumo do idioma da casa */}
      <line
        x1={100}
        y1={4}
        x2={100}
        y2={426}
        stroke="var(--color-accent)"
        strokeOpacity={0.3}
        strokeWidth={1}
        strokeDasharray="3 6"
      />
      {/* niveis horizontais nos pontos centrais */}
      {[74, 92, 226, 306, 396].map((y) => (
        <line
          key={y}
          x1={14}
          y1={y}
          x2={186}
          y2={y}
          stroke="var(--color-rule)"
          strokeWidth={1}
          strokeDasharray="1 5"
        />
      ))}
      {/* contorno do corpo se desenhando na entrada */}
      <path
        className="traco-desenha"
        d={SILHUETA_D}
        fill="var(--color-accent)"
        fillOpacity={0.05}
        stroke="var(--color-accent)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      {/* pontos acendendo em sequencia, do alto para a base */}
      {PONTOS_AVALIACAO.map((p, i) => (
        <g
          key={p.nivel}
          className="ponto-avaliacao"
          style={{ ["--seq" as string]: i }}
        >
          <circle cx={p.x} cy={p.y} r={3} fill="var(--color-accent)" />
          <circle
            className="ponto-anel"
            cx={p.x}
            cy={p.y}
            r={7}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.2}
          />
        </g>
      ))}
    </svg>
  );
}

/* ================================================================
   03 — TRES COMPETENCIAS + REGUA DE 30
   Osteopatia, posturologia e acupuntura como marcas proprias; a
   experiencia como regua de 30 tracos com cursor percorrendo.
   ================================================================ */

function MarcaOsteopatia() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
      {/* vertebra vista de cima: corpo, canal, transversos, espinhoso */}
      <ellipse cx={32} cy={22} rx={14} ry={9.5} fill="currentColor" fillOpacity={0.09} stroke="currentColor" strokeWidth={1.7} />
      <path d="M22 29 Q20 38 27 38 Q29 34 32 34 Q35 34 37 38 Q44 38 42 29" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <line x1={24} y1={35} x2={12} y2={38} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      <line x1={40} y1={35} x2={52} y2={38} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      <path d="M30 38 L30 48 L34 48 L34 38" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      {/* arcos de mobilizacao */}
      <path d="M8 16 Q3 27 8 38" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeDasharray="2 4" />
      <path d="M56 16 Q61 27 56 38" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeDasharray="2 4" />
    </svg>
  );
}

function MarcaPosturologia() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
      {/* fio de prumo com peso, entre dois niveis */}
      <line x1={32} y1={8} x2={32} y2={40} stroke="currentColor" strokeWidth={1.4} strokeDasharray="3 4" />
      <path d="M32 40 L27 50 Q32 55 37 50 Z" fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <line x1={12} y1={16} x2={26} y2={16} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={38} y1={16} x2={52} y2={16} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={16} y1={30} x2={26} y2={30} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={38} y1={30} x2={48} y2={30} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={32} cy={59} r={1.8} fill="currentColor" />
    </svg>
  );
}

function MarcaAcupuntura() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
      {/* agulha inclinada com cabo, ponto e ondas de estimulo */}
      <line x1={20} y1={44} x2={44} y2={14} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      <path d="M40 10 L48 18 M43 7 L51 15" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={20} cy={44} r={2.2} fill="currentColor" />
      <path d="M12 52 Q20 56 28 52" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M9 57 Q20 62 31 57" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeOpacity={0.6} />
    </svg>
  );
}

export const MARCAS_CLINICAS = [
  { chave: "osteopatia", Marca: MarcaOsteopatia },
  { chave: "posturologia", Marca: MarcaPosturologia },
  { chave: "acupuntura", Marca: MarcaAcupuntura },
];

/** Regua de 30 tracos, um por ano da copy, com cursor que percorre. */
export function Regua30({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 26"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <line x1={0} y1={18} x2={300} y2={18} stroke="var(--color-rule)" strokeWidth={1.2} />
      {Array.from({ length: 30 }, (_, i) => {
        const x = 4 + (i * 292) / 29;
        const alto = i % 5 === 0 || i === 29;
        return (
          <line
            key={i}
            x1={x}
            y1={18}
            x2={x}
            y2={alto ? 5 : 10}
            stroke={alto ? "var(--color-accent)" : "var(--color-rule)"}
            strokeOpacity={alto ? 0.8 : 1}
            strokeWidth={alto ? 1.4 : 1}
          />
        );
      })}
      <circle className="cursor-regua" cx={0} cy={18} r={3.2} fill="var(--color-accent)" />
    </svg>
  );
}

/* ================================================================
   04 — TRES ADAPTACOES
   "o corpo se adapta no movimento, no sono, na forma de se organizar":
   uma vinheta por adaptacao, traco claro sobre petroleo.
   ================================================================ */

function VinhetaMovimento() {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className="h-full w-full">
      {/* figura lateral em passo */}
      <circle cx={62} cy={18} r={8} fill="none" stroke="currentColor" strokeWidth={1.8} />
      <path d="M62 26 Q60 40 57 52" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M60 34 L74 46 M60 34 L46 44" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M57 52 L74 66 L80 84 M57 52 L46 70 L36 82" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={16} y1={88} x2={104} y2={88} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.2} />
      {/* linhas de deslocamento andando */}
      <g className="traco-corre">
        <line x1={14} y1={22} x2={34} y2={22} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.3} strokeDasharray="6 7" strokeLinecap="round" />
        <line x1={10} y1={34} x2={30} y2={34} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.3} strokeDasharray="6 7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function VinhetaSono() {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className="h-full w-full">
      {/* figura deitada de lado; a coluna pontilhada e o que importa */}
      <line x1={10} y1={74} x2={110} y2={74} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.2} />
      <circle cx={26} cy={58} r={8} fill="none" stroke="currentColor" strokeWidth={1.8} />
      <path d="M34 60 Q56 52 74 58 Q92 64 102 60" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M52 60 L60 72 M78 60 L88 72" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M36 57 Q56 49 74 55 Q90 60 100 57" fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="1 4" strokeLinecap="round" />
      {/* respiracao */}
      <g className="respira">
        <path d="M22 34 Q26 30 30 34" fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.3} strokeLinecap="round" />
        <path d="M18 26 Q26 20 34 26" fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.3} strokeLinecap="round" />
      </g>
    </svg>
  );
}

function VinhetaOrganizacao() {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className="h-full w-full">
      {/* figura sentada a mesa, coluna em flexao */}
      <line x1={12} y1={88} x2={108} y2={88} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.2} />
      <circle cx={46} cy={24} r={8} fill="none" stroke="currentColor" strokeWidth={1.8} />
      <path d="M48 32 Q42 44 44 56" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M45 40 L64 48" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M44 56 L62 58 L62 78 M44 56 L44 78" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* mesa e tela */}
      <path d="M58 50 L92 50 L92 78" fill="none" stroke="currentColor" strokeOpacity={0.7} strokeWidth={1.5} strokeLinecap="round" />
      <rect x={72} y={28} width={18} height={14} rx={2} fill="none" stroke="currentColor" strokeOpacity={0.7} strokeWidth={1.5} />
      {/* alerta da curva */}
      <path className="pisca" d="M36 40 Q30 46 32 54" fill="none" stroke="currentColor" strokeWidth={1.3} strokeDasharray="2 4" strokeLinecap="round" />
    </svg>
  );
}

export const VINHETAS_ADAPTACAO = [
  { chave: "movimento", Vinheta: VinhetaMovimento },
  { chave: "sono", Vinheta: VinhetaSono },
  { chave: "organizacao", Vinheta: VinhetaOrganizacao },
];

/* ================================================================
   05 — MAPA DE PRESSAO PLANTAR
   O que a baropodometria produz: dois pes vistos de baixo, zonas de
   pressao alternando como a marcha.
   ================================================================ */

/** Contorno da planta do pe esquerdo (visto de baixo), centro x=62. */
const PE: Pt[] = [
  { x: 56, y: 14 },
  { x: 76, y: 18 },
  { x: 92, y: 32 },
  { x: 100, y: 56 },
  { x: 98, y: 82 },
  { x: 90, y: 110 },
  { x: 84, y: 140 },
  { x: 84, y: 168 },
  { x: 88, y: 192 },
  { x: 84, y: 214 },
  { x: 68, y: 222 },
  { x: 54, y: 214 },
  { x: 50, y: 192 },
  { x: 52, y: 168 },
  { x: 50, y: 140 },
  { x: 42, y: 108 },
  { x: 34, y: 74 },
  { x: 34, y: 42 },
  { x: 42, y: 20 },
];

const PE_D = curva(PE, true);

/** Zonas de pressao: halux, metatarsos, calcanhar. */
const ZONAS = [
  { cx: 56, cy: 32, rx: 13, ry: 11 },
  { cx: 66, cy: 74, rx: 24, ry: 17 },
  { cx: 68, cy: 194, rx: 15, ry: 19 },
];

function Planta({ lado }: { lado: "e" | "d" }) {
  const t = lado === "d" ? "translate(248 0) scale(-1 1)" : undefined;
  return (
    <g transform={t} className={`pe-${lado}`}>
      <path
        d={PE_D}
        fill="var(--color-accent)"
        fillOpacity={0.05}
        stroke="var(--color-accent)"
        strokeWidth={1.7}
      />
      {/* dedos menores */}
      {[
        { x: 86, y: 12, r: 4.6 },
        { x: 100, y: 19, r: 4.1 },
        { x: 110, y: 30, r: 3.7 },
        { x: 116, y: 44, r: 3.2 },
      ].map((d) => (
        <circle
          key={d.x}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
        />
      ))}
      {/* zonas de pressao em aneis concentricos */}
      {ZONAS.map((z, i) => (
        <g key={i} className="zona-pressao" style={{ ["--z" as string]: i }}>
          <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="var(--color-accent)" fillOpacity={0.14} />
          <ellipse cx={z.cx} cy={z.cy} rx={z.rx * 0.62} ry={z.ry * 0.62} fill="var(--color-accent)" fillOpacity={0.2} />
          <ellipse cx={z.cx} cy={z.cy} rx={z.rx * 0.3} ry={z.ry * 0.3} fill="var(--color-accent-deep)" fillOpacity={0.55} />
        </g>
      ))}
    </g>
  );
}

export function PressaoPlantar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 248 240"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* linha media e base da plataforma */}
      <line x1={124} y1={6} x2={124} y2={234} stroke="var(--color-rule)" strokeWidth={1} strokeDasharray="2 5" />
      <Planta lado="e" />
      <Planta lado="d" />
    </svg>
  );
}
