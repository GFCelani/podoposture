import type { ReactNode } from "react";

import { classificar, elementos } from "@/lib/blocos";
import { dividirEmSecoes, type Documento, type Secao } from "@/lib/secoes";
import { Blocos, Html } from "./blocos";
import { PageGrid } from "./layers";
import { Reveal } from "./reveal";

/**
 * O corpo de texto de um post, em blocos.
 *
 * Recebe o HTML inteiro e o entrega dividido por `dividirEmSecoes` (a
 * abertura e uma secao por titulo); dentro de cada secao, `classificar`
 * reconhece o formato de cada trecho (prosa, citacao, lista rotulada, lista,
 * azulejos, protocolo, placa, referencias) e `Blocos` da a cada um a sua
 * apresentacao, empilhados na coluna de leitura. Nada e' escrito e nada sai
 * da ordem.
 *
 * Abertura em duas medidas (primeiro paragrafo grande a esquerda, o resto
 * numa coluna estreita a direita) quando o texto antes do primeiro titulo e'
 * curto o bastante para isso; senao, o primeiro paragrafo grande e o resto
 * em prosa.
 *
 * As paginas de conteudo tinham aqui um segundo modo, em grade, com lateral
 * numerada e sumario. Desde 2026-10 elas usam o layout unico de
 * corpo-em-fluxo.tsx (texto a esquerda, imagem a direita).
 */
export type TipoDeCorpo = "post";

type SecaoLida = { secao: Secao; tituloHtml: string; blocos: ReturnType<typeof classificar> };

function ler(secao: Secao): SecaoLida {
  const m = secao.html.match(/^<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
  return {
    secao,
    tituloHtml: m ? m[1] : secao.titulo,
    blocos: classificar(m ? secao.html.slice(m[0].length) : secao.html),
  };
}

export function SecoesDeConteudo({ html }: { html: string; tipo?: TipoDeCorpo }) {
  const doc = dividirEmSecoes(html);
  const lidas = doc.secoes.map(ler);
  return (
    <>
      {doc.abertura && <Abertura html={doc.abertura} />}
      {lidas.map((s) => (
        <SecaoCorrida key={s.secao.id} s={s} nivel={doc.nivel} />
      ))}
    </>
  );
}

function Titulo({
  s,
  nivel,
  className = "pi-h2",
}: {
  s: SecaoLida;
  nivel: Documento["nivel"];
  className?: string;
}) {
  const Tag = nivel === "h3" ? "h3" : "h2";
  return <Tag id={s.secao.id} className={className} dangerouslySetInnerHTML={{ __html: s.tituloHtml }} />;
}

/* ---------------------------------------------------------------- corrido */

function SecaoCorrida({ s, nivel }: { s: SecaoLida; nivel: Documento["nivel"] }) {
  return (
    <section className="relative overflow-hidden">
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-6 md:px-8 md:py-7 lg:px-10 lg:py-8">
        <div className="pi-corrido">
          <Reveal>
            <Titulo s={s} nivel={nivel} className="pi-h2 pi-h2-corrido" />
          </Reveal>
          <Blocos blocos={s.blocos} modo="corrido" atraso={80} />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- abertura */

function Abertura({ html }: { html: string }) {
  const els = elementos(html);
  const [primeiro, ...resto] = els;
  const abreComP = primeiro?.tag === "p";
  const restoHtml = resto.map((e) => e.html).join("");
  const duasMedidas =
    abreComP &&
    resto.length >= 1 &&
    resto.length <= 2 &&
    resto.every((e) => e.tag === "p") &&
    resto.reduce((a, e) => a + e.texto.length, 0) <= 700;

  let miolo: ReactNode;
  if (duasMedidas) {
    miolo = (
      <>
        <Reveal className="pi-col-lead">
          <Html className="pi-lead" html={primeiro.html} />
        </Reveal>
        <Reveal className="pi-col-apoio" delay={120}>
          <Html className="pi-apoio" html={restoHtml} />
        </Reveal>
      </>
    );
  } else {
    // post: o corpo corrido, com o primeiro paragrafo grande e os blocos
    // classificados em seguida. E' o unico corpo dos 23 posts sem subtitulo.
    miolo = (
      <div className="pi-col-toda pi-corrido pi-corrido-abertura">
        {abreComP && (
          <Reveal>
            <Html className="pi-lead" html={primeiro.html} />
          </Reveal>
        )}
        <Blocos
          blocos={classificar(abreComP ? restoHtml : html)}
          modo="corrido"
          atraso={abreComP ? 120 : 0}
        />
      </div>
    );
  }

  return (
    <section className="pi-abertura relative overflow-hidden">
      <PageGrid />
      <div className="pi-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">
        <div className="pi-grid">{miolo}</div>
      </div>
    </section>
  );
}
