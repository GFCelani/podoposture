import Image from "next/image";

/**
 * A vertebra lombar do hero: ilustracao em tres quartos, fundo transparente,
 * traco azul e facetas em verde-oliva. E' o contrapeso do bloco de titulo.
 *
 * public/vertebra-lombar.png tem 1043 x 1058 de tinta util. Renderizada em
 * ate 540px de largura, isso da 1,93x de densidade na retina: a 522px ou
 * menos e' 2x cheio. Nao e' ampliada em nenhuma faixa.
 *
 * Legendas: os niveis C7 / T12 / L5 da coluna antiga nao fazem sentido numa
 * vertebra unica (nao existe C7 numa lombar). Entram no lugar as partes da
 * propria peca, na mesma linguagem: fio fino, ponto na ancora, rotulo mono.
 * Os fios sao SVG no viewBox da imagem, entao escalam com ela; os rotulos
 * sao HTML posicionados em porcentagem, para o corpo do texto nao encolher
 * junto com a ilustracao nas larguras menores.
 *
 * Um transform por no': a respiracao vive no <img>, a entrada no wrapper.
 * Repouso no estilo base; com movimento reduzido a animacao para no repouso.
 *
 * A opacidade fica no <img>, nao no wrapper: .rule-in declara opacity: 1 em
 * folha sem layer e venceria o utilitario. E assim os rotulos e os fios nao
 * escurecem junto com a ilustracao. 0,75 foi o valor medido: em 0,94 o corpo
 * vira placa branca, em 0,70 comeca a afundar no petroleo.
 */

/** Ancoras em porcentagem da caixa da imagem. */
const LEGENDAS = [
  {
    rotulo: "processo espinhoso",
    ancora: [48.4, 17.5],
    ponta: [24, 10],
    caixa: "left-[2%] top-[4%] text-left",
    atraso: 900,
  },
  {
    rotulo: "processo transverso",
    ancora: [93.5, 55.5],
    ponta: [90, 44],
    caixa: "right-[2%] top-[36%] text-right",
    atraso: 1050,
  },
  {
    rotulo: "corpo vertebral",
    ancora: [21.5, 79],
    ponta: [12, 66],
    caixa: "left-[2%] top-[57%] text-left",
    atraso: 1200,
  },
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

      {/* Fios e pontos: SVG no viewBox da imagem, escala junto com ela */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        {LEGENDAS.map((l) => (
          <g
            key={l.rotulo}
            className="rule-in"
            style={{ ["--in-delay" as string]: `${l.atraso}ms` }}
          >
            <line
              x1={l.ponta[0]}
              y1={l.ponta[1]}
              x2={l.ancora[0]}
              y2={l.ancora[1]}
              stroke="var(--color-accent-light)"
              strokeOpacity={0.6}
              strokeWidth={0.28}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={l.ancora[0]}
              cy={l.ancora[1]}
              r={0.9}
              fill="var(--color-hero)"
              stroke="var(--color-accent-light)"
              strokeWidth={0.35}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {/* Rotulos: HTML em porcentagem, corpo fixo */}
      {LEGENDAS.map((l) => (
        <span
          key={l.rotulo}
          aria-hidden="true"
          className={`rule-in pointer-events-none absolute w-max max-w-[10ch] text-[0.6875rem] leading-[1.35] tracking-[0.16em] text-on-deep-muted uppercase ${l.caixa}`}
          style={{
            fontFamily: "var(--mono)",
            ["--in-delay" as string]: `${l.atraso}ms`,
          }}
        >
          {l.rotulo}
        </span>
      ))}
    </div>
  );
}
