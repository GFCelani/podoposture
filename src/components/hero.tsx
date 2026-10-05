import Image from "next/image";
import { Fragment, type CSSProperties } from "react";

import {
  dividirPeloDestaque,
  hrefDoDestino,
  segmentosDoSubtitulo,
  type ConteudoHero,
  type SegmentoDoSubtitulo,
} from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { FiguraCorpo } from "./figura-corpo";
import { MapaDeDor } from "./mapa-de-dor";
import { MAPA_DE_DOR_PONTOS } from "./mapa-de-dor-pontos";
import { SectionMark } from "./layers";

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

/**
 * Os segmentos do subtitulo agrupados por linha escrita: cada "\n" fecha uma
 * linha. Um trecho em destaque que atravesse a quebra vira dois pedacos, um
 * em cada linha, com o mesmo destaque.
 */
function porLinha(segmentos: SegmentoDoSubtitulo[]): SegmentoDoSubtitulo[][] {
  const linhas: SegmentoDoSubtitulo[][] = [[]];
  for (const segmento of segmentos) {
    segmento.texto.split("\n").forEach((parte, i) => {
      if (i > 0) linhas.push([]);
      if (parte) linhas[linhas.length - 1].push({ ...segmento, texto: parte });
    });
  }
  return linhas;
}

/**
 * O bullet separa sem pontilhar: azul claro da marca, um tom abaixo do texto
 * das especialidades. Cheio, e nao translucido: a 70% ele caia para 2,4:1 sobre
 * a foto do fundo; cheio fica acima de 4:1.
 */
function ComBullets({ texto }: { texto: string }) {
  return texto.split("•").map((parte, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="text-accent-light">•</span>}
      {parte}
    </Fragment>
  ));
}

/**
 * "Item •" indivisivel. Os segmentos saem de `linhas.join(QUEBRA)` em ordem,
 * sem sobra, entao o deslocamento de cada caractere no texto inteiro diz em
 * que linha ele esta. Numa linha que tem bullet, o espaco que nao vem logo
 * depois de um "•" vira NBSP: a unica quebra possivel passa a ser depois do
 * bullet.
 */
const QUEBRA = "\n";
const NBSP = "\u00a0";

function unirItens(segmentos: SegmentoDoSubtitulo[], linhas: string[]): SegmentoDoSubtitulo[] {
  const texto = linhas.join(QUEBRA);
  const comBullet: boolean[] = [];
  let linha = 0;
  for (let i = 0; i < texto.length; i += 1) {
    if (texto[i] === QUEBRA) linha += 1;
    comBullet.push(linhas[linha]?.includes("•") ?? false);
  }
  let deslocamento = 0;
  return segmentos.map((segmento) => {
    const inicio = deslocamento;
    deslocamento += segmento.texto.length;
    // Por unidade de codigo, como o .length e o slice que geraram o segmento.
    let unido = "";
    for (let j = 0; j < segmento.texto.length; j += 1) {
      const k = inicio + j;
      const ch = segmento.texto[j];
      unido += ch === " " && comBullet[k] && texto[k - 1] !== "•" ? NBSP : ch;
    }
    return { ...segmento, texto: unido };
  });
}

/** Pedacos de uma linha do subtitulo: destaque 0 com peso, 1 so com a cor. */
function Pedacos({ pedacos }: { pedacos: SegmentoDoSubtitulo[] }) {
  return pedacos.map((pedaco, i) =>
    pedaco.destaque === null ? (
      <ComBullets key={i} texto={pedaco.texto} />
    ) : (
      <span key={i} className={pedaco.destaque === 0 ? "font-semibold text-paper" : "text-paper"}>
        <ComBullets texto={pedaco.texto} />
      </span>
    ),
  );
}

/**
 * Anotacao de diagrama sobre a figura de perfil: anel em volta do ponto, fio
 * fino e o texto. A posicao sai do mesmo arquivo gerado dos pontos, em
 * porcentagem da caixa da figura, entao acompanha o ponto em qualquer escala.
 */
function Anotacao({ ponto, linhas }: { ponto: "ciatica" | "lombar"; linhas: string[] }) {
  const { largura, pontos } = MAPA_DE_DOR_PONTOS.perfil;
  const alvo = pontos.find((p) => p.chave === ponto);
  if (!alvo) return null;
  return (
    <div
      className={`pd-anot pd-anot--${ponto} rule-in`}
      style={
        {
          left: `${((alvo.x / largura) * 100).toFixed(3)}%`,
          top: `${((alvo.y / 560) * 100).toFixed(3)}%`,
          ["--in-delay" as string]: "900ms",
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="pd-anot-anel" />
      <span aria-hidden="true" className="pd-anot-fio" />
      <p className="pd-anot-texto">
        {linhas.map((linha, i) => (
          <span key={i}>{linha}</span>
        ))}
      </p>
    </div>
  );
}

export function Hero({
  conteudo,
  whatsapp,
  anosDeExperiencia,
}: {
  conteudo: ConteudoHero;
  whatsapp: string;
  /** contato.anosDeExperiencia: vira a linha em mono abaixo do subtitulo. */
  anosDeExperiencia: number;
}) {
  const segmentos = segmentosDoSubtitulo(conteudo.subtituloLinhas, conteudo.destaquesDoSubtitulo);
  // Linha 1: a credencial, em sans. Linha 2: o lugar, que vai para a linha
  // de dado em mono junto com os anos de pratica (ver o comentario la).
  const [credencial = [], ...demais] = porLinha(unirItens(segmentos, conteudo.subtituloLinhas));
  const lugar = demais.flat();
  const fundo = conteudo.fundo[0];

  return (
    <section
      data-tone="deep"
      className="hero-secao relative overflow-hidden bg-accent-deep text-paper"
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

          A foto entra com fetchPriority alto porque e' o LCP da home no desktop
          (`priority` foi descontinuado no Next 16 e nao marcava a prioridade). */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#08496b]">
        {/* A foto vem do painel (Abertura > Foto de fundo); sem ela, fica o
            azul chapado. O enquadramento e a opacidade sao do layout.

            Desde 2026-10-05 ela nao cobre mais o hero inteiro: entra a partir
            de 36% da largura e sobe a 22% (era 18%), esmaecendo pela esquerda
            (.hero-foto, globals.css). O texto fica sobre o azul
            limpo e a foto mora atras das figuras. A trama de curvas de nivel
            saiu na mesma troca (trama-hero.tsx, no historico do git). Medido
            sobre a composicao final, o pior texto e' a anotacao do mapa sobre
            a foto, com 4,92:1. Aprovado no preview _previews/hero-v3/azul-foto. */}
        {fundo && (
          <div className="hero-foto">
            <Image
              src={fundo.src}
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="64vw"
              className="object-cover object-[34%_45%] opacity-[0.22]"
            />
          </div>
        )}
      </div>

      {/* Composicao fluida (globals.css, "HERO - palco"): no telefone e no
          tablet, texto e figuras empilhados, com as classes abaixo; a partir
          de 1200px, a composicao aprovada em 1536 x 695 escalada inteira por
          uma unidade so, sem degrau por faixa nem regra de janela baixa. */}
      <div className="hero-palco mx-auto grid max-w-[1240px] grid-cols-1 items-center px-6 pt-32 pb-16 lg:px-10">
        <div className="hero-texto relative z-10">
          <div className="hero-numeral rule-in" style={{ ["--in-delay" as string]: "80ms" }}>
            <SectionMark n="01" tone="deep" destaque sobreFoto />
          </div>

          {/*
            Quebra escrita, nao emergente. O corpo do titulo e' um bloco por
            linha, entao o navegador nao tem o que decidir: nao ha text-balance
            e nao ha clamp por vw. Era esse par que fazia o mesmo titulo cair
            diferente em desktop e em laptop, porque redistribuia as palavras
            em cada largura.
            Corpo: no telefone e no tablet, degraus por largura (classes
            abaixo); a partir de 1200px, 52px vezes a unidade do palco, a do
            titulo aprovado em 1536 x 695 (globals.css, "HERO - palco"). Como
            a quebra e' escrita, mudar o corpo nao mexe em onde as linhas caem:
            muda a escala, nao a composicao. Nenhuma linha passa da largura da
            coluna sobre a fonte de fallback, entao a quebra tambem nao muda no
            swap da Newsreader e a altura do bloco e' a mesma antes e depois.

            A virgula depois de "efetiva" virou "e" em 2026-09-07. A quebra
            NAO precisou mudar: enumerando as 84 particoes das dez palavras em
            quatro linhas, esta continua sendo a de menor irregularidade
            (17,6%), como ja era com a virgula. E a troca melhora o bloco
            sozinha, porque engorda justamente a segunda linha: em 64px ela
            passa de 465,1 para 493,7px, e a primeira linha, que e' a mais
            longa, deixa de sair 119,5px alem dela para sair 90,9.
            A linha mais larga continua sendo "Integracao terapeutica".

            Os numeros acima sao do corte de TEXTO da Newsreader, que era o
            que o navegador recebia ate 2026-09-08, quando o eixo optico
            entrou na configuracao da fonte (layout.tsx). No corte de display
            o titulo sai mais largo: em 64px as quatro linhas passam a medir
            615,3 / 517,7 / 413,3 / 478,7. A quebra escrita de novo NAO
            precisou mudar: reenumeradas as 84 particoes com as metricas
            novas, esta segue em primeiro lugar, com 17,7% contra 19,9% da
            segunda colocada. No palco o eixo fica preso em 52, o da
            referencia, para o titulo nao alargar mais que a escala nos corpos
            grandes.

            O [overflow-wrap:break-word] fica, e nao por causa do titulo largo:
            desde 2026-09-14 a linha que nao cabe e recusada no servidor
            (lib/largura-do-titulo.ts), entao ela nao chega mais ate aqui. Ele
            continua porque a 320px o corpo cai para 32px e uma linha de 22
            caracteres ainda passa da largura da coluna — sem ele, a pagina
            rolaria para o lado no telefone.
          */}
          <h1
            className="hero-titulo rule-in mt-6 font-display text-[32px] leading-[1.03] font-medium tracking-[-0.025em] text-paper [overflow-wrap:break-word] min-[390px]:text-[36px] sm:mt-9 sm:text-[54px]"
            style={{ ["--in-delay" as string]: "220ms" }}
          >
            <TituloEmLinhas linhas={conteudo.tituloLinhas} destaque={conteudo.destaque} />
          </h1>

          {/*
            Subtitulo: quem responde, com que competencias, e onde. Texto da
            cliente, verbatim, recebido em 2026-09-20. Nao reescrever aqui:
            ela mandou a linha pronta, com o bullet como separador e com o
            hifen simples em "Copacabana - Rio de Janeiro".
            Entra FORA do embrulho da acao, e nao dentro: o embrulho e'
            fit-content sobre a fila de botoes, e e' dele que a curva de
            marcha tira a medida. Um paragrafo largo la dentro esticaria a
            curva ate a largura da coluna.

            O TEXTO NAO MORA MAIS AQUI. Desde o painel (2026-09), titulo,
            subtitulo e botoes vem de `conteudo` (ConteudoHero), editavel pela
            Dra. Claudia; o padrao, que vale com o banco vazio e no "voltar ao
            padrao", esta em CONTEUDO_PADRAO.hero (lib/conteudo-padrao.ts). A
            credencial que a cliente mandou em 2026-09-20 entrou LA, verbatim,
            com o bullet como separador e o hifen simples em "Copacabana - Rio
            de Janeiro". Mudar a copy e' mudar la, nao aqui.

            Sairam do padrao, a pedido: "fisioterapeuta especialista", "pelo
            COFFITO" e a frase "Osteopatia, posturologia e acupuntura em
            Copacabana, Rio de Janeiro". So o hero mudou. As duas primeiras
            continuam na copy migrada da cliente (pages.json, paginas de
            Responsavel Tecnica e Curriculo Profissional) e a terceira segue
            em contato.descricaoParaBuscadores, que e' a meta description, o
            manifest e o JSON-LD.

            DUAS LINHAS (2026-09-21): credencial e lugar. A de cima pode
            quebrar dentro de si so em tela estreita, e so depois de um bullet.

            A MEDIDA E' A DO TITULO. A primeira linha tem 81 caracteres e, na
            referencia (1536 x 695), 13px contra 52 do titulo: cai com 488
            contra 500px dele. O salto de 4 para 1 e' deliberado: o titulo
            manda, a credencial assina. No palco as duas escalam juntas; so
            abaixo de u = 0,92 (1366 x 657, 1280 x 586) o piso de 12px deixa a
            linha um pouco mais larga que o titulo. Ela nao quebra no palco: a
            coluna de texto tem largura fixa pela unidade (a maior linha da
            referencia, ou a credencial no piso), e o que passar disso transborda
            para a folga antes do campo. No telefone ela quebra, e so depois de
            um bullet.

            DOIS REGISTROS, NAO TRES CAMADAS. A segunda linha escrita (o lugar)
            nao fica sozinha embaixo da credencial: ela vai para a linha de dado
            em mono, ao lado dos anos de pratica, separados por um fio. Assim o
            bloco sob o titulo tem duas linhas e dois registros, credencial em
            sans e dado em mono, e nao tres linhas pequenas empilhadas. O
            texto e' o da cliente, letra por letra; a caixa alta e' so CSS,
            como em todo metadado mono do site.
            Medido: em 11px a linha de dado da 208 + 16 de fio + 233 = 481px,
            dentro dos 500 do titulo na referencia.

            Hierarquia na credencial: o nome em papel e peso 600; as
            especialidades no tom do hero, em 450 no palco (13px em peso 400
            fica fino demais sobre o azul); o bullet mais apagado,
            para separar sem pontilhar.

            CADA "ITEM •" E' INDIVISIVEL (unirItens, acima): numa linha com
            bullet, todo espaco que nao vem logo depois de um "•" vira espaco
            inseparavel. Linha sem bullet quebra normalmente.
          */}
          <p
            className="hero-credencial rule-in mt-[22px] text-[1rem] leading-[1.6] text-on-hero"
            style={{ ["--in-delay" as string]: "420ms" }}
          >
            <Pedacos pedacos={credencial} />
          </p>

          {/*
            A linha de dado: o lugar (2a linha do subtitulo, do painel) e os
            anos de pratica, que a cliente pediu para incluir "onde couber
            melhor". Em mono o "30 anos" muda de registro e vira o que e', uma
            medida, em vez de ler como mais um item da lista de competencias.
            O numero sai de contato.anosDeExperiencia, o mesmo que a regua da
            secao 03 usa para desenhar um traco por ano: editado no painel, os
            dois mudam juntos. So o numero e' dado; a frase fica no codigo.
            O fio vai grudado nos anos, e nao solto entre os dois itens: se a
            linha quebrar numa tela estreita, a segunda abre com o fio, em vez
            de a primeira terminar com ele pendurado. O fio e' elemento, nao
            caractere: copy de site nao usa travessao. Mesmo fio do SectionMark
            em banda escura, e nao a cor de acao, que e' do CTA e de mais nada.
          */}
          <p
            className="hero-dado rule-in mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.6875rem] leading-[1.5] tracking-[0.14em] text-on-hero uppercase"
            style={{
              fontFamily: "var(--mono)",
              ["--in-delay" as string]: "520ms",
            }}
          >
            {lugar.length > 0 && (
              <span>
                <Pedacos pedacos={lugar} />
              </span>
            )}
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-4 shrink-0 bg-accent-light/45" />
              {anosDeExperiencia} anos de experiência clínica
            </span>
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
              24 caracteres do rotulo e' o que a fila aguenta sem passar do titulo. */}
            <div
              className="hero-acoes rule-in mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
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
              className="hero-curva rule-in mt-4 h-auto w-full max-w-[440px] sm:mt-8 sm:max-w-none"
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
          (.hero-campo e filhos, bloco "HERO - palco"):

          - A partir de 1200px o campo e' o resto da linha depois da coluna
            de texto, 24u adiante dela; a coluna tem largura pela unidade, nao
            pela tinta, para a troca de fonte nao mover as figuras. O par
            se centra no campo descontados 40u de respiro da borda e 150u da
            faixa dos rotulos, e as duas figuras tem 498u de altura, a altura
            delas na referencia. u e' a unidade do palco (globals.css).
          - Abaixo de 1200px o par entra no fluxo depois da curva de marcha,
            centrado, altura pela largura que sobra, teto de 405px.
        */}
        <div className="hero-campo pointer-events-none">
          <div className="hero-quadro">
            {/* Linhas de referencia: 1px em papel a 0,3, com o traco curto de
                14px x 1,4px na ponta direita, mais claro; recolhem e voltam a
                partir da esquerda (so scaleX). Atravessam as duas figuras e
                seguem ate 36u da borda do palco. Nunca entram no titulo
                porque o campo comeca depois dele. Atras das figuras.

                O rotulo e' empilhado (abordagem sobre o fio, o que ela marca
                sob ele), na faixa reservada a direita. Empilhado (abaixo de
                1200px) nao ha linhas nem rotulos.

                Papel, nao on-deep-muted: os rotulos moram na metade direita
                da janela, sobre o azul principal, onde o on-deep-muted
                reprova (3,1) e o papel a 100% passa (4,9). A hierarquia
                entre a abordagem e a marca e' de caixa e espacejamento.
                As linhas sao aria-hidden uma a uma (o campo deixou de ser,
                porque agora tem os links do mapa de dor): quem nomeia as tres
                abordagens para o leitor de tela e' o subtitulo, em prosa. */}
            {LINHAS_DE_REFERENCIA.map(({ y, abordagem, marca }, i) => (
              <div
                key={y}
                aria-hidden="true"
                className="hero-linha rule-in"
                style={{
                  top: `${((y / 560) * 100).toFixed(2)}%`,
                  ["--in-delay" as string]: `${760 + i * 140}ms`,
                }}
              >
                <div
                  className="estende h-px w-full bg-paper/30"
                  style={{
                    ["--dur" as string]: `${18 + i * 5}s`,
                    ["--fase" as string]: `${i * 3.4}s`,
                    ["--recuo" as string]: 0.985,
                  }}
                />
                <div className="absolute -top-px -right-5 h-[1.4px] w-[14px] bg-paper/80" />
                <span className="hero-rotulo absolute -top-6 right-0 flex-col items-end font-mono text-[11px] leading-[1.55] tracking-[0.14em] whitespace-nowrap text-paper uppercase">
                  <span>{abordagem}</span>
                  <span className="mt-[7px] tracking-[0.04em] normal-case">{marca}</span>
                </span>
              </div>
            ))}
            {/* Mapa de dor: cada figura vai num embrulho do tamanho exato
                do desenho, com os pontos clicaveis por cima (mapa-de-dor.tsx).
                Sete na frontal, seis no perfil, dez condicoes: ma postura,
                dor lombar e hernia de disco nas duas vistas, com a mesma
                regra de lugar nas duas; cada uma das outras so na vista que
                a le. */}
            <div className="hero-par">
              <div className="pd-fig pd-fig--frontal">
                <FiguraCorpo vista="frontal" mapa className="rule-in hero-figura" />
                <MapaDeDor vista="frontal" />
              </div>
              {/* fase propria: as duas nao pulsam em unissono */}
              <div className="pd-fig pd-fig--perfil">
                <FiguraCorpo vista="perfil" mapa fase={2.3} className="rule-in hero-figura" />
                <MapaDeDor vista="perfil" />
                {/* Convite do mapa: anotacao de diagrama apontando um ponto.
                    No palco, a dor ciatica, pela direita, entre as linhas de
                    Osteopatia e Acupuntura, onde nenhum rotulo abre (os do
                    perfil abrem para a esquerda). Empilhado, a dor lombar,
                    pela esquerda, com o texto no vao entre as duas figuras.
                    So um dos dois aparece (globals.css, "HERO - anotacao"). */}
                <Anotacao ponto="ciatica" linhas={conteudo.convite} />
                <Anotacao ponto="lombar" linhas={conteudo.convite} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
