import type { ReactNode } from "react";

import { classificar, elementos, paresDeListas, type Bloco } from "@/lib/blocos";
import type { Foto } from "@/lib/ilustracao-da-pagina";
import { dividirEmSecoes, type Documento, type Secao } from "@/lib/secoes";
import {
  Blocos,
  Faixa,
  FiguraLateral,
  FotosDeApoio,
  Html,
  Lateral,
  Marca,
  type Tom,
} from "./blocos";
import { PageGrid } from "./layers";
import { Reveal } from "./reveal";

/**
 * O corpo de texto de uma pagina interna, em blocos.
 *
 * Recebe o HTML migrado inteiro e o entrega dividido por `dividirEmSecoes`
 * (a abertura e uma secao por titulo); dentro de cada secao, `classificar`
 * reconhece o formato de cada trecho (prosa, citacao, lista rotulada, lista,
 * azulejos, protocolo, placa, referencias) e `Blocos` da a cada um a sua
 * apresentacao e a sua largura. Nada e' escrito e nada sai da ordem: o que
 * muda de uma pagina para outra e' so a forma, decidida pelo conteudo.
 *
 * Tres tipos de pagina:
 *   tratamento     grade de 12 colunas, lateral com fio de prumo, ponto de
 *                  sonar e numeral fixo enquanto a secao rola; sumario em
 *                  fila quando ha tres ou mais secoes; par de listas lado a
 *                  lado; bandas em superficie para listas rotuladas e banda
 *                  profunda (com a figura esquematica) para um mapa de
 *                  rotulos grande.
 *   institucional  a mesma grade, sem numerais: sao paginas de apresentacao,
 *                  e numerar "Visao" e "Formacao" leria como protocolo.
 *   post           coluna de leitura centrada; os mesmos blocos, empilhados.
 *
 * Abertura em duas medidas (primeiro paragrafo grande a esquerda, o resto
 * numa coluna estreita a direita) quando o texto antes do primeiro titulo e'
 * curto o bastante para isso; senao, o primeiro paragrafo grande e o resto
 * em prosa, como antes.
 *
 * O plano da pagina (que secao vira o que, onde cai cada corte diagonal, em
 * que banda entram as fotos de apoio) e' calculado inteiro em `planejar`
 * antes de renderizar, para a renderizacao nao carregar estado.
 */
export type TipoDeCorpo = "tratamento" | "institucional" | "post";

type SecaoLida = { secao: Secao; tituloHtml: string; blocos: Bloco[] };

type Grupo = { tom: Tom; blocos: Bloco[]; corte?: "dir" | "esq"; fotos?: Foto[] };

type Cabeca = { s: SecaoLida; n?: string; nivel: Documento["nivel"] };

type Item =
  | { kind: "secao"; cabeca: Cabeca; grupos: Grupo[] }
  | { kind: "par"; a: SecaoLida; b: SecaoLida; nA?: string; nB?: string; resto: Grupo[] }
  | { kind: "fotos"; fotos: Foto[] };

const nn = (n: number) => String(n).padStart(2, "0");

function ler(secao: Secao): SecaoLida {
  const m = secao.html.match(/^<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
  return {
    secao,
    tituloHtml: m ? m[1] : secao.titulo,
    blocos: classificar(m ? secao.html.slice(m[0].length) : secao.html),
  };
}

/**
 * Agrupa os blocos de uma secao em faixas por tom: listas rotuladas seguidas
 * formam uma banda em superficie; um mapa de rotulos com oito ou mais pecas
 * forma uma banda profunda; o resto fica no papel, junto.
 */
function agrupar(blocos: Bloco[]): Grupo[] {
  const tomDe = (b: Bloco): Tom =>
    b.tipo === "lista-rotulada"
      ? "surface"
      : b.tipo === "azulejos" && b.itens.length >= 8
        ? "deep"
        : "paper";
  const out: Grupo[] = [];
  for (const b of blocos) {
    const tom = tomDe(b);
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.tom === tom && tom !== "deep") ultimo.blocos.push(b);
    else out.push({ tom, blocos: [b] });
  }
  return out;
}

/**
 * O plano da pagina em grade. Alterna a quina do corte diagonal entre as
 * bandas tintadas; poe as fotos de apoio na primeira banda em superficie ou,
 * sem nenhuma, numa banda propria depois da primeira secao.
 */
function planejar(
  lidas: SecaoLida[],
  nivel: Documento["nivel"],
  numerar: boolean,
  apoio?: Foto[],
): Item[] {
  const pares = paresDeListas(lidas.map((s) => s.blocos));
  const itens: Item[] = [];
  let cortes = 0;
  let fotos = apoio && apoio.length > 0 ? apoio : undefined;

  const decorar = (blocos: Bloco[]): Grupo[] =>
    agrupar(blocos).map((g) => {
      const grupo: Grupo = { ...g };
      if (g.tom !== "paper") grupo.corte = cortes++ % 2 === 0 ? "dir" : "esq";
      if (g.tom === "surface" && fotos) {
        grupo.fotos = fotos;
        fotos = undefined;
      }
      return grupo;
    });

  for (let i = 0; i < lidas.length; i++) {
    const n = numerar ? nn(i + 1) : undefined;
    if (pares.has(i)) {
      const b = lidas[i + 1];
      itens.push({
        kind: "par",
        a: lidas[i],
        b,
        nA: n,
        nB: numerar ? nn(i + 2) : undefined,
        resto: decorar(b.blocos.slice(1)),
      });
      i++;
      continue;
    }
    const s = lidas[i];
    const grupos = decorar(s.blocos);
    if (grupos.length === 0) grupos.push({ tom: "paper", blocos: [] });
    itens.push({ kind: "secao", cabeca: { s, n, nivel }, grupos });
  }

  if (fotos && itens.length > 0) itens.splice(1, 0, { kind: "fotos", fotos });
  return itens;
}

export function SecoesDeConteudo({
  html,
  tipo = "post",
  apoio,
}: {
  html: string;
  tipo?: TipoDeCorpo;
  /** Fotografias de apoio, distribuidas no corpo (so grade). */
  apoio?: Foto[];
}) {
  const doc = dividirEmSecoes(html);
  const grade = tipo !== "post";
  const numerar = tipo === "tratamento";
  const lidas = doc.secoes.map(ler);

  let corpo: ReactNode;
  if (grade) {
    corpo = planejar(lidas, doc.nivel, numerar, apoio).map((item, k) => {
      if (item.kind === "fotos") {
        return (
          <Faixa key="fotos" prumo>
            <div className="pi-corpo-sec">
              <div className="pi-col-largo">
                <FotosDeApoio fotos={item.fotos} />
              </div>
            </div>
          </Faixa>
        );
      }
      if (item.kind === "par") {
        return (
          <ParDeListas key={item.a.secao.id} {...item} nivel={doc.nivel} />
        );
      }
      return <Faixas key={item.cabeca.s.secao.id ?? k} cabeca={item.cabeca} grupos={item.grupos} />;
    });
  } else {
    corpo = lidas.map((s) => <SecaoCorrida key={s.secao.id} s={s} nivel={doc.nivel} />);
  }

  return (
    <>
      {doc.abertura && <Abertura html={doc.abertura} grade={grade} />}
      {numerar && lidas.length >= 3 && <Sumario secoes={doc.secoes} />}
      {corpo}
    </>
  );
}

/* ------------------------------------------------------------------ grade */

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
  return (
    <Tag
      id={s.secao.id}
      className={className}
      dangerouslySetInnerHTML={{ __html: s.tituloHtml }}
    />
  );
}

/**
 * Uma secao em grade: uma faixa por grupo de tom. A primeira faixa leva a
 * lateral com o numeral e o titulo; as seguintes continuam sem titulo, e o
 * fio de prumo segue por todas.
 */
function Faixas({ grupos, cabeca }: { grupos: Grupo[]; cabeca?: Cabeca }) {
  // secao de uma frase: um bloco de prosa so, curto
  const curta =
    grupos.length === 1 &&
    grupos[0].blocos.length <= 1 &&
    (grupos[0].blocos[0]?.tipo ?? "prosa") === "prosa" &&
    (grupos[0].blocos[0]?.tipo === "prosa" ? grupos[0].blocos[0].html.replace(/<[^>]+>/g, "").length : 0) < 220;
  return (
    <>
      {grupos.map((g, k) => {
        const primeira = k === 0 && cabeca ? cabeca : undefined;
        return (
          <Faixa key={k} tom={g.tom} corte={g.corte} prumo continua={!primeira} curta={curta}>
            {primeira && <Lateral n={primeira.n} tom={g.tom} />}
            <div className="pi-corpo-sec">
              {primeira && (
                <Reveal className="pi-col-titulo" variante="cortina">
                  <Titulo s={primeira.s} nivel={primeira.nivel} />
                </Reveal>
              )}
              {g.fotos ? (
                <>
                  <div className="pi-esq">
                    <Blocos blocos={g.blocos} modo="grade" colunas={false} atraso={primeira ? 80 : 0} />
                  </div>
                  <FotosDeApoio fotos={g.fotos} />
                </>
              ) : (
                <Blocos blocos={g.blocos} modo="grade" atraso={primeira ? 80 : 0} />
              )}
              {g.tom === "deep" && <FiguraLateral />}
            </div>
          </Faixa>
        );
      })}
    </>
  );
}

/**
 * Duas secoes de lista lado a lado: a primeira em cartoes (colunas 1-6 do
 * corpo), a segunda numa caixa em superficie (8-10), com o proprio numeral e
 * o proprio titulo, ancorado como qualquer outro. O que sobra da segunda
 * secao continua abaixo, em faixas sem titulo.
 */
function ParDeListas({
  a,
  b,
  nA,
  nB,
  resto,
  nivel,
}: {
  a: SecaoLida;
  b: SecaoLida;
  nA?: string;
  nB?: string;
  resto: Grupo[];
  nivel: Documento["nivel"];
}) {
  const listaA = a.blocos[0];
  const listaB = b.blocos[0];
  if (listaA.tipo !== "lista" || listaB.tipo !== "lista") return null;
  return (
    <>
      <Faixa prumo>
        <Lateral n={nA} />
        <div className="pi-corpo-sec">
          <Reveal className="pi-col-titulo" variante="cortina">
            <Titulo s={a} nivel={nivel} />
          </Reveal>
          <Reveal className="pi-col-par" delay={80}>
            <Html className="pi-lista pi-cartoes" html={listaA.html} />
          </Reveal>
          <Reveal className="pi-col-caixa" delay={160}>
            <div className="pi-caixa bg-surface">
              <Marca n={nB} />
              <Titulo s={b} nivel={nivel} className="pi-h2 pi-h2-caixa" />
              <Html className="pi-lista pi-caixa-lista" html={listaB.html} />
            </div>
          </Reveal>
        </div>
      </Faixa>
      <Faixas grupos={resto} />
    </>
  );
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

function Abertura({ html, grade }: { html: string; grade: boolean }) {
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
  } else if (grade) {
    // primeiro paragrafo grande a esquerda; o resto passa pela classificacao
    // de blocos, empilhado em oito colunas
    miolo = (
      <>
        {abreComP && (
          <Reveal className="pi-col-lead">
            <Html className="pi-lead" html={primeiro.html} />
          </Reveal>
        )}
        <div className="pi-col-resto pi-resto">
          <Blocos
            blocos={classificar(abreComP ? restoHtml : html)}
            modo="grade"
            colunas={false}
            atraso={abreComP ? 120 : 0}
          />
        </div>
      </>
    );
  } else {
    // post: a coluna de leitura, com o primeiro paragrafo grande e os blocos
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

/* ---------------------------------------------------------------- sumario */

/**
 * Os titulos das secoes, ancorados, numa banda em superficie com corte
 * diagonal, em fila. Nada e' escrito: sao os titulos que ja estao no texto.
 */
function Sumario({ secoes }: { secoes: Secao[] }) {
  return (
    <nav
      aria-label="Seções desta página"
      className="pi-sumario corte-alto-dir relative overflow-hidden border-b border-rule bg-surface"
    >
      <PageGrid />
      <div className="pi-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">
        <div className="pi-grid">
          <Reveal className="pi-sumario-marca">
            <Marca />
          </Reveal>
          <Reveal className="pi-sumario-lista" delay={80}>
            <ol>
              {secoes.map((secao, i) => (
                <li key={secao.id}>
                  <a href={`#${secao.id}`} className="group">
                    <span className="n" aria-hidden="true">
                      {nn(i + 1)}
                    </span>
                    <span className="t sublinha">{secao.titulo}</span>
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
