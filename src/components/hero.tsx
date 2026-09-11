import Image from "next/image";
import { Fragment } from "react";

import {
  dividirPeloDestaque,
  hrefDoDestino,
  segmentosDoSubtitulo,
  type ConteudoHero,
} from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { FiguraCorpo } from "./figura-corpo";
import { SectionMark } from "./layers";

/**
 * O bloco do hero escala como conjunto a partir de lg: numeral, corpo do
 * titulo, entrelinha, botoes e os espacos entre eles crescem pelo mesmo
 * fator (~1,15). Isto e' a parte dos botoes; o resto esta nas classes lg:
 * de cada peca. Degraus fixos por faixa, como o titulo: nada de clamp por
 * vw.
 * Na janela baixa (laptop, ate 860px de altura) os botoes descem junto com
 * o titulo: caixa e corpo menores que o proprio degrau de base, para nao
 * ficarem grandes ao lado de um titulo de 44/52px. A regra e' essa, e vale
 * para qualquer degrau futuro: se o texto desce, o botao desce com ele.
 * O simbolo e' medido em em no proprio ButtonLink, entao ele nao precisa de
 * degrau proprio e nunca sobra na caixa menor.
 * Os dois botoes desceram um degrau em 2026-09-05 (a pedido): corpo de 17
 * para 16px e caixa de 32x16 para 28x13 na janela alta, caixa de 24x11 para
 * 22x10 na janela baixa. Corpo e caixa descem juntos de proposito; reduzir so
 * a caixa aperta o rotulo e reduzir so o corpo deixa a caixa folgada. A forma
 * e o raio ficaram como estavam. Referencia da proporcao no desktop: rotulo
 * de 16px sob titulo de 56/64.
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

/**
 * As tres linhas que atravessam o campo das figuras, com a abordagem que
 * cada uma marca. A altura e' o y da articulacao no viewBox de 560 das duas
 * figuras (as duas tem o mesmo y de corpo, ver silhueta-perfil-path.ts), e
 * vira porcentagem do quadro que tem exatamente a altura delas: 149,5 cai
 * nos ombros, 309,5 na pelve (quadril), 408 nos joelhos, nas duas figuras.
 * Nao e' rotulo decorativo, e' legenda de diagrama: mexer no y sem mexer no
 * nome quebra a correspondencia.
 */
const LINHAS_DE_REFERENCIA = [
  { y: 149.5, abordagem: "Posturologia", marca: "prumo e níveis" },
  { y: 309.5, abordagem: "Osteopatia", marca: "coluna" },
  { y: 408, abordagem: "Acupuntura", marca: "pontos" },
] as const;

const ESCALA_BOTAO =
  "lg:gap-3.5 lg:px-7 lg:py-[13px] lg:text-[1rem] " +
  "lg:[@media(max-height:860px)]:gap-2.5 lg:[@media(max-height:860px)]:px-[22px] " +
  "lg:[@media(max-height:860px)]:py-[10px] lg:[@media(max-height:860px)]:text-[0.9375rem]";

/**
 * A forma de cada botao e da POSICAO, e fica no codigo: o primeiro e o convite
 * verde, o segundo o de contorno. O painel edita so rotulo e destino; um
 * icone ou uma variante trocados mudariam a hierarquia que a fila mede.
 */
const FORMA_DOS_BOTOES = [
  { variant: "primary", icone: "balao" },
  { variant: "secondary-deep", icone: "pergunta" },
] as const;

/**
 * O titulo em blocos, um por linha escrita. A primeira linha vira um bloco por
 * palavra abaixo de sm: no telefone "Integracao terapeutica" nao cabe numa
 * linha so, e a quebra continua escolhida, nao emergente. Cada linha menos a
 * ultima termina com espaco, para o texto copiado sair corrido.
 */
function TituloEmLinhas({ linhas, destaque }: { linhas: string[]; destaque: string }) {
  return linhas.map((linha, i) => {
    const fim = i < linhas.length - 1 ? " " : "";
    if (i === 0) {
      const palavras = linha.split(" ");
      return (
        <span key={i} className="block">
          {palavras.map((palavra, j) => (
            <span key={j} className="block sm:inline">
              {palavra}
              {j < palavras.length - 1 ? " " : fim}
            </span>
          ))}
        </span>
      );
    }
    // A regra do descritor garante o grifo na 2a linha; se um dia faltar, a
    // linha sai sem grifo em vez de sumir.
    const partes = i === 1 ? dividirPeloDestaque(linha, destaque) : null;
    return (
      <span key={i} className="block">
        {partes ? (
          <>
            {partes.antes}
            <mark className="marca-grifo">{partes.destaque}</mark>
            {partes.depois}
          </>
        ) : (
          linha
        )}
        {fim}
      </span>
    );
  });
}

/** "\n" vira quebra que so vale a partir de sm, seguida do espaco que a linha corrida precisa. */
function ComQuebras({ texto }: { texto: string }) {
  return texto.split("\n").map((parte, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <>
          <br className="hidden sm:inline" />{" "}
        </>
      )}
      {parte}
    </Fragment>
  ));
}

export function Hero({ conteudo, whatsapp }: { conteudo: ConteudoHero; whatsapp: string }) {
  const segmentos = segmentosDoSubtitulo(conteudo.subtituloLinhas, conteudo.destaquesDoSubtitulo);

  return (
    <section
      data-tone="deep"
      className="relative overflow-hidden bg-accent-deep text-paper"
    >
      {/* Camada 0: o fundo. Cor chapada, sem degrade e sem movimento, com a
          fotografia da sala de atendimento por cima em opacidade baixa.
          Substituiu, em 2026-09-06, o plano deformado por ruido em WebGL
          (fundo-ondulado.tsx, removido; esta no historico do git se um dia
          precisar voltar). A foto e' a mesma que o hero tinha antes daquele
          plano, no mesmo enquadramento.

          O fundo e' #08496b. A cor precisa ser escura assim
          porque a foto CLAREIA o fundo (a luminancia media dela e' maior que
          a do fundo), e nao escurece: num tom claro o hero reprovaria AA
          antes mesmo de a foto entrar. Os dois numeros, cor e opacidade,
          foram escolhidos juntos: ver o preview em _previews/hero-foto.

          A foto entra com priority porque e' o LCP da home. */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#08496b]">
        <Image
          src="/img/clinica-podoposture-5.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[34%_45%] opacity-[0.18]"
        />
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
            <SectionMark n="01" tone="deep" destaque sobreFoto />
          </div>

          {/*
            Quebra escrita, nao emergente. O corpo do titulo e' um bloco por
            linha, entao o navegador nao tem o que decidir: nao ha text-balance
            e nao ha clamp por vw. Era esse par que fazia o mesmo titulo cair
            diferente em desktop e em laptop, porque redistribuia as palavras
            em cada largura.
            Corpo em degraus fixos por faixa; na janela baixa (laptop, ate
            860px de altura) cada degrau desce um patamar: 44px em lg, 52px em
            xl, contra 56 e 64 na janela alta. Foi pedido. Como a quebra e'
            escrita, trocar o corpo por altura aqui nao mexe em onde as linhas
            caem: muda a escala, nao a composicao.
            Os degraus desceram um patamar em 2026-09-05 (eram 34/40/64/68/83
            e 50/61), para o titulo parar de ler como cartaz e abrir espaco
            para o subtitulo. So o corpo mudou: entrelinha, tracking, peso e a
            quebra escrita sao os mesmos, entao a composicao e' a de antes em
            outra escala.
            Dentro de cada faixa a linha mais larga cabe com folga sobre a
            fonte de fallback, entao a quebra tambem nao muda no swap da
            Newsreader e a altura do bloco e' a mesma antes e depois: linhas x
            corpo x entrelinha, sem CLS.

            A virgula depois de "efetiva" virou "e" em 2026-09-07. A quebra
            NAO precisou mudar: enumerando as 84 particoes das dez palavras em
            quatro linhas, esta continua sendo a de menor irregularidade
            (17,6%), como ja era com a virgula. E a troca melhora o bloco
            sozinha, porque engorda justamente a segunda linha: em 64px ela
            passa de 465,1 para 493,7px, e a primeira linha, que e' a mais
            longa, deixa de sair 119,5px alem dela para sair 90,9.
            A linha mais larga continua sendo "Integracao terapeutica" com os
            mesmos 584,6px, entao --hero-texto-dir nao precisou ser remedido.

            Os numeros acima sao do corte de TEXTO da Newsreader, que era o
            que o navegador recebia ate 2026-09-08, quando o eixo optico
            entrou na configuracao da fonte (layout.tsx). No corte de display
            o titulo sai mais largo: em 64px as quatro linhas passam a medir
            615,3 / 517,7 / 413,3 / 478,7. A quebra escrita de novo NAO
            precisou mudar: reenumeradas as 84 particoes com as metricas
            novas, esta segue em primeiro lugar, com 17,7% contra 19,9% da
            segunda colocada. Quem precisou de remedicao foi o
            --hero-texto-dir, e so nas duas faixas xl; o porque esta no
            comentario do bloco HERO em globals.css.
          */}
          <h1
            className="rule-in mt-9 font-display lg:mt-11 [@media(max-height:860px)]:mt-6 text-[32px] min-[390px]:text-[36px] sm:text-[54px] lg:text-[56px] xl:text-[64px] lg:[@media(max-height:860px)]:text-[44px] xl:[@media(max-height:860px)]:text-[52px] leading-[1.03] font-medium tracking-[-0.025em] text-paper"
            style={{ ["--in-delay" as string]: "220ms" }}
          >
            <TituloEmLinhas linhas={conteudo.tituloLinhas} destaque={conteudo.destaque} />
          </h1>

          {/*
            Subtitulo: quem responde, com que titulos, e onde. Sao dados
            verificaveis do proprio site (site.ts para o endereco e o nome,
            pagina do Curriculo Profissional para os titulos do COFFITO), nao
            argumento de venda: nada de selo, badge ou numero sem fonte.
            Entra FORA do embrulho da acao, e nao dentro: o embrulho e'
            fit-content sobre a fila de botoes, e e' dele que a curva de
            marcha tira a medida. Um paragrafo largo la dentro esticaria a
            curva ate a largura da coluna.
            A medida vai em ch, nao em px, para a linha ficar no confortavel
            de leitura em qualquer degrau de corpo.

            O tempo de pratica clinica estava pendente e a clinica confirmou
            em 2026-09-05: 30 anos. Entra colado na credencial, e nao no fim do
            paragrafo, porque o tempo e' da pessoa e nao da cidade; e entra com
            as MESMAS palavras da secao 03 ("com 30 anos de experiencia
            clinica"), nao com uma segunda formulacao do mesmo dado, porque as
            duas ficam visiveis na mesma pagina. A regua da secao 03 desenha um
            traco por ano a partir de `anosDeExperiencia`, no cadastro de
            contato; o numero escrito aqui e o da secao 03 sao texto, e se
            editam cada um no seu lugar.
            As outras duas formas que sobraram do site antigo ("quase 30 anos"
            na pagina da responsavel tecnica, "quase tres decadas" no
            curriculo) sao copy da cliente e continuam como estao.
          */}
          {/*
            Quebra escrita em quatro linhas, a partir de sm. Antes eram tres
            linhas que o navegador decidia sozinho, e o bloco saia com 617px
            de largura contra 585 do titulo: 105%, nem igual nem
            decisivamente menor, que e' a distancia que le como descuido.
            Em quatro linhas o mesmo texto cai em 437 / 452 / 460 / 397 e o
            paragrafo passa a ser uma coluna de leitura a 58% do titulo, com
            medida de ~55 caracteres.
            As quebras foram escolhidas enumerando todas as particoes das 26
            palavras e minimizando a fracao da caixa que sobra vazia; nao ha
            text-balance aqui, que decide por heuristica propria e varia entre
            maquinas. A copy e' a mesma, palavra por palavra: so muda onde a
            linha corta.
            Abaixo de sm o <br> some e o texto volta a fluir sozinho: na
            coluna do telefone a linha mais larga das quatro (388px em 16px)
            nao caberia, e escrever quebra que nao cabe e' pior que nao
            escrever.
            A medida de 480px e' guarda, nao forma: quem desenha a borda sao
            as quebras. Ela existe para o bloco nunca quebrar sozinho se a
            fonte de fallback medir diferente.
          */}
          <p
            className="rule-in mt-[22px] max-w-[52ch] text-[1rem] leading-[1.6] text-on-hero sm:max-w-[480px] lg:mt-[26px] lg:text-[1.125rem] xl:text-[1.1875rem] lg:[@media(max-height:860px)]:mt-[18px] lg:[@media(max-height:860px)]:text-[1rem]"
            style={{ ["--in-delay" as string]: "420ms" }}
          >
            {/* Os trechos em destaque sao segmentos de texto, nunca HTML: o
                primeiro leva peso, o segundo so a cor, como na composicao
                original (o nome e o tempo de pratica). */}
            {segmentos.map((segmento, i) =>
              segmento.destaque === null ? (
                <ComQuebras key={i} texto={segmento.texto} />
              ) : (
                <span
                  key={i}
                  className={segmento.destaque === 0 ? "font-medium text-paper" : "text-paper"}
                >
                  <ComQuebras texto={segmento.texto} />
                </span>
              ),
            )}
          </p>

          {/* A medida deste embrulho e' a da fila de botoes (fit-content
              sobre a fila em linha), e e' dela que a curva de marcha tira a
              sua: a ponta direita do traco cai no mesmo pixel da borda
              direita do segundo botao. So a partir de sm, que e' onde os
              botoes viram linha; empilhados eles ocupam a largura do bloco e
              o embrulho os encolheria, entao no telefone a curva continua
              presa a largura do bloco. */}
          <div className="sm:w-fit">
            {/* Acao do hero. No padrao, o primario e' o par completo da
              secao 09, rotulo e destino; o secundario e' o CTA da Avaliacao
              Clinica da Dor Persistente, a porta de entrada clinica. O teto de
              24 caracteres do rotulo e' o que a borda medida em lg aguenta. */}
            <div
              className="rule-in mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:mt-12 lg:gap-5 lg:[@media(max-height:860px)]:mt-6"
              style={{ ["--in-delay" as string]: "620ms" }}
            >
              {conteudo.botoes.map((botao, i) => {
                const forma = FORMA_DOS_BOTOES[i] ?? FORMA_DOS_BOTOES[1];
                return (
                  <ButtonLink
                    key={i}
                    href={hrefDoDestino(botao.destino, whatsapp)}
                    variant={forma.variant}
                    icone={forma.icone}
                    className={ESCALA_BOTAO}
                  >
                    {botao.rotulo}
                  </ButtonLink>
                );
              })}
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
          O campo das duas figuras: contrapeso do bloco de titulo. Frontal a
          esquerda, perfil a direita com as costas voltadas para ela (a
          curvatura da coluna fica no meio do par). Layout em globals.css
          (.hero-campo e filhos), porque e' um sistema de variaveis por
          faixa, nao uma pilha de classes:

          - O campo comeca na borda VISUAL do bloco de texto mais 24px, e vai
            ate o respiro da borda da janela. A borda e' constante por faixa
            (569 / 571 / 625 / 571px em lg alta, lg baixa, xl alta, xl baixa;
            em xl soma o recuo do contentor). Medida por Range nos nos de
            texto, nao pela caixa da coluna: as linhas do titulo sao blocos da
            largura da coluna inteira. Se o corpo do titulo, a medida do
            paragrafo ou o recuo do bloco mudarem, remedir.
            Qual peca e' a mais larga MUDA por faixa, e por isso as quatro sao
            medidas separadas: com a credencial em quatro linhas ela deixou de
            ser a peca mais larga em toda faixa. Hoje quem manda e' o titulo
            em xl e a fila de botoes em lg.
          - As duas figuras tem UMA expressao de altura, entao sao sempre
            exatamente iguais: o menor entre a altura util da janela, 820px e
            o que cabe na largura do campo com as duas lado a lado (221 + 118
            de viewBox por 560), descontados o vao e a faixa dos rotulos;
            tudo vezes 0,92 (pedido: "um pouco menores"). 686px em 1440 x
            900, 500px em 1024 x 768.
          - O par e' centrado no campo como conjunto, descontada a faixa de
            150px reservada aos rotulos a direita (so em xl).
          - Abaixo de lg o par entra no fluxo depois da curva de marcha,
            centrado, altura pela largura que sobra, teto de 405px.
        */}
        <div aria-hidden="true" className="hero-campo pointer-events-none">
          <div className="hero-quadro">
            {/* Linhas de referencia: 1px em papel a 0,3, com o traco curto de
                14px x 1,4px na ponta direita, mais claro; recolhem e voltam a
                partir da esquerda (so scaleX). Atravessam as duas figuras e
                seguem ate 36px da borda da janela. Nunca entram no titulo
                porque o campo comeca depois dele. Atras das figuras.

                O rotulo e' empilhado (abordagem sobre o fio, o que ela marca
                sob ele) e so existe a partir de xl, na faixa reservada: em lg
                as duas figuras ocupam o campo inteiro e nao sobra vao para
                nome sem cruzar corpo. Abaixo de lg nao ha linhas.

                Papel, nao on-deep-muted: os rotulos moram na metade direita
                da janela, sobre o azul principal, onde o on-deep-muted
                reprova (3,1) e o papel a 100% passa (4,9). A hierarquia
                entre a abordagem e a marca e' de caixa e espacejamento.
                O campo inteiro e' aria-hidden: quem nomeia as tres abordagens
                para o leitor de tela e' o subtitulo, em prosa. */}
            {LINHAS_DE_REFERENCIA.map(({ y, abordagem, marca }, i) => (
              <div
                key={y}
                className="hero-linha rule-in"
                style={{
                  top: `${((y / 560) * 100).toFixed(2)}%`,
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
                <span className="hero-rotulo absolute -top-6 right-0 flex-col items-end font-mono text-[11px] leading-[1.55] tracking-[0.14em] whitespace-nowrap text-paper uppercase">
                  <span>{abordagem}</span>
                  <span className="mt-[7px] tracking-[0.04em] normal-case">{marca}</span>
                </span>
              </div>
            ))}
            <div className="hero-par">
              <FiguraCorpo vista="frontal" className="rule-in hero-figura" />
              {/* fase propria: as duas nao pulsam em unissono */}
              <FiguraCorpo vista="perfil" fase={2.3} className="rule-in hero-figura" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
