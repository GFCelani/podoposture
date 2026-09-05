import { ButtonLink } from "./button-link";
import { FiguraEsquematica } from "./figura-esquematica";
import { FundoOndulado } from "./fundo-ondulado";
import { SectionMark } from "./layers";

/**
 * O bloco do hero escala como conjunto a partir de lg: numeral, corpo do
 * titulo, entrelinha, botoes e os espacos entre eles crescem pelo mesmo
 * fator (~1,15). Isto e' a parte dos botoes; o resto esta nas classes lg:
 * de cada peca. Degraus fixos por faixa, como o titulo: nada de clamp por
 * vw.
 * Na janela baixa (laptop, ate 860px de altura) os botoes descem junto com
 * o titulo: caixa e corpo menores que o proprio degrau de base, para nao
 * ficarem grandes ao lado de um titulo de 50/61px. A regra e' essa, e vale
 * para qualquer degrau futuro: se o texto desce, o botao desce com ele.
 * Corpo 15px, caixa 24x11, o que da 48px de altura contra os 55 do degrau
 * de desktop; a seta e' medida em em no proprio ButtonLink,
 * entao ela nao precisa de degrau proprio e nunca sobra na caixa menor.
 * Referencia da proporcao no desktop: rotulo de 17px sob titulo de 68/83.
 */
/**
 * Curva de forca da marcha. O mesmo traco serve de geometria para a linha e
 * de trilho para o ponto: a linha e' desenhada por stroke-dash e o ponto anda
 * por offset-path sobre este d. Era esta a origem do desalinhamento: o ponto
 * andava por translateX em x, e a linha avanca por comprimento de arco. Nos
 * trechos de pico o arco cresce mais rapido que o x, entao os dois se
 * separavam no meio do ciclo. Parametrizados os dois pelo arco, ficam juntos.
 * Com pathLength="100" o dash e' contado em porcentagem do traco, e o atraso
 * negativo do ponto (-73% de 7s) o coloca na cabeca do segmento desenhado.
 *
 * Tres passos em 420 x 46 unidades. O numero de passos define a razao do
 * desenho, e a razao e' o que decide a altura, porque a largura vem de fora:
 * menos passos, passo mais largo e faixa mais alta. Tres passos na largura da
 * fila de botoes dao 54px de faixa na janela de laptop; quatro davam 40.
 */
const TRACO_MARCHA =
  "M0 40 H24 C34 40 36 16 46 15 C54 14 56 26 66 27 C76 28 78 13 86 13 C96 13 100 40 110 40 H164 C174 40 176 16 186 15 C194 14 196 26 206 27 C216 28 218 13 226 13 C236 13 240 40 250 40 H304 C314 40 316 16 326 15 C334 14 336 26 346 27 C356 28 358 13 366 13 C376 13 380 40 390 40 H420";

const ESCALA_BOTAO =
  "lg:gap-4 lg:px-8 lg:py-4 lg:text-[1.0625rem] " +
  "lg:[@media(max-height:860px)]:gap-3 lg:[@media(max-height:860px)]:px-6 " +
  "lg:[@media(max-height:860px)]:py-[11px] lg:[@media(max-height:860px)]:text-[0.9375rem]";

export function Hero() {
  return (
    <section
      data-tone="deep"
      className="relative overflow-hidden bg-accent-deep text-paper"
    >
      {/* Camada 0: o fundo. Um plano deformado por ruido, na tecnica do hero
          do Vinclo (ver fundo-ondulado.tsx), sobre um gradiente CSS nas mesmas
          tres cores. O gradiente e' o que existe antes do primeiro quadro, sem
          WebGL e sem JavaScript; o canvas aparece por cima em 600ms quando
          desenha. A fotografia e o scrim sairam com ele, e a grade de papel
          milimetrado tambem: nesta banda o relevo do fundo ja e' a textura. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, #1e2e38 0%, #27404e 46%, #304c5a 100%)",
        }}
      >
        <FundoOndulado className="absolute inset-0" />
      </div>

      {/* O hero e' a unica banda com contentor mais largo que os 1240px do
          resto da pagina: 1340 em lg. E' o que traz o bloco de texto para a
          esquerda (50px em 1440 e 1600, 20px em 1280, nada em 1024, onde o
          texto ja esta na goteira de 40px da grade). O preco e' que a
          margem esquerda do hero nao bate mais com a do cabecalho e a das
          secoes abaixo nessas larguras. Foi pedido. */}
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-0 px-6 pt-32 pb-16 lg:min-h-svh lg:max-w-[1340px] lg:grid-cols-12 lg:gap-6 lg:px-10 lg:pt-[122px] lg:pb-16 lg:[@media(max-height:860px)]:pt-[114px] lg:[@media(max-height:860px)]:pb-7">
        {/* O recuo extra na janela baixa e' o "tudo mais para a direita": vale
            para o numeral, o titulo, os botoes e a curva de marcha, e nao
            para a peca grafica, que e' absoluta e ancorada a direita. */}
        <div className="relative z-10 lg:col-span-9 lg:[@media(max-height:860px)]:pl-14">
          <div className="rule-in" style={{ ["--in-delay" as string]: "80ms" }}>
            <SectionMark n="01" tone="deep" destaque />
          </div>

          {/*
            Quebra escrita, nao emergente. O corpo do titulo e' um bloco por
            linha, entao o navegador nao tem o que decidir: nao ha text-balance
            e nao ha clamp por vw. Era esse par que fazia o mesmo titulo cair
            diferente em desktop e em laptop, porque redistribuia as palavras
            em cada largura.
            Corpo em degraus fixos por faixa; na janela baixa (laptop, ate
            860px de altura) cada degrau desce um patamar: 50px em lg, 61px em
            xl, contra 68 e 83 na janela alta. Foi pedido. Como a quebra e'
            escrita, trocar o corpo por altura aqui nao mexe em onde as linhas
            caem: muda a escala, nao a composicao.
            Dentro de cada faixa a linha mais larga cabe com folga sobre a
            fonte de fallback, entao a quebra tambem nao muda no swap da
            Newsreader e a altura do bloco e' a mesma antes e depois: linhas x
            corpo x entrelinha, sem CLS.
          */}
          <h1
            className="rule-in mt-9 font-display lg:mt-11 [@media(max-height:860px)]:mt-6 text-[34px] min-[390px]:text-[40px] sm:text-[64px] lg:text-[68px] xl:text-[83px] lg:[@media(max-height:860px)]:text-[50px] xl:[@media(max-height:860px)]:text-[61px] leading-[1.03] font-medium tracking-[-0.025em] text-paper"
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

          {/* A medida deste embrulho e' a da fila de botoes (fit-content
              sobre a fila em linha), e e' dela que a curva de marcha tira a
              sua: a ponta direita do traco cai no mesmo pixel da borda
              direita do segundo botao. So a partir de sm, que e' onde os
              botoes viram linha; empilhados eles ocupam a largura do bloco e
              o embrulho os encolheria, entao no telefone a curva continua
              presa a largura do bloco. */}
          <div className="sm:w-fit">
            {/* Acao do hero. Rotulos e destinos ja existentes na pagina:
              o primario e' o par completo da secao 08, rotulo e destino; o
              secundario
              e' o CTA da Avaliacao Clinica da Dor Persistente, a porta de
              entrada clinica. */}
            <div
              className="rule-in mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:mt-12 lg:gap-5 lg:[@media(max-height:860px)]:mt-6"
              style={{ ["--in-delay" as string]: "620ms" }}
            >
              <ButtonLink
                href="https://wa.me/5521992035643"
                variant="primary"
                className={ESCALA_BOTAO}
              >
                Envie uma mensagem
              </ButtonLink>
              <ButtonLink
                href="/tratamento-da-dor"
                variant="secondary-deep"
                className={ESCALA_BOTAO}
              >
                Quero mais informações
              </ButtonLink>
            </div>

            {/* Curva de forca da marcha: o duplo pico de cada passo, o
              vocabulario da baropodometria, correndo sob o titulo.

              Largura cheia e altura automatica: a caixa fica com a razao do
              viewBox, entao o desenho vai de borda a borda da medida do
              embrulho, que e' a fila de botoes. Antes a caixa tinha altura
              fixa e sobrava largura, e o preserveAspectRatio padrao centrava
              o desenho na sobra: a curva nascia uns 50px a direita da margem
              do texto e acabava antes do fim da linha. Nenhuma classe de
              altura aqui, por isso.

              Sao dois tracos sobre a mesma geometria. O de baixo esta sempre
              inteiro, apagado, e e' ele que garante o alinhamento visivel:
              com um traco so, o dash apagava a ponta esquerda em parte do
              ciclo e a curva parecia comecar longe da margem do texto,
              mesmo com a caixa alinhada ao pixel. O de cima e' o segmento
              que anda, e o ponto vai na cabeca dele. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 420 46"
              className="rule-in mt-8 h-auto w-full max-w-[440px] sm:max-w-none lg:mt-10 [@media(max-height:860px)]:mt-4"
              style={{ ["--in-delay" as string]: "760ms" }}
            >
              <path
                d={TRACO_MARCHA}
                fill="none"
                stroke="var(--color-accent-light)"
                strokeOpacity={0.18}
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
              <path
                className="traco-monitor"
                pathLength={100}
                d={TRACO_MARCHA}
                fill="none"
                stroke="var(--color-accent-light)"
                strokeOpacity={0.7}
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
              <circle
                className="traco-monitor-ponto"
                cx={0}
                cy={0}
                r={2.6}
                fill="var(--color-accent-light)"
                style={{ offsetPath: `path("${TRACO_MARCHA}")` }}
              />
            </svg>
          </div>
        </div>

        {/*
          O campo da peca grafica: contrapeso do bloco de titulo. A peca nao
          passa por baixo do texto: o campo comeca 24px depois do fim da
          linha mais larga do titulo e vai ate a borda da janela.

          As constantes do calc saem da geometria medida do titulo, e sao a
          soma "recuo do contentor + 40 de padding + linha mais larga + 24
          de folga". A linha mais larga muda no degrau de corpo: 621px em lg
          (68px), 758px em xl (83px). O recuo do contentor e'
          max(0, (100vw - 1340) / 2), zero ate 1340 e crescente depois; por
          isso ele entra no calc de xl, que e' a unica faixa que atravessa
          esse limite (1280 sem recuo, 1440 com 50). Se o corpo do titulo
          ou o max-w do contentor mudar, estes dois calc mudam junto.

          A margem direita afasta a peca da borda da janela: 104 / 155 / 195 /
          235px em 1024 / 1280 / 1440 / 1600. E' o que traz a figura para a
          esquerda. O piso de 104 nao e' escolha de gosto: em 1024 o campo
          tem 339px e a figura 223, entao a margem so pode chegar a 116
          antes de a peca alcancar o inicio do campo e entrar no titulo.
          Em 1280 para cima o teto e' 223 / 293 / 373, e a rampa e' que
          manda.

          Na janela baixa a margem tem rampa propria, mais inclinada que a
          da janela alta: 180 / 255 / 305 / 360px em 1024 / 1280 / 1440 /
          1600, contra 104 / 155 / 195 / 235. A inclinacao maior e' o que
          permite trazer a peca bem para a esquerda nas larguras de laptop
          (1440 e 1536) sem fechar a folga em 1024, que e' a largura onde o
          campo e' estreito e a peca inteira ja nao caberia nele.
          porque foi pedido trazer a figura mais para a esquerda no laptop.
          Em 1024 a soma de margem e peca passa da largura do campo, e o
          shrink-0 na peca e' o que decide o desempate: em vez de a figura
          encolher (o svg tem preserveAspectRatio, entao encolher a largura
          reduz o desenho inteiro e ele deixa de bater com as outras faixas),
          ela mantem o tamanho e transborda o inicio nominal do campo.

          Nessa altura o campo deixa de ser a fronteira, porque o bloco de
          texto tambem andou 56px para a direita. Quem manda ali e' a folga
          medida entre o fim da linha mais larga e a borda da peca: 53px em
          1024, 122 em 1280, 187 em 1366. Em 1024 quem chega mais perto da
          peca nao e' o titulo, e' a curva de marcha, que acompanha a largura
          do texto e para 20px antes dela. E' esse par de numeros, e nao o
          calc, que precisa ser reconferido se o corpo do titulo, o recuo do
          bloco ou a rampa de margem mudarem de novo.

          A figura e' vertical (221 x 560), entao a escala vem da altura do
          hero, nao da largura do campo: altura = altura do hero menos 112px
          (56px acima e abaixo), teto de 760px; a largura segue a proporcao.
          O campo sempre sobra em largura, entao a folga com o titulo fica
          acima do minimo medido (23px) em todas as faixas.

          Abaixo de lg entra no fluxo, depois da curva de marcha, centrada e
          limitada a min(44vw, 200px): 141px em 320, 172 em 390, 200 em 768.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative mx-auto mt-12 w-[min(78vw,320px)] lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:flex lg:pt-[90px] lg:w-[calc(100vw_-_685px)] lg:items-center lg:justify-end lg:pr-[max(104px,25vw_-_165px)] lg:[@media(max-height:860px)]:pr-[max(150px,31.25vw_-_140px)] xl:w-[calc(100vw_-_max(0px,(100vw_-_1340px)/2)_-_822px)]"
        >
          {/* Linhas de referencia da versao com a coluna em SVG: 1px em papel a
              0,3, com o traco curto de 14px x 1,4px na ponta direita, mais
              claro, e recolhem e voltam a partir da esquerda (so scaleX). Vivem no campo, nao na peca: atravessam a figura e
              seguem ate 36px da borda da janela, que e' o "alem dela". Nunca
              entram no titulo porque o campo comeca depois dele. Atras da
              peca. Sem rotulo. Abaixo de lg o campo e' estreito e entra no
              fluxo; ali as linhas so poluiriam. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden lg:block"
          >
            {[24, 50, 76].map((y, i) => (
              <div
                key={y}
                className="rule-in absolute right-9 left-0"
                style={{
                  top: `${y}%`,
                  ["--in-delay" as string]: `${760 + i * 140}ms`,
                }}
              >
                <div
                  className="estende h-px w-full bg-paper/30"
                  style={{
                    ["--dur" as string]: `${9 + i * 2.5}s`,
                    ["--fase" as string]: `${i * 1.7}s`,
                  }}
                />
                <div className="absolute -top-px -right-5 h-[1.4px] w-[14px] bg-paper/80" />
              </div>
            ))}
          </div>
          <FiguraEsquematica className="rule-in relative mx-auto block h-auto w-[min(48vw,224px)] lg:mx-0 lg:h-[min(calc(100svh-90px-64px),820px)] lg:w-auto lg:shrink-0" />
        </div>
      </div>
    </section>
  );
}
