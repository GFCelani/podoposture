import Image from "next/image";

/**
 * A vertebra lombar do hero: ilustracao em tres quartos, fundo transparente,
 * traco azul e facetas em verde-oliva. E' o contrapeso do bloco de titulo.
 *
 * public/vertebra-lombar.png tem 1043 x 1058 de tinta util. Renderizada em
 * ate 600px de largura, isso da 1,74x de densidade na retina; a 522px ou
 * menos e' 2x cheio. Nao e' ampliada em nenhuma faixa.
 *
 * Sem rotulo nenhum, de proposito. Os niveis C7 / T12 / L5 da coluna antiga
 * nao cabem numa vertebra unica, e nomear o nivel (L1..L5) seria afirmar o
 * que a peca isolada nao permite afirmar. Rotulo errado num site de clinica
 * de coluna e' pior que rotulo nenhum.
 *
 * Movimento, tudo em transform e opacity, cada no com um unico transform,
 * repouso no estilo base (com movimento reduzido tudo para no repouso e
 * continua visivel):
 *   - sonar: sete pontos com halo, tres ondas cada, fase e ritmo proprios;
 *   - dois arcos curtos varrendo em volta do corpo, em sentidos opostos;
 *   - um arco tracejado girando devagar: os tracos correm;
 *   - o arco de aproximacao oscila, com os tracos de medida junto;
 *   - os pontos soltos flutuam.
 * Como sao arcos de circulo, girar em torno do centro do circulo mantem o
 * arco sobre a mesma trajetoria: e' o que permite "percorrer o contorno" so
 * com transform, sem dashoffset.
 *
 * A opacidade da ilustracao fica no <img>, nao no wrapper: .rule-in declara
 * opacity: 1 em folha sem layer e venceria o utilitario. 0,75 foi o valor
 * medido: em 0,94 o corpo vira placa branca, em 0,70 comeca a afundar.
 */

/** Verde-oliva medido nas facetas da propria ilustracao (media #c8d1a6). */
const OLIVA = "#c8d1a6";
const AZUL = "var(--color-accent-light)";

/** Centro do corpo vertebral no viewBox: os arcos giram em torno dele. */
const CX = 470;
const CY = 860;
const GIRO = {
  transformBox: "view-box",
  transformOrigin: `${CX}px ${CY}px`,
} as const;

/**
 * Pontos de sonar: posicao em porcentagem da caixa da imagem, cor da paleta
 * da ilustracao, duracao e fase proprias para nunca pulsarem em unissono.
 * HTML com tamanho em px: a onda e' a mesma na tela em qualquer largura.
 */
const SONAR = [
  { x: 57.5, y: 9.0, cor: AZUL, dur: 3.6, fase: 0.0 },
  { x: 9.0, y: 31.0, cor: OLIVA, dur: 4.4, fase: 1.3 },
  { x: 94.5, y: 55.5, cor: AZUL, dur: 3.9, fase: 0.6 },
  { x: 45.0, y: 83.0, cor: OLIVA, dur: 4.9, fase: 2.1 },
  { x: 77.0, y: 28.5, cor: AZUL, dur: 4.1, fase: 2.9 },
  { x: 29.0, y: 60.0, cor: AZUL, dur: 4.6, fase: 1.8 },
  { x: 66.0, y: 46.0, cor: OLIVA, dur: 3.8, fase: 3.4 },
] as const;

/** Pontos soltos: x, y, raio, duracao, fase. */
const SOLTOS: [number, number, number, string, string][] = [
  [104, 512, 3.5, "6.5s", "0s"],
  [958, 150, 3, "5.6s", "1.4s"],
  [846, 952, 3.5, "7.2s", "2.6s"],
  [372, 1052, 3, "6.1s", "0.9s"],
  [1012, 690, 2.5, "5.2s", "3.1s"],
];

/** Arco de circulo em torno de (CX, CY), de a1 a a2 graus (0 = direita). */
function arco(r: number, a1: number, a2: number): string {
  const rad = (a: number) => (a * Math.PI) / 180;
  const x1 = (CX + r * Math.cos(rad(a1))).toFixed(1);
  const y1 = (CY + r * Math.sin(rad(a1))).toFixed(1);
  const x2 = (CX + r * Math.cos(rad(a2))).toFixed(1);
  const y2 = (CY + r * Math.sin(rad(a2))).toFixed(1);
  const grande = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${grande} 1 ${x2} ${y2}`;
}

export function VertebraLombar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rule-in relative ${className}`}
      style={{ ["--in-delay" as string]: "420ms" }}
    >
      <Image
        src="/vertebra-lombar.png"
        alt="Ilustração de uma vértebra lombar vista em três quartos, com o corpo vertebral à frente e os processos espinhoso e transversos ao fundo"
        width={1043}
        height={1058}
        priority
        sizes="(min-width: 1024px) 600px, 320px"
        className="vertebra-respira h-auto w-full select-none opacity-75"
        draggable={false}
      />

      {/* Camada animada em verde e azul, no viewBox da imagem. Traco em
          espessura de tela (non-scaling), entao nao engrossa nem some ao
          escalar. Abaixo de md a imagem tem menos de 320px e isto viraria
          ruido: sai. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1043 1058"
        className="rule-in pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block"
        style={{ ["--in-delay" as string]: "900ms" }}
        fill="none"
        strokeLinecap="round"
      >
        {/* arco tracejado que gira devagar em volta do corpo: os tracos correm */}
        <path
          className="gira"
          style={{ ...GIRO, ["--dur" as string]: "48s" }}
          d={arco(318, 95, 250)}
          stroke={OLIVA}
          strokeOpacity={0.75}
          strokeWidth={1.25}
          strokeDasharray="5 9"
          vectorEffect="non-scaling-stroke"
        />

        {/* dois arcos curtos varrendo em sentidos opostos, como um scanner */}
        <path
          className="gira"
          style={{ ...GIRO, ["--dur" as string]: "11s" }}
          d={arco(345, 120, 168)}
          stroke={AZUL}
          strokeOpacity={0.9}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="gira"
          style={{
            ...GIRO,
            ["--dur" as string]: "17s",
            ["--sentido" as string]: "reverse",
          }}
          d={arco(372, 200, 228)}
          stroke={OLIVA}
          strokeOpacity={0.9}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        {/* arco de aproximacao no alto, a direita, oscilando com os tracos de
            medida junto: gira em torno do proprio centro de circulo */}
        <g
          className="varre"
          style={{
            transformBox: "view-box",
            transformOrigin: "610px 430px",
            ["--dur" as string]: "7s",
            ["--ang" as string]: "10deg",
          }}
          stroke={OLIVA}
        >
          <path
            d="M 632 32 A 400 400 0 0 1 1009 448"
            strokeOpacity={0.7}
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 968 300 l 16 -4 M 998 386 l 16 -3 M 902 190 l 12 -10"
            strokeOpacity={0.9}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* contorno curto na borda do processo espinhoso e tracejado no dorso
            da asa, estaticos: sao a ancora do resto */}
        <path
          d="M 688 92 Q 724 210 800 262"
          stroke={OLIVA}
          strokeOpacity={0.7}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 748 552 Q 890 532 1018 580"
          stroke={OLIVA}
          strokeOpacity={0.7}
          strokeWidth={1.25}
          strokeDasharray="3 6"
          vectorEffect="non-scaling-stroke"
        />

        {/* pontos soltos que flutuam, cada um no seu ritmo */}
        <g fill={OLIVA} stroke="none">
          {SOLTOS.map(([x, y, r, dur, fase]) => (
            <circle
              key={`${x}-${y}`}
              className="flutua"
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                ["--dur" as string]: dur,
                ["--fase" as string]: fase,
              }}
              cx={x}
              cy={y}
              r={r}
              fillOpacity={0.85}
            />
          ))}
        </g>
      </svg>

      {/* Sonar: ponto com halo e tres ondas defasadas que expandem e somem. A
          onda tem opacity 0 no estilo base: com movimento reduzido nao ha
          onda, so o ponto parado, com halo. */}
      {SONAR.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          {[0, 1 / 3, 2 / 3].map((k) => (
            <span
              key={k}
              className="sonar-onda absolute -top-[6px] -left-[6px] h-[12px] w-[12px] rounded-full border-2"
              style={{
                borderColor: s.cor,
                ["--dur" as string]: `${s.dur}s`,
                ["--fase" as string]: `${s.fase + k * s.dur}s`,
              }}
            />
          ))}
          <span
            className="sonar-ponto absolute -top-[4px] -left-[4px] h-[8px] w-[8px] rounded-full"
            style={{
              backgroundColor: s.cor,
              boxShadow: `0 0 10px 3px ${s.cor}, 0 0 26px 8px color-mix(in srgb, ${s.cor} 45%, transparent)`,
              ["--dur" as string]: `${s.dur}s`,
              ["--fase" as string]: `${s.fase}s`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
