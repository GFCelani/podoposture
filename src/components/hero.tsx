import Image from "next/image";
import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { SpineColumn } from "./spine-column";

/**
 * O bloco do hero escala como conjunto a partir de lg: numeral, corpo do
 * titulo, entrelinha, botoes e os espacos entre eles crescem pelo mesmo
 * fator (~1,15). Isto e' a parte dos botoes; o resto esta nas classes lg:
 * de cada peca. Degraus fixos por faixa, como o titulo: nada de clamp por
 * vw nem de media query por altura.
 */
const ESCALA_BOTAO = "lg:gap-4 lg:px-8 lg:py-4 lg:text-[1.0625rem]";

/** Mascara do campo: some onde o titulo passa, cheia onde a coluna esta. */
const MASCARA =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.22) 24%, rgba(0,0,0,0.75) 46%, #000 64%)";

export function Hero() {
  return (
    <section
      data-tone="deep"
      className="relative overflow-hidden bg-hero text-paper"
    >
      {/* Camada 0: a clinica, quase apagada sob o petroleo. Dessaturada e
          com veu escuro por cima; trocar a foto quando vier a nova. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/img/clinica-podoposture-5.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[34%_45%] opacity-[0.34] saturate-[0.25]"
        />
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(to right, rgb(32 69 90 / 0.88) 0%, rgb(32 69 90 / 0.56) 32%, rgb(32 69 90 / 0.3) 56%, rgb(32 69 90 / 0.62) 82%, rgb(32 69 90 / 0.86) 100%)",
              "linear-gradient(to bottom, rgb(32 69 90 / 0.7) 0%, transparent 22%, transparent 74%, rgb(32 69 90 / 0.62) 100%)",
            ].join(", "),
          }}
        />
      </div>

      {/* Camada 0.5: luz de janela. Nao e cor de marca, e' luz: um ambar
          muito diluido que tira o azul frio do petroleo do lado onde o
          texto vive, e um respiro claro no alto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(115% 85% at 2% -8%, rgb(255 196 118 / 0.4) 0%, rgb(255 196 118 / 0.15) 32%, transparent 62%)",
            "radial-gradient(75% 62% at 76% 110%, rgb(255 188 116 / 0.2) 0%, transparent 58%)",
            "radial-gradient(48% 54% at 74% 42%, rgb(255 206 150 / 0.12) 0%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* Camada 1: a grade da pagina, na mesma geometria de todas as bandas */}
      <PageGrid tone="deep" />

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

        {/* Campo de aprumo. No telefone entra no fluxo, sangrando de borda a
            borda; no desktop passa a ocupar dois tercos da largura do hero,
            por tras do titulo, com a mascara devolvendo a legibilidade. */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative -mx-6 mt-12 h-[clamp(340px,52svh,460px)] w-[calc(100%+3rem)] lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:h-auto lg:w-[64%]"
          style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
        >
          <SpineColumn className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}
