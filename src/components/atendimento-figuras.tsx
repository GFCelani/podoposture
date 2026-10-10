import type { CSSProperties, ReactNode } from "react";

import { FiguraCorpo } from "./figura-corpo";

/**
 * As ilustracoes da pagina "Como e o meu atendimento", nas etapas em que o
 * acervo da clinica nao tem foto da cena. Sem rotulo e sem numero: sao
 * desenho, e o texto ao lado e' que diz o que elas mostram. Cada uma
 * desenha UMA ideia do texto da cliente, com a figura do corpo do site
 * (FiguraCorpo, a unica silhueta do projeto) e o vocabulario da casa: fio
 * fino, anel, ponto de sonar.
 *
 * Movimento: um pulso percorre cada fio, sempre do ponto que doi ou do que
 * sente para onde a investigacao vai. E' stroke-dashoffset num <path> com
 * pathLength (pathLength so vale em <path> no Chrome), e a base do pulso e'
 * opacity 0: com movimento reduzido ele nao existe, e o desenho fica inteiro
 * e parado. CSS em atendimento.css.
 *
 * Chapa: o desenho mora numa placa em azul profundo dentro da moldura de
 * papel das fotos, para ilustracao e fotografia terem o mesmo peso na pagina.
 */

const PAPEL = "var(--color-paper)";
const AZUL = "var(--color-accent-light)";

/** Moldura de papel com a placa azul. `proporcao` em CSS (ex.: "4 / 5"). */
export function Chapa({
  proporcao,
  children,
  className = "",
}: {
  proporcao: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ja-chapa rounded-lg border border-rule bg-paper p-2 shadow-plate ${className}`} aria-hidden="true">
      <div className="ja-placa relative overflow-hidden rounded-md bg-deep-calm" style={{ aspectRatio: proporcao }}>
        {children}
      </div>
    </div>
  );
}

/** Pulso que percorre um caminho. `dur` e `fase` em segundos. */
function Pulso({ d, dur, fase, cor = AZUL }: { d: string; dur: number; fase: number; cor?: string }) {
  return (
    <path
      d={d}
      pathLength={100}
      className="ja-pulso"
      stroke={cor}
      strokeWidth={1.6}
      style={{ ["--dur" as string]: `${dur}s`, ["--fase" as string]: `${fase}s` } as CSSProperties}
    />
  );
}

/** Anel com sonar: o ponto de onde a investigacao parte. */
function Origem({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        className="sonar-onda"
        stroke={AZUL}
        strokeWidth={0.8}
        style={{ ["--escala" as string]: 3.2, ["--dur" as string]: "4.6s", transformBox: "fill-box", transformOrigin: "center" } as CSSProperties}
      />
      <circle cx={x} cy={y} r={r * 2} stroke={AZUL} strokeWidth={0.8} opacity={0.8} />
      <circle cx={x} cy={y} r={r * 0.75} fill={AZUL} />
    </g>
  );
}

/** Ponto investigado: anel fino, sem preenchimento. */
function Alvo({ x, y, r = 3.4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} stroke={PAPEL} strokeOpacity={0.85} strokeWidth={0.9} />
      <circle cx={x} cy={y} r={1.1} fill={PAPEL} fillOpacity={0.85} />
    </g>
  );
}

/**
 * Figura de corpo com um desenho por cima, no mesmo viewBox. `recorte`
 * aproxima a figura numa faixa de y (o busto, por exemplo): a figura cresce
 * e a caixa corta o resto, com o pe da faixa esvanecendo por mascara.
 */
function FiguraComCamada({
  vista,
  camadas,
  animar,
  recorte,
  children,
}: {
  vista: "frontal" | "perfil";
  camadas: Parameters<typeof FiguraCorpo>[0]["camadas"];
  animar: boolean;
  /** [y0, y1] no viewBox de 560. Sem ele a figura aparece inteira. */
  recorte?: [number, number];
  children: ReactNode;
}) {
  const largura = vista === "frontal" ? 221 : 118;
  const [y0, y1] = recorte ?? [0, 560];
  const escala = 560 / (y1 - y0);
  return (
    <div
      className={`ja-figura absolute inset-0 ${recorte ? "ja-figura-recorte" : ""}`}
      style={
        {
          ["--escala-fig" as string]: escala,
          ["--topo-fig" as string]: -y0 / 560,
        } as CSSProperties
      }
    >
      <div className="ja-figura-caixa" style={{ aspectRatio: `${largura} / 560` }}>
        <FiguraCorpo vista={vista} camadas={camadas} animar={animar} className="ja-figura-svg" />
        <svg
          viewBox={`0 0 ${largura} 560`}
          className="ja-figura-svg"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- abertura */

/**
 * "Uma avaliação que vai além do local da dor." O primeiro exemplo da
 * introducao, desenhado: a dor cervical (anel com sonar) e os fios ate a
 * mandibula e os ombros, por onde a investigacao continua.
 */
const CERVICAL = { x: 110.5, y: 102.5 };
const DESTINOS_DA_CERVICAL = [
  { x: 95, y: 73, d: "M110.5 102.5 Q 99 92 95 73", dur: 5.2, fase: 0 },
  { x: 126, y: 73, d: "M110.5 102.5 Q 122 92 126 73", dur: 5.2, fase: 2.6 },
  { x: 54.5, y: 149.5, d: "M110.5 102.5 Q 74 108 54.5 149.5", dur: 6.4, fase: 1.3 },
  { x: 166.5, y: 149.5, d: "M110.5 102.5 Q 147 108 166.5 149.5", dur: 6.4, fase: 3.9 },
];

export function FiguraDaAbertura() {
  return (
    <Chapa proporcao="4 / 5">
      <Trama />
      <FiguraComCamada vista="frontal" camadas={["prumo", "silhueta"]} animar={false} recorte={[18, 300]}>
        {DESTINOS_DA_CERVICAL.map((a) => (
          <path key={a.d} d={a.d} stroke={AZUL} strokeOpacity={0.6} strokeWidth={0.8} />
        ))}
        {DESTINOS_DA_CERVICAL.map((a) => (
          <Pulso key={`p${a.d}`} d={a.d} dur={a.dur} fase={a.fase} />
        ))}
        {DESTINOS_DA_CERVICAL.map((a) => (
          <Alvo key={`a${a.d}`} x={a.x} y={a.y} r={3} />
        ))}
        <Origem x={CERVICAL.x} y={CERVICAL.y} r={2.6} />
      </FiguraComCamada>
    </Chapa>
  );
}

/* ------------------------------------------------------------- etapa 2 */

/**
 * "...possíveis alterações relacionadas aos nervos periféricos e à coluna
 * vertebral." De perfil: o trajeto do nervo da coluna lombar ate o pe, com
 * tres pontos de teste no caminho (coxa, joelho, pe). O pulso desce pelo
 * nervo.
 */
const NERVO =
  "M50.5 262 C 45 292, 37 322, 40 345 C 43 368, 50 390, 50 408 C 50 430, 44 455, 44 480 C 44 500, 44 515, 45 524";

export function FiguraDoExame() {
  return (
    <Chapa proporcao="3 / 4">
      <Trama />
      <FiguraComCamada vista="perfil" camadas={["prumo", "silhueta", "coluna"]} animar={false} recorte={[228, 548]}>
        <path d={NERVO} stroke={AZUL} strokeOpacity={0.55} strokeWidth={1} />
        <Pulso d={NERVO} dur={5.6} fase={0} cor={PAPEL} />
        <Origem x={50.5} y={262} r={2.4} />
        <Alvo x={40} y={345} r={2.8} />
        <Alvo x={50} y={408} r={2.8} />
        <Alvo x={45} y={524} r={2.8} />
      </FiguraComCamada>
    </Chapa>
  );
}

/* ------------------------------------------------------------- etapa 4 */

/**
 * "Músculos, articulações, fáscias e nervos participam de um sistema de
 * movimento interdependente." A figura inteira com a cadeia e as
 * articulacoes do site (a corrente da cadeia ja anda sozinha), e por cima
 * os dois exemplos do texto: ombro e coluna toracica, cervical e mandibula.
 */
const PARES_DAS_CONEXOES = [
  { d: "M166.5 149.5 Q 140 150 110.5 170", a: { x: 166.5, y: 149.5 }, b: { x: 110.5, y: 170 }, dur: 5, fase: 0 },
  { d: "M110.5 102.5 Q 104 88 95 73", a: { x: 110.5, y: 102.5 }, b: { x: 95, y: 73 }, dur: 4.4, fase: 2.2 },
];

export function FiguraDasConexoes() {
  return (
    <Chapa proporcao="3 / 4">
      <Trama />
      <FiguraComCamada vista="frontal" camadas={["prumo", "silhueta", "coluna", "cadeia", "articulacoes"]} animar recorte={[24, 430]}>
        {PARES_DAS_CONEXOES.map((p) => (
          <g key={p.d}>
            <path d={p.d} stroke={AZUL} strokeWidth={1.1} />
            <Pulso d={p.d} dur={p.dur} fase={p.fase} cor={PAPEL} />
            <circle cx={p.a.x} cy={p.a.y} r={3.6} stroke={AZUL} strokeWidth={1} />
            <circle cx={p.b.x} cy={p.b.y} r={3.6} stroke={AZUL} strokeWidth={1} />
          </g>
        ))}
      </FiguraComCamada>
    </Chapa>
  );
}

/* ------------------------------------------------------------- etapa 5 */

/**
 * "...recepção, transmissão e processamento das informações provenientes do
 * corpo." O sinal entra pela esquerda, corre pela linha e, no terco final,
 * onde e' processado, a mesma entrada sai com amplitude maior: e' a
 * "alteração na sensibilidade" do paragrafo seguinte. Tres marcos no eixo,
 * um por fase, sem rotulo.
 */
function onda(): string {
  const pts: string[] = [];
  for (let x = 0; x <= 400; x += 2) {
    const fase = x / 400;
    const amp = fase < 0.62 ? 10 : 10 + (fase - 0.62) * 70;
    const pico = Math.exp(-(((x % 64) - 32) ** 2) / 30) * amp * 2.2;
    const y = 120 - Math.sin(x / 9) * amp * 0.35 - pico;
    pts.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}
const ONDA = onda();

export function FiguraDoSinal() {
  return (
    <Chapa proporcao="16 / 10">
      <Trama />
      <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1={0} y1={120} x2={400} y2={120} stroke={PAPEL} strokeOpacity={0.18} strokeWidth={1} />
        <rect x={248} y={24} width={152} height={190} fill={PAPEL} fillOpacity={0.05} />
        <line x1={248} y1={24} x2={248} y2={214} stroke={AZUL} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 4" />
        <path d={ONDA} stroke={PAPEL} strokeOpacity={0.55} strokeWidth={1.2} />
        <Pulso d={ONDA} dur={7} fase={0} />
        {[40, 200, 330].map((x, i) => (
          <g key={x}>
            <line x1={x} y1={222} x2={x} y2={232} stroke={PAPEL} strokeOpacity={0.6} strokeWidth={1} />
            {i === 0 ? <Origem x={x} y={120} r={3} /> : <Alvo x={x} y={120} r={3.4} />}
          </g>
        ))}
        <line x1={40} y1={227} x2={330} y2={227} stroke={PAPEL} strokeOpacity={0.3} strokeWidth={1} />
      </svg>
    </Chapa>
  );
}

/* ------------------------------------------------------------- etapa 8 */

/**
 * "...o acompanhamento conjunto com médicos, otorrinolaringologistas,
 * neurologistas, dentistas, psicólogos ou outros profissionais..." Seis
 * nos em roda, um por area que o texto nomeia, todos ligados ao centro, que
 * e' o paciente. O pulso vai de cada no ao centro, um de cada vez.
 */
const CENTRO = { x: 200, y: 125 };
const RAIO = 88;
const NOS = Array.from({ length: 6 }, (_, i) => {
  const ang = -Math.PI / 2 + (i * Math.PI) / 3;
  return { x: +(CENTRO.x + Math.cos(ang) * RAIO * 1.35).toFixed(1), y: +(CENTRO.y + Math.sin(ang) * RAIO).toFixed(1) };
});

export function FiguraDaRede() {
  return (
    <Chapa proporcao="16 / 10">
      <Trama />
      <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full" fill="none" strokeLinecap="round">
        <ellipse cx={CENTRO.x} cy={CENTRO.y} rx={RAIO * 1.35} ry={RAIO} stroke={PAPEL} strokeOpacity={0.2} strokeWidth={1} strokeDasharray="2 5" />
        {NOS.map((n, i) => {
          const d = `M${n.x} ${n.y} L${CENTRO.x} ${CENTRO.y}`;
          return (
            <g key={d}>
              <path d={d} stroke={PAPEL} strokeOpacity={0.35} strokeWidth={1} />
              <Pulso d={d} dur={7.2} fase={i * 1.2} />
              <Alvo x={n.x} y={n.y} r={6} />
            </g>
          );
        })}
        <Origem x={CENTRO.x} y={CENTRO.y} r={5} />
      </svg>
    </Chapa>
  );
}

/** Trama milimetrada da placa: fios finos de 24px, como a grade das bandas. */
function Trama() {
  return <div className="ja-trama absolute inset-0" />;
}
