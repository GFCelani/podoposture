import Image from "next/image";
import type { ReactNode } from "react";

import { classificar, elementos } from "@/lib/blocos";
import { planejarFluxo, type LinhaDoFluxo, type TrechoDoFluxo } from "@/lib/fluxo";
import type { Foto } from "@/lib/ilustracao-da-pagina";

import { Blocos, Html } from "./blocos";
import { PageGrid } from "./layers";
import { Reveal } from "./reveal";

/**
 * O corpo de uma pagina de conteudo na grade de "Como e o meu atendimento":
 * doze colunas, texto em 1-7, imagem em 9-12, do primeiro ao ultimo trecho.
 * O plano (que imagem fica ao lado de que bloco) e' de lib/fluxo.ts; aqui so
 * a forma. CSS em app/fluxo.css.
 *
 * A abertura e' papel, com o primeiro paragrafo grande; cada secao e' uma
 * faixa, areia e papel alternados a partir da areia, como as etapas do
 * atendimento; um fio no texto abre uma faixa sem titulo. Os blocos que lib/blocos.ts reconhece (citacao, listas,
 * protocolo...) mantem a apresentacao deles, mas todos na coluna do texto.
 */
type Tom = "paper" | "surface";

export function CorpoEmFluxo({ html, apoio }: { html: string; apoio?: Foto[] }) {
  const plano = planejarFluxo(html, apoio);
  const Tag = plano.nivel === "h3" ? "h3" : "h2";
  return (
    <div className="fx" data-layout="fluxo">
      {plano.abertura && (
        <Faixa tom="paper" rotulo="Introdução">
          <Linhas trecho={plano.abertura} abertura />
        </Faixa>
      )}
      {plano.secoes.map((s, i) => (
        <Faixa key={s.id ?? `trecho-${i}`} tom={i % 2 === 0 ? "surface" : "paper"} rotuloId={s.id}>
          <Linhas
            trecho={s}
            titulo={
              s.id ? (
                <Tag id={s.id} className="pi-h2" dangerouslySetInnerHTML={{ __html: s.tituloHtml ?? "" }} />
              ) : undefined
            }
          />
        </Faixa>
      ))}
    </div>
  );
}

function Faixa({
  tom,
  rotulo,
  rotuloId,
  children,
}: {
  tom: Tom;
  rotulo?: string;
  rotuloId?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={rotulo}
      aria-labelledby={rotuloId}
      className={`ja-faixa fx-faixa relative overflow-hidden ${tom === "surface" ? "border-y border-rule bg-surface" : ""}`}
    >
      <PageGrid />
      <div className="ja-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">{children}</div>
    </section>
  );
}

function Linhas({
  trecho,
  titulo,
  abertura = false,
}: {
  trecho: TrechoDoFluxo;
  titulo?: ReactNode;
  abertura?: boolean;
}) {
  return (
    <>
      {trecho.linhas.map((linha, k) => (
        <div key={k} className="ja-grade fx-linha" data-fotos={linha.fotos.length || undefined}>
          <div className="ja-texto fx-texto">
            {linha.comTitulo && titulo && <Reveal variante="cortina">{titulo}</Reveal>}
            <TextoDaLinha linha={linha} lead={abertura && k === 0} />
          </div>
          {linha.fotos.length > 0 && (
            <div className="ja-foto fx-fotos">
              {linha.fotos.map((f, j) => (
                <Reveal key={f.src + j} delay={120 + 80 * j}>
                  <Figura foto={f} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/** O texto de uma linha; na abertura, o primeiro paragrafo vira o lead. */
function TextoDaLinha({ linha, lead }: { linha: LinhaDoFluxo; lead: boolean }) {
  if (!linha.html) return null;
  if (lead) {
    const [primeiro, ...resto] = elementos(linha.html);
    if (primeiro?.tag === "p") {
      const restoHtml = resto.map((e) => e.html).join("");
      return (
        <>
          <Reveal>
            <Html className="pi-lead" html={primeiro.html} />
          </Reveal>
          {restoHtml && (
            <div className="fx-blocos fx-depois-do-lead">
              <Blocos blocos={classificar(restoHtml)} modo="grade" colunas={false} atraso={100} />
            </div>
          )}
        </>
      );
    }
  }
  return (
    <div className={`fx-blocos${linha.comTitulo ? " fx-depois-do-titulo" : ""}`}>
      <Blocos blocos={classificar(linha.html)} modo="grade" colunas={false} atraso={linha.comTitulo ? 80 : 0} />
    </div>
  );
}

/** A mesma moldura e a mesma legenda das fotos do atendimento. */
function Figura({ foto }: { foto: Foto }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-plate">
      <Image
        src={foto.src}
        alt={foto.alt}
        width={foto.largura}
        height={foto.altura}
        sizes="(min-width: 1024px) 380px, 360px"
        className="h-auto w-full rounded-md saturate-[0.9]"
      />
      {foto.legenda && (
        <figcaption
          className="flex items-start gap-3 px-1 pt-3 pb-1 text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-muted"
          style={{ fontFamily: "var(--mono)" }}
        >
          <span aria-hidden="true" className="mt-[0.55em] h-px w-6 shrink-0 bg-rule" />
          {foto.legenda}
        </figcaption>
      )}
    </figure>
  );
}
