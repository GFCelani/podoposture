import Image from "next/image";
import type { ReactNode } from "react";

import type { Foto } from "@/lib/ilustracao-da-pagina";
import type { AtendimentoLido, EtapaLida } from "@/lib/paginas-antigas";

import { Html } from "./blocos";
import { PageGrid } from "./layers";
import { Reveal } from "./reveal";

/**
 * "Como é o meu atendimento": o metodo da Dra. Claudia em oito etapas.
 *
 * O texto e' o da cliente, inteiro e na ordem (lib/atendimento.ts); aqui so
 * se decide a forma, e a forma e' a das outras paginas internas: o mesmo
 * topo com foto em moldura, os mesmos titulos (.pi-h2), o mesmo corpo
 * (.prosa), os mesmos fundos (papel e areia) e o mesmo respiro das faixas.
 *
 * Uma grade so, do topo ao fecho, e e' a do proprio topo: doze colunas, texto
 * em 1-7 e imagem em 9-12. Toda faixa abaixo repete essas duas colunas, entao
 * o titulo de cada etapa cai na mesma abscissa do titulo da pagina, e cada
 * foto na mesma coluna e na mesma largura da foto do topo. Etapa sem foto
 * deixa a coluna da direita vazia. Abaixo de 1024 tudo empilha: titulo,
 * texto e a foto por ultimo.
 *
 * Fotografias: so da clinica, nenhuma em outro lugar do site. Etapa para a
 * qual o acervo nao tem foto inedita fica sem imagem.
 *
 * Desde que as paginas foram para o banco, o texto e as fotos vem do corpo
 * que o painel edita, lido nas pecas desta composicao por `lerAtendimento`
 * (lib/paginas-antigas.ts). O topo (PageShell) e' montado por
 * pagina-interna.tsx; aqui fica so o corpo.
 */

type Tom = "paper" | "surface";

export function CorpoDoAtendimento({ lido }: { lido: AtendimentoLido }) {
  return (
    <>
      <Introducao paragrafos={lido.introducao} />
      {/* Papel e areia alternados; a introducao, logo abaixo do topo em
          areia, e' papel, entao a primeira etapa abre em areia. */}
      {lido.etapas.map((etapa, i) => (
        <Etapa key={etapa.id} etapa={etapa} tom={i % 2 === 0 ? "surface" : "paper"} />
      ))}
      {lido.fecho && <Fecho fecho={lido.fecho} />}
    </>
  );
}

/* ------------------------------------------------------------ pecas */

/** Uma faixa da pagina, com a grade de duas colunas. */
function Faixa({
  tom,
  rotulo,
  rotuloId,
  fio = false,
  children,
}: {
  tom: Tom;
  rotulo?: string;
  rotuloId?: string;
  /** Fio no topo, para separar duas faixas seguidas em papel. */
  fio?: boolean;
  children: ReactNode;
}) {
  const fundo = tom === "surface" ? "border-y border-rule bg-surface" : fio ? "border-t border-rule" : "";
  return (
    <section
      aria-label={rotulo}
      aria-labelledby={rotuloId}
      className={`ja-faixa relative overflow-hidden ${fundo}`}
    >
      <PageGrid />
      <div className="ja-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">
        <div className="ja-grade">{children}</div>
      </div>
    </section>
  );
}

/** A foto de uma etapa: a mesma moldura e a mesma legenda da foto do topo. */
function FotoDaEtapa({ foto }: { foto: Foto }) {
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
      <figcaption
        className="flex items-start gap-3 px-1 pt-3 pb-1 text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-muted"
        style={{ fontFamily: "var(--mono)" }}
      >
        <span aria-hidden="true" className="mt-[0.55em] h-px w-6 shrink-0 bg-rule" />
        {foto.legenda}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------- introducao */

function Introducao({ paragrafos }: { paragrafos: string[] }) {
  const [primeira, ...resto] = paragrafos;
  if (primeira === undefined) return null;
  return (
    <Faixa tom="paper" rotulo="Introdução">
      <div className="ja-texto">
        <Reveal>
          <div className="pi-lead">
            <p dangerouslySetInnerHTML={{ __html: primeira }} />
          </div>
        </Reveal>
        {resto.length > 0 && (
          <Reveal delay={100}>
            <Html className="prosa ja-prosa ja-depois-do-lead" html={resto.map((p) => `<p>${p}</p>`).join("")} />
          </Reveal>
        )}
      </div>
    </Faixa>
  );
}

/* ------------------------------------------------------------ etapa */

function Etapa({ etapa, tom }: { etapa: EtapaLida; tom: Tom }) {
  return (
    <Faixa tom={tom} rotuloId={etapa.id}>
      <div className="ja-texto">
        <Reveal variante="cortina">
          <h2 id={etapa.id} className="pi-h2" dangerouslySetInnerHTML={{ __html: etapa.tituloHtml }} />
        </Reveal>
        {etapa.corpoHtml.trim() && (
          <Reveal delay={80}>
            <Html className="prosa ja-prosa ja-corpo" html={etapa.corpoHtml} />
          </Reveal>
        )}
      </div>
      {etapa.fotos.length > 0 && (
        <Reveal delay={160} className="ja-foto flex flex-col gap-6">
          {etapa.fotos.map((foto) => (
            <FotoDaEtapa key={foto.src} foto={foto} />
          ))}
        </Reveal>
      )}
    </Faixa>
  );
}

/* ------------------------------------------------------------ fecho */

function Fecho({ fecho }: { fecho: NonNullable<AtendimentoLido["fecho"]> }) {
  const [perguntas, ...proposta] = fecho.paragrafos;
  return (
    <Faixa tom="paper" rotulo="Fechamento" fio>
      <div className="ja-texto">
        {fecho.separador && (
          <Reveal>
            <p aria-hidden="true" className="ja-separador" dangerouslySetInnerHTML={{ __html: fecho.separador }} />
          </Reveal>
        )}
        {perguntas !== undefined && (
          <Reveal delay={80}>
            <div className={`pi-lead${fecho.separador ? " ja-depois-do-separador" : ""}`}>
              <p dangerouslySetInnerHTML={{ __html: perguntas }} />
            </div>
          </Reveal>
        )}
        {proposta.length > 0 && (
          <Reveal delay={140}>
            <Html className="prosa ja-prosa ja-depois-do-lead" html={proposta.map((p) => `<p>${p}</p>`).join("")} />
          </Reveal>
        )}
        {fecho.citacao && (
          <Reveal delay={200}>
            <div className="pi-citacao ja-citacao">
              <blockquote>
                <p dangerouslySetInnerHTML={{ __html: fecho.citacao }} />
              </blockquote>
            </div>
          </Reveal>
        )}
        {fecho.assinatura && (
          <Reveal delay={260}>
            <div className="ja-assinatura">
              <p className="font-display text-[1.375rem] leading-[1.2] font-semibold text-ink-strong md:text-[1.5rem]">
                {fecho.assinatura.nome}
              </p>
              {fecho.assinatura.especialidades && (
                <p
                  className="mt-2 text-[0.75rem] leading-[1.8] tracking-[0.04em] text-muted"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  {fecho.assinatura.especialidades}
                </p>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </Faixa>
  );
}
