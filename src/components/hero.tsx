import Image from "next/image";
import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { VertebraLombar } from "./vertebra-lombar";

/**
 * O bloco do hero escala como conjunto a partir de lg: numeral, corpo do
 * titulo, entrelinha, botoes e os espacos entre eles crescem pelo mesmo
 * fator (~1,15). Isto e' a parte dos botoes; o resto esta nas classes lg:
 * de cada peca. Degraus fixos por faixa, como o titulo: nada de clamp por
 * vw nem de media query por altura.
 */
const ESCALA_BOTAO = "lg:gap-4 lg:px-8 lg:py-4 lg:text-[1.0625rem]";

export function Hero() {
  return (
    <section
      data-tone="deep"
      className="relative overflow-hidden bg-accent-deep text-paper"
    >
      {/* Camada 0: fundo copiado do preview p3-fotografia. A foto deixa de
          ser textura quase apagada e vira o fundo real: sem opacidade
          reduzida e sem dessaturacao. Por cima, o scrim de dois gradientes
          do p3, em accent-deep, que e' o que garante a leitura do texto.
          A camada de luz de janela (ambar) saiu junto: ela nao existe no p3,
          e mante-la faria o fundo nao bater com a referencia. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/img/clinica-podoposture-5.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[34%_45%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(to top, rgb(13 37 54 / 0.95) 0%, rgb(13 37 54 / 0.9) 42%, rgb(13 37 54 / 0.55) 72%, rgb(13 37 54 / 0.35) 100%)",
              "linear-gradient(to right, rgb(13 37 54 / 0.92) 0%, rgb(13 37 54 / 0.6) 46%, rgb(13 37 54 / 0.28) 100%)",
            ].join(", "),
          }}
        />
      </div>

      {/* Camada 1: a grade da pagina, na mesma geometria de todas as bandas.
          O hero e' a unica banda que acende os fios de coluna. */}
      <PageGrid tone="deep" colunas />

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-0 px-6 pt-20 pb-16 lg:min-h-[calc(100svh-92px)] lg:grid-cols-12 lg:gap-6 lg:px-10 lg:py-16 lg:[@media(max-height:860px)]:py-7">
        <div className="relative z-10 lg:col-span-9">
          <div className="rule-in" style={{ ["--in-delay" as string]: "80ms" }}>
            <SectionMark n="01" tone="deep" destaque />
          </div>

          {/*
            Quebra escrita, nao emergente. O corpo do titulo e' um bloco por
            linha, entao o navegador nao tem o que decidir: nao ha text-balance,
            nao ha clamp por vw e nao ha corpo por altura de janela. Era esse
            trio que fazia o mesmo titulo cair diferente em desktop e em laptop
            (o @media max-height trocava o corpo por altura, e o balance
            redistribuia as palavras em cada largura).
            Corpo em degraus fixos por faixa; dentro de cada faixa a linha mais
            larga cabe com folga sobre a fonte de fallback, entao a quebra
            tambem nao muda no swap da Newsreader e a altura do bloco e' a
            mesma antes e depois: linhas x corpo x entrelinha, sem CLS.
          */}
          <h1
            className="rule-in mt-9 font-display lg:mt-11 [@media(max-height:860px)]:mt-6 text-[34px] min-[390px]:text-[40px] sm:text-[60px] lg:text-[62px] xl:text-[76px] leading-[1.03] font-medium tracking-[-0.025em] text-paper"
            style={{ ["--in-delay" as string]: "220ms" }}
          >
            <span className="block">
              <span className="block sm:inline">Integração </span>
              <span className="block sm:inline">terapêutica </span>
            </span>
            <span className="block">
              <mark className="marca-grifo">efetiva</mark>, inovadora{" "}
            </span>
            <span className="block">com resultados </span>
            <span className="block">rápidos e eficazes</span>
          </h1>

          {/* Acao do hero. Rotulos e destinos ja existentes na pagina:
              o primario e' o par completo da secao 08, rotulo e destino; o
              secundario
              e' o CTA da Avaliacao Clinica da Dor Persistente, a porta de
              entrada clinica. */}
          <div
            className="rule-in mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:mt-12 lg:gap-5"
            style={{ ["--in-delay" as string]: "620ms" }}
          >
            <ButtonLink href="https://wa.me/5521992035643" variant="primary" className={ESCALA_BOTAO}>
              Envie uma mensagem
            </ButtonLink>
            <ButtonLink href="/tratamento-da-dor" variant="secondary-deep" className={ESCALA_BOTAO}>
              Quero mais informações
            </ButtonLink>
          </div>

          {/* Curva de forca da marcha: o duplo pico de cada passo, o
              vocabulario da baropodometria, correndo sob o titulo */}
          <svg
            aria-hidden="true"
            viewBox="0 0 420 46"
            className="rule-in mt-8 h-11 w-full max-w-[440px] lg:mt-10 lg:h-[3.25rem] lg:max-w-[506px] [@media(max-height:860px)]:mt-4 [@media(max-height:860px)]:h-8"
            style={{ ["--in-delay" as string]: "760ms" }}
          >
            <path
              className="traco-monitor"
              d="M0 40 H24 C34 40 36 16 46 15 C54 14 56 26 66 27 C76 28 78 13 86 13 C96 13 100 40 110 40 H164 C174 40 176 16 186 15 C194 14 196 26 206 27 C216 28 218 13 226 13 C236 13 240 40 250 40 H304 C314 40 316 16 326 15 C334 14 336 26 346 27 C356 28 358 13 366 13 C376 13 380 40 390 40 H420"
              fill="none"
              stroke="var(--color-accent-light)"
              strokeOpacity={0.55}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
            <circle className="traco-monitor-ponto" cx={0} cy={40} r={2.6} fill="var(--color-accent-light)" />
          </svg>

        </div>

        {/*
          A vertebra: contrapeso do bloco de titulo. Nao ha mais mascara: o
          corpo dela e' quase branco, e titulo branco por cima mataria o
          contraste. Em vez de mascarar, ela nao passa por baixo do texto.
          O campo comeca 24px depois do fim da linha mais larga do titulo e
          vai ate a borda da janela. A margem direita da imagem e' metade da
          margem do contentor ((50vw - 580px) / 2), com piso de 64px: a
          imagem termina a meio caminho entre a borda de conteudo e a borda
          da janela. Teto de 600px; ate la, o que limita e' o campo. De 1024
          a 1280 a margem ja esta no piso e a folga com o titulo e' fixa,
          entao ali a imagem nao tem para onde crescer. As constantes vem da
          geometria do titulo: em lg a linha mais larga termina em 606px
          (pad 40 + 566); em xl, em 50vw + 114 (contentor centrado + 694).
          Se o corpo do titulo mudar, estes dois calc mudam junto.

          Abaixo de lg entra no fluxo, depois da curva de marcha, centrada e
          reduzida (ate 320px): e' a peca grafica do hero, entao fica; so
          nao ocupa a altura que ocupava a coluna inteira.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative mx-auto mt-12 w-[min(78vw,320px)] lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:flex lg:w-[calc(100vw-630px)] lg:items-center lg:justify-end lg:pr-[max(64px,25vw_-_290px)] xl:w-[calc(50vw-138px)]"
        >
          {/* Linhas de referencia da versao com a coluna em SVG: 1px em papel a
              0,3, com o traco curto de 14px x 1,4px na ponta direita, mais
              claro, e recolhem e voltam a partir da esquerda (so scaleX). Vivem no campo, nao na imagem: atravessam a vertebra e
              seguem ate 36px da borda da janela, que e' o "alem dela". Nunca
              entram no titulo porque o campo comeca depois dele. Atras da
              imagem, como as reguas ficavam atras das vertebras. Sem rotulo:
              C7 / T12 / L5 nao cabem numa vertebra unica. Abaixo de lg o campo
              e' estreito e entra no fluxo; ali as linhas so poluiriam. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
            {[24, 50, 76].map((y, i) => (
              <div
                key={y}
                className="rule-in absolute right-9 left-0"
                style={{ top: `${y}%`, ["--in-delay" as string]: `${760 + i * 140}ms` }}
              >
                <div
                  className="estende h-px w-full bg-paper/30"
                  style={{ ["--dur" as string]: `${9 + i * 2.5}s`, ["--fase" as string]: `${i * 1.7}s` }}
                />
                <div className="absolute -top-px -right-5 h-[1.4px] w-[14px] bg-paper/80" />
              </div>
            ))}
          </div>
          <VertebraLombar className="relative w-full lg:max-w-[600px]" />
        </div>
      </div>
    </section>
  );
}
