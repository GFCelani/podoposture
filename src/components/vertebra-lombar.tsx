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

    </div>
  );
}
