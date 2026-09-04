import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { FloatingWhatsApp } from "./floating-whatsapp";
import { PageGrid, SeamRuler } from "./layers";
import { Reveal } from "./reveal";
import { SiteFooter } from "./site-footer";
import { GLYPHS } from "./service-glyphs";
import { SiteHeader } from "./site-header";
import { SocialBand } from "./social-band";

/**
 * Casca das paginas internas.
 *
 * A home continua compondo suas secoes a mao em app/page.tsx. Todas as outras
 * rotas (18 paginas de conteudo, 68 posts, indice do blog) passam por aqui,
 * para que cabecalho, rodape, trilha e o sistema visual sejam identicos sem
 * duplicar codigo em 89 lugares.
 *
 * ===========================================================================
 * O SISTEMA DAS PAGINAS INTERNAS
 *
 * Tres tipos, e so tres. O tipo decide o hero e o ritmo do corpo; o resto
 * (grade de fundo, numeral mono com filete, molduras, entrada por scroll)
 * e' o mesmo vocabulario da home, sem excecao por pagina.
 *
 *   tratamento     as 14 paginas de tratamento, tecnica e avaliacao.
 *                  Hero em duas colunas: trilha, glifo, titulo e descricao a
 *                  esquerda; a direita a fotografia da pagina (ou o
 *                  placeholder, quando a foto ainda nao existe) em moldura,
 *                  com tres linhas de referencia atras e o ponto de sonar no
 *                  canto. Corpo em SecoesDeConteudo com numerar: cada secao
 *                  leva numeral 01, 02... numa coluna fixa a esquerda.
 *                  Fecho: PaginasRelacionadas (vizinhas do grupo do menu) e
 *                  ConviteConsulta.
 *
 *   institucional  quem somos, responsavel tecnica, curriculo, contato, e o
 *                  indice do blog. Mesmo hero de duas colunas quando ha
 *                  midia, mas o corpo e' corrido, sem numeral: sao paginas
 *                  de apresentacao, e numerar "Visao" e "Formacao" leria como
 *                  protocolo. Fecho igual ao de tratamento.
 *
 *   post           os 68 artigos. Hero em coluna unica: trilha, data e tema
 *                  em mono, titulo, resumo; abaixo, a capa do post em moldura
 *                  larga que atravessa a costura do hero com o corpo. Corpo
 *                  corrido, centrado na medida de leitura, cada secao aberta
 *                  por um fio fino. Fecho: PostsRelacionados e
 *                  ConviteConsulta.
 *
 * Ritmo vertical (o que se repete em toda pagina, nesta ordem):
 *   1. hero em bg-surface, fechado por fio;
 *   2. abertura do texto, com o primeiro paragrafo em corpo maior;
 *   3. secoes, uma por titulo do texto, com respiro fixo entre elas;
 *   4. imagem, onde o texto pede (depois da secao "como funciona"; ver
 *      indiceParaImagem), nas paginas em que ela nao mora no hero;
 *   5. relacionadas, em bg-paper com fio acima;
 *   6. convite, em bg-surface;
 *   7. costura, faixa social, rodape.
 *
 * Detalhe grafico: acento, nao moldura. Numeral mono com filete abre secao;
 * fio de 1px separa bandas; linhas de referencia e ponto de sonar so no hero;
 * pull quote (a frase que a autora escreveu inteira em negrito) leva fio
 * vertical em accent. Nada mais e' desenhado por cima do texto.
 *
 * Movimento: um so, o Reveal (opacidade 0 -> 1, 14px de subida, 750ms) para
 * blocos, e a variante cortina para titulos. So transform e opacidade. Com
 * movimento reduzido tudo nasce visivel pela regra [data-motion] em
 * globals.css; nenhum elemento depende do observer para existir.
 *
 * Medida de linha: .prosa fixa 66ch no telefone e 68ch a partir do tablet,
 * o que da entre 62 e 72 caracteres por linha no corpo de 18/19px.
 * ===========================================================================
 */
export type TipoDePagina = "tratamento" | "institucional" | "post";

/**
 * A capa nao traz medidas no JSON (o GoDaddy nao as expunha), entao a imagem
 * preenche uma caixa de razao fixa em vez de declarar width/height: a caixa
 * reserva o espaco antes do download e o CLS continua em zero.
 */
export type Capa = {
  src: string;
  alt: string;
};

export function PageShell({
  tipo,
  titulo,
  subtitulo,
  trilha,
  glifo,
  midia,
  meta,
  capa,
  children,
}: {
  tipo: TipoDePagina;
  titulo: string;
  subtitulo?: string | null;
  /** Ultimo item e a pagina atual, sem link. */
  trilha?: { nome: string; href?: string }[];
  /** Chave de GLYPHS ("/osteopatia"). Sem ela o cabecalho vai so com o titulo. */
  glifo?: string;
  /** Coluna direita do hero (foto em moldura ou placeholder). Nao vale para post. */
  midia?: ReactNode;
  /** Linha acima do titulo (data e tema do post). */
  meta?: ReactNode;
  /** Capa larga sob o hero, que atravessa a costura com o corpo. Post. */
  capa?: Capa;
  children: ReactNode;
}) {
  const Emblema = glifo ? GLYPHS[glifo] : undefined;
  const duasColunas = tipo !== "post" && Boolean(midia);

  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        {/* data-hero: o observador do flutuante procurava "main > section", que
            nesta casca cai na faixa social do rodape; o disco aparecia no topo
            de toda pagina interna, cobrindo texto, e sumia justamente no fim.
            Sem overflow-hidden de proposito: a capa do post pende para fora
            da banda, por cima da costura, e seria decepada. */}
        <header
          data-hero
          className="relative border-b border-rule bg-surface"
        >
          <PageGrid />

          {/* O cabecalho e' chapa fixa fora do fluxo: este respiro de cima
              e' o que faz o conteudo nascer abaixo dela, e nao debaixo. */}
          <div className="relative mx-auto max-w-[1240px] px-6 pt-32 pb-12 md:px-8 md:pt-36 md:pb-14 lg:px-10 lg:pt-44 lg:pb-16">
            <div
              className={
                duasColunas
                  ? "lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-6"
                  : ""
              }
            >
              <div className={duasColunas ? "lg:col-span-7" : ""}>
                {trilha && trilha.length > 0 && (
                  <Reveal>
                    <nav aria-label="Trilha de navegação" className="mb-8">
                      <ol
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
                        style={{ fontFamily: "var(--mono)" }}
                      >
                        <li>
                          <Link
                            href="/"
                            className="inline-flex min-h-[28px] items-center hover:text-accent"
                          >
                            Início
                          </Link>
                        </li>
                        {trilha.map((item, i) => (
                          <li key={item.nome} className="flex items-center gap-x-3">
                            <span aria-hidden="true" className="text-rule">
                              /
                            </span>
                            {item.href && i < trilha.length - 1 ? (
                              <Link
                                href={item.href}
                                className="inline-flex min-h-[28px] items-center hover:text-accent"
                              >
                                {item.nome}
                              </Link>
                            ) : (
                              <span aria-current="page" className="text-ink">
                                {item.nome}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </nav>
                  </Reveal>
                )}

                {meta && <Reveal delay={60}>{meta}</Reveal>}

                {Emblema && (
                  <Reveal delay={60}>
                    <span
                      aria-hidden="true"
                      className="mb-8 block h-14 w-14 text-accent md:h-16 md:w-16 lg:h-20 lg:w-20"
                    >
                      {Emblema({ className: "h-full w-full" })}
                    </span>
                  </Reveal>
                )}

                {/* 4.2vw so ultrapassa o piso de 2rem a partir de 762px, entao o
                    titulo ficava congelado em 32px de 320 ate 768, a faixa
                    inteira de tablet com o corpo de telefone. A forma rem+vw
                    cresce desde 320 e chega ao teto por volta de 960. */}
                <Reveal variante="cortina" delay={120}>
                  <h1 className="max-w-[24ch] font-display text-[clamp(2rem,1.35rem+3.25vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink-strong">
                    {titulo}
                  </h1>
                </Reveal>

                {subtitulo && (
                  <Reveal delay={220}>
                    <p className="mt-6 max-w-[62ch] text-[1.0625rem] leading-[1.7] text-muted md:mt-7 md:text-[1.125rem]">
                      {subtitulo}
                    </p>
                  </Reveal>
                )}
              </div>

              {duasColunas && (
                <div className="relative mt-12 lg:col-span-4 lg:col-start-9 lg:mt-0">
                  <LinhasDeReferencia />
                  <Reveal delay={180}>
                    <div className="relative mx-auto max-w-[360px] lg:max-w-none">
                      <PontoDeSonar />
                      {midia}
                    </div>
                  </Reveal>
                </div>
              )}
            </div>

            {tipo === "post" && capa && (
              <Reveal delay={260}>
                {/* Pende 5rem/8rem para fora da banda: a foto atravessa a
                    costura entre o hero e o corpo. O espacador logo abaixo
                    do header devolve essa altura ao fluxo. */}
                <figure className="relative z-10 mx-auto mt-12 -mb-20 max-w-[960px] rounded-lg border border-rule bg-paper p-2 shadow-plate lg:mt-14 lg:-mb-32">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-surface">
                    <Image
                      src={capa.src}
                      alt={capa.alt}
                      fill
                      priority
                      sizes="(min-width: 1024px) 960px, 100vw"
                      className="object-cover saturate-[0.9]"
                    />
                  </div>
                </figure>
              </Reveal>
            )}
          </div>
        </header>

        {tipo === "post" && capa && <div aria-hidden="true" className="h-20 lg:h-32" />}

        {children}

        <SeamRuler />
        <SocialBand />
      </main>
      <SiteFooter />
      <FloatingWhatsApp />
    </>
  );
}

/**
 * Linhas de referencia do hero da home, atras da midia: 1px em rule, com o
 * traco curto em accent na ponta direita, recolhendo e voltando a partir da
 * esquerda (so scaleX; repouso e' a linha inteira). So a partir de lg, onde a
 * midia tem coluna propria; no telefone poluiriam.
 */
function LinhasDeReferencia() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 -left-6 -right-6 hidden lg:block"
    >
      {[22, 50, 78].map((y, i) => (
        <div key={y} className="absolute right-0 left-0" style={{ top: `${y}%` }}>
          <div
            className="estende h-px w-full bg-rule"
            style={{
              ["--dur" as string]: `${9 + i * 2.5}s`,
              ["--fase" as string]: `${i * 1.7}s`,
            }}
          />
          <div className="absolute -top-px right-0 h-[1.4px] w-[14px] bg-accent/60" />
        </div>
      ))}
    </div>
  );
}

/** O ponto que marca a midia, com o sonar das articulacoes do hero. */
function PontoDeSonar() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1.5 -left-1.5 z-10 block h-3 w-3"
    >
      <span
        className="sonar-onda absolute inset-0 rounded-full border border-accent"
        style={{ ["--escala" as string]: 4, ["--dur" as string]: "5s" }}
      />
      <span className="sonar-ponto absolute inset-0 rounded-full bg-accent" />
    </span>
  );
}
