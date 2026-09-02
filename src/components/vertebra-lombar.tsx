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
