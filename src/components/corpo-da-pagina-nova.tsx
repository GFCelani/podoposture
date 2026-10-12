import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { classificar, elementos } from "@/lib/blocos";
import { distribuirFotos, type LinhaDistribuida } from "@/lib/distribuir-fotos";
import { planejarFluxo } from "@/lib/fluxo";
import type { Foto } from "@/lib/ilustracao-da-pagina";

import { Blocos, Html } from "./blocos";
import { PageGrid } from "./layers";
import { Reveal } from "./reveal";

/**
 * O corpo de uma pagina NOVA, criada pelo painel (as antigas tem o
 * renderizador delas; ver lib/paginas-antigas.ts). CSS em app/pagina-nova.css.
 *
 * Grade do topo da pagina: o mesmo involucro de 1240px e as mesmas doze
 * colunas do PageShell, entao o texto comeca na abscissa do titulo da pagina
 * e do cabecalho. Linha com imagem: texto em 1-7, imagens em 9-12, terminando
 * na borda direita do conteudo. Linha sem imagem: o texto nao reserva coluna
 * vazia; a prosa vai ate a medida dela (66ch) e os blocos largos (listas em
 * colunas, protocolo) ocupam a largura toda.
 *
 * Tipografia: nenhuma propria. Titulo de secao .pi-h2, abertura .pi-lead, e
 * o resto pelos mesmos blocos das paginas antigas (Blocos: .prosa,
 * .pi-citacao, .pi-lista...). Legenda de foto igual a da foto do topo.
 *
 * Fundo papel e areia alternados por faixa, a abertura em papel. Titulo sem
 * corpo nao abre faixa: entra na faixa da secao seguinte (ou da anterior, no
 * fim), com o respiro normal entre titulos.
 *
 * Imagens: lib/distribuir-fotos.ts decide em que linha cada uma fica e se a
 * coluna vira grade de duas ou reduz. Abaixo de 1024 tudo empilha, cada
 * imagem logo depois do texto a que pertence.
 */
type Tom = "paper" | "surface";

type Trecho = { id?: string; tituloHtml?: string; linhas: LinhaDistribuida[] };

const soTitulo = (t: Trecho) => Boolean(t.id) && t.linhas.every((l) => !l.html.trim() && l.fotos.length === 0);

/** As secoes em faixas: titulo sem corpo vai junto da secao seguinte. */
function emFaixas(trechos: Trecho[]): Trecho[][] {
  const faixas: Trecho[][] = [];
  let pendentes: Trecho[] = [];
  for (const t of trechos) {
    if (soTitulo(t)) {
      pendentes.push(t);
      continue;
    }
    faixas.push([...pendentes, t]);
    pendentes = [];
  }
  if (pendentes.length > 0) {
    if (faixas.length > 0) faixas[faixas.length - 1].push(...pendentes);
    else faixas.push(pendentes);
  }
  return faixas;
}

/** O plano da pagina nova, para o corpo e para o aviso do editor. */
export function planejarPaginaNova(html: string) {
  const plano = planejarFluxo(html);
  const { abertura, secoes, excesso } = distribuirFotos(plano);
  const trechos: Trecho[] = plano.secoes.map((s, i) => ({ id: s.id, tituloHtml: s.tituloHtml, linhas: secoes[i] }));
  return { nivel: plano.nivel, abertura, faixas: emFaixas(trechos), excesso };
}

export function CorpoDaPaginaNova({ html }: { html: string }) {
  const { nivel, abertura, faixas } = planejarPaginaNova(html);
  const Tag = nivel === "h3" ? "h3" : "h2";
  return (
    <div className="pn" data-layout="pagina-nova">
      {abertura.length > 0 && (
        <Faixa tom="paper" rotulo="Introdução">
          <div className="pn-trecho">
            <Linhas linhas={abertura} abertura />
          </div>
        </Faixa>
      )}
      {faixas.map((trechos, i) => (
        <Faixa key={trechos[0].id ?? `faixa-${i}`} tom={i % 2 === 0 ? "surface" : "paper"} rotuloId={trechos[0].id}>
          {trechos.map((t, k) => (
            <div key={t.id ?? `trecho-${k}`} className="pn-trecho">
              <Linhas
                linhas={t.linhas}
                titulo={
                  t.id ? <Tag id={t.id} className="pi-h2" dangerouslySetInnerHTML={{ __html: t.tituloHtml ?? "" }} /> : undefined
                }
              />
            </div>
          ))}
        </Faixa>
      ))}
    </div>
  );
}

function Faixa({ tom, rotulo, rotuloId, children }: { tom: Tom; rotulo?: string; rotuloId?: string; children: ReactNode }) {
  return (
    <section
      aria-label={rotulo}
      aria-labelledby={rotuloId}
      data-tom={tom}
      className={`pn-faixa relative overflow-hidden ${tom === "surface" ? "border-y border-rule bg-surface" : ""}`}
    >
      <PageGrid />
      <div className="pn-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">{children}</div>
    </section>
  );
}

function Linhas({ linhas, titulo, abertura = false }: { linhas: LinhaDistribuida[]; titulo?: ReactNode; abertura?: boolean }) {
  return (
    <>
      {linhas.map((linha, k) => (
        <div key={k} className="pn-linha" data-fotos={linha.fotos.length || undefined}>
          <div className="pn-texto">
            {linha.comTitulo && titulo && <Reveal variante="cortina">{titulo}</Reveal>}
            <TextoDaLinha linha={linha} lead={abertura && k === 0} />
          </div>
          {linha.fotos.length > 0 && (
            <div
              className="pn-fotos"
              data-arranjo={linha.arranjo}
              data-excede={linha.excede || undefined}
              style={{ "--escala": linha.escala } as CSSProperties}
            >
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
function TextoDaLinha({ linha, lead }: { linha: LinhaDistribuida; lead: boolean }) {
  if (!linha.html.trim()) return null;
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
            <div className="pn-blocos pn-depois-do-lead">
              <Blocos blocos={classificar(restoHtml)} modo="grade" colunas={false} atraso={100} />
            </div>
          )}
        </>
      );
    }
  }
  return (
    <div className={`pn-blocos${linha.comTitulo ? " pn-depois-do-titulo" : ""}`}>
      <Blocos blocos={classificar(linha.html)} modo="grade" colunas={false} atraso={linha.comTitulo ? 80 : 0} />
    </div>
  );
}

/** A moldura e a legenda da foto do topo da pagina. */
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
