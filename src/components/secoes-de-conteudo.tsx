import { Fragment, type ReactNode } from "react";

import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";
import {
  dividirEmSecoes,
  indiceParaImagem,
  type Documento,
  type Secao,
} from "@/lib/secoes";

/**
 * O corpo de texto de uma pagina interna, em blocos.
 *
 * Recebe o HTML migrado inteiro e o entrega dividido por `dividirEmSecoes`:
 * a abertura (o que vem antes do primeiro titulo) e uma secao por titulo.
 * Cada bloco entra por scroll com o mesmo `Reveal` da home, e e' entre os
 * blocos que a imagem da pagina encontra lugar (`intervalo`), depois da
 * secao que descreve como o tratamento e' feito.
 *
 * Nas paginas numeradas com tres ou mais secoes entra, depois da abertura, o
 * sumario: os titulos das secoes, ancorados, numa banda de fundo diferente
 * com corte diagonal. E' o bloco que alterna o ritmo (surface entre dois
 * trechos em paper) e que serve a leitora de um texto clinico de 600
 * palavras: ela ve o mapa antes de descer. Nada e' escrito: sao os titulos
 * que ja estao no texto.
 *
 * Dois ritmos, um por tipo de pagina:
 *   numerar   pagina de tratamento: cada secao tem numeral mono com filete
 *             numa coluna propria a esquerda (fixa enquanto a secao rola), e
 *             o texto ocupa 8 das 12 colunas. A abertura nao leva numeral.
 *   corrido   post e pagina institucional: sem coluna de numeral; o texto
 *             fica centrado na medida de leitura, e cada secao abre com um
 *             fio fino, que e' a costura que o h2 tinha antes da divisao.
 *
 * A tipografia interna continua sendo a da classe .prosa em globals.css; as
 * classes prosa-abertura / prosa-secao / prosa-na-grade so ajustam o que muda
 * quando o documento deixa de ser um bloco unico (paragrafo de entrada,
 * titulo que abre bloco, alinhamento na grade).
 */
export function SecoesDeConteudo({
  html,
  numerar = false,
  intervalo,
}: {
  html: string;
  numerar?: boolean;
  /** Bloco inserido onde o texto pede imagem; costuma ser a foto da pagina. */
  intervalo?: ReactNode;
}) {
  const doc = dividirEmSecoes(html);
  const ondeImagem = indiceParaImagem(doc.secoes);

  return (
    <>
      {doc.abertura && <Abertura html={doc.abertura} numerar={numerar} />}
      {numerar && doc.secoes.length >= 3 && <Sumario secoes={doc.secoes} />}
      {ondeImagem === -1 && intervalo}
      {doc.secoes.map((secao, i) => (
        <Fragment key={secao.id}>
          <Bloco secao={secao} n={i + 1} numerar={numerar} nivel={doc.nivel} />
          {i === ondeImagem && intervalo}
        </Fragment>
      ))}
    </>
  );
}

/* Seguro: HTML gerado em build-time pelos extratores, a partir de uma lista
   fechada de tags, com texto e atributos escapados. Nao ha entrada de
   terceiros; o conteudo e' da propria clinica. */
function Prosa({ html, className }: { html: string; className: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Abertura({ html, numerar }: { html: string; numerar: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 pt-14 pb-6 md:px-8 md:pt-16 md:pb-8 lg:px-10 lg:pt-20 lg:pb-10">
        <div className={numerar ? "lg:grid lg:grid-cols-12 lg:gap-x-6" : ""}>
          <div className={numerar ? "lg:col-span-8 lg:col-start-3" : ""}>
            <Reveal>
              <Prosa
                html={html}
                className={`prosa prosa-abertura${numerar ? " prosa-na-grade" : ""}`}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bloco({
  secao,
  n,
  numerar,
  nivel,
}: {
  secao: Secao;
  n: number;
  numerar: boolean;
  nivel: Documento["nivel"];
}) {
  if (!numerar) {
    return (
      <section className="relative overflow-hidden" data-nivel={nivel ?? undefined}>
        <PageGrid />
        <div className="relative mx-auto max-w-[1240px] px-6 py-6 md:px-8 md:py-7 lg:px-10 lg:py-8">
          <Reveal>
            <Prosa html={secao.html} className="prosa prosa-secao prosa-secao-fio" />
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden" data-nivel={nivel ?? undefined}>
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-10 md:px-8 md:py-12 lg:px-10 lg:py-14">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          {/* O numeral fica preso ao topo enquanto a secao rola: em texto
              clinico de 300 a 800 palavras por secao, e' o que diz onde a
              leitora esta sem ela voltar ao titulo. */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-36">
              <Reveal>
                <SectionMark n={String(n).padStart(2, "0")} />
              </Reveal>
            </div>
          </div>
          <div className="mt-6 lg:col-span-8 lg:col-start-3 lg:mt-0">
            <Reveal delay={80}>
              <Prosa html={secao.html} className="prosa prosa-secao prosa-na-grade" />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Sumario({ secoes }: { secoes: Secao[] }) {
  return (
    <nav
      aria-label="Seções desta página"
      className="corte-alto-dir relative overflow-hidden border-b border-rule bg-surface"
    >
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 pt-14 pb-10 md:px-8 md:pt-16 md:pb-12 lg:px-10 lg:pt-20 lg:pb-14">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-2">
            <Reveal>
              <span
                aria-hidden="true"
                className="block h-px w-14 bg-accent/30"
              />
            </Reveal>
          </div>
          <Reveal delay={80} className="mt-6 lg:col-span-9 lg:col-start-3 lg:mt-0">
            <ol className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
              {secoes.map((secao, i) => (
                <li key={secao.id}>
                  <a
                    href={`#${secao.id}`}
                    className="group flex min-h-[40px] items-baseline gap-4 py-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[0.6875rem] tracking-[0.18em] text-accent"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="sublinha min-w-0 [overflow-wrap:anywhere] text-[1rem] leading-[1.4] text-ink transition-colors duration-[160ms] group-hover:text-accent">
                      {secao.titulo}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </nav>
  );
}
