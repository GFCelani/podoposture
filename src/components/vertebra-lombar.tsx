import Image from "next/image";

/**
 * A vertebra lombar do hero: ilustracao em tres quartos, fundo transparente,
 * traco azul e facetas em verde-oliva. E' o contrapeso do bloco de titulo.
 *
 * public/vertebra-lombar.png tem 1043 x 1058 de tinta util. Renderizada em
 * ate 540px de largura, isso da 1,93x de densidade na retina: a 522px ou
 * menos e' 2x cheio. Nao e' ampliada em nenhuma faixa.
 *
 * Sem rotulo nenhum, de proposito. Os niveis C7 / T12 / L5 da coluna antiga
 * nao cabem numa vertebra unica, e nomear o nivel (L1..L5) seria afirmar o
 * que a peca isolada nao permite afirmar. Rotulo errado num site de clinica
 * de coluna e' pior que rotulo nenhum. As partes anatomicas tambem sairam:
 * viravam material didatico, e o registro aqui e' clinico.
 *
 * Um transform por no': a respiracao vive no <img>, a entrada no wrapper.
 * Repouso no estilo base; com movimento reduzido a animacao para no repouso.
 *
 * A opacidade fica no <img>, nao no wrapper: .rule-in declara opacity: 1 em
 * folha sem layer e venceria o utilitario. E assim os rotulos e os fios nao
 * fiquem presos a ela. 0,75 foi o valor medido: em 0,94 o corpo
 * vira placa branca, em 0,70 comeca a afundar no petroleo.
 */

/** Verde-oliva medido nas facetas da propria ilustracao (media #c8d1a6). */
const OLIVA = "#c8d1a6";

/**
 * Pontos de sonar sobre a peca: posicao em porcentagem da caixa da imagem,
 * cor da paleta da ilustracao, duracao e fase proprias para nunca pulsarem
 * em unissono. Sao HTML com tamanho em px, entao a onda tem o mesmo tamanho
 * na tela em qualquer largura; so a posicao acompanha a imagem.
 */
const SONAR = [
  { x: 57.5, y: 9.0, cor: "var(--color-accent-light)", dur: 3.6, fase: 0.0 },
  { x: 9.0, y: 31.0, cor: OLIVA, dur: 4.4, fase: 1.3 },
  { x: 94.5, y: 55.5, cor: "var(--color-accent-light)", dur: 3.9, fase: 0.6 },
  { x: 45.0, y: 83.0, cor: OLIVA, dur: 4.9, fase: 2.1 },
  { x: 77.0, y: 28.5, cor: "var(--color-accent-light)", dur: 4.1, fase: 2.9 },
] as const;

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
        sizes="(min-width: 1024px) 540px, 320px"
        className="vertebra-respira h-auto w-full select-none opacity-75"
        draggable={false}
      />

      {/* Detalhes em verde-oliva, no viewBox da imagem: contornos deslocados
          que acompanham a silhueta sem redesenha-la, um arco de aproximacao
          e pontos soltos, na mesma familia dos arcos azuis que a propria
          ilustracao ja traz. Traco em espessura de tela (non-scaling), entao
          nao engrossa nem some ao escalar. Abaixo de md a imagem tem menos de
          320px e isto viraria ruido: sai. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1043 1058"
        className="rule-in pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block"
        style={{ ["--in-delay" as string]: "980ms" }}
        fill="none"
        stroke={OLIVA}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <g vectorEffect="non-scaling-stroke" strokeWidth={1}>
          {/* contorno do corpo, por fora do arco azul que ja existe */}
          <path d="M 112 640 Q 78 940 372 1052" strokeOpacity={0.7} strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
          {/* borda direita do processo espinhoso */}
          <path d="M 688 92 Q 724 210 800 262" strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
          {/* dorso da asa transversa direita */}
          <path d="M 748 552 Q 890 532 1018 580" strokeOpacity={0.6} strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
          {/* arco de aproximacao, alto e a direita */}
          <path d="M 640 26 Q 985 96 1004 452" strokeOpacity={0.45} vectorEffect="non-scaling-stroke" />
          {/* tracos curtos de medida, no arco */}
          <path d="M 968 300 l 14 -3 M 992 386 l 14 -2" strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
        </g>
        <g fill={OLIVA} stroke="none">
          <circle cx={104} cy={512} r={3} fillOpacity={0.75} />
          <circle cx={958} cy={150} r={2.5} fillOpacity={0.6} />
          <circle cx={846} cy={952} r={3} fillOpacity={0.7} />
          <circle cx={372} cy={1052} r={2.5} fillOpacity={0.6} />
        </g>
      </svg>

      {/* Sonar: ponto fixo e duas ondas defasadas que expandem e somem. So
          transform e opacity. A onda tem opacity 0 no estilo base: com
          movimento reduzido ela nunca aparece, e o ponto fica parado. */}
      {SONAR.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          {[0, 0.5].map((k) => (
            <span
              key={k}
              className="sonar-onda absolute -top-[5px] -left-[5px] h-[10px] w-[10px] rounded-full border-[1.5px]"
              style={{
                borderColor: s.cor,
                ["--dur" as string]: `${s.dur}s`,
                ["--fase" as string]: `${s.fase + k * s.dur}s`,
              }}
            />
          ))}
          <span
            className="sonar-ponto absolute -top-[3px] -left-[3px] h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: s.cor,
              boxShadow: `0 0 6px ${s.cor}`,
              ["--dur" as string]: `${s.dur}s`,
              ["--fase" as string]: `${s.fase}s`,
            }}
          />
        </span>
      ))}

    </div>
  );
}
