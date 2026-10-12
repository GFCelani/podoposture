/**
 * O corpo de uma pagina de conteudo em duas colunas: texto a esquerda,
 * imagem a direita, cada imagem alinhada pelo topo com o bloco ao lado do
 * qual foi inserida. E' a grade de "Como e o meu atendimento" (texto em 1-7,
 * imagem em 9-12) aplicada a qualquer texto, sem decisao pagina a pagina.
 *
 * Este modulo so faz o plano, sem React: divide o corpo em trechos (a
 * abertura e uma secao por titulo, por `dividirEmSecoes`), tira de cada
 * trecho as imagens e as prende ao bloco de texto que vem antes delas, e
 * corta o trecho em linhas. Uma linha comeca no titulo do trecho e em todo
 * bloco que tem imagem presa; o texto da linha vai ate o bloco seguinte que
 * tenha imagem. Na tela, cada linha e' uma fileira da grade: o texto na
 * coluna esquerda e as imagens dela empilhadas na direita, a partir do
 * mesmo topo. No telefone a fileira empilha e as imagens vem logo depois do
 * texto a que pertencem.
 *
 * As regras que isto garante, e que o teste confere:
 *   - imagem depois de um titulo alinha com o titulo;
 *   - imagem depois de um paragrafo alinha com o paragrafo;
 *   - duas imagens seguidas empilham na mesma coluna, nunca lado a lado;
 *   - imagem sem texto antes dela vai para o primeiro bloco depois; num
 *     trecho sem texto nenhum, fica sozinha na coluna da direita;
 *   - imagem no meio de um paragrafo sai dele e fica ao lado dele;
 *   - um fio (<hr>, o `---` do Markdown) fecha a faixa e abre outra, sem
 *     titulo: e' como o texto separa um fecho do resto.
 */
import { elementos, type Elemento } from "./blocos";
import type { Foto } from "./ilustracao-da-pagina";
import { dividirEmSecoes, type Documento } from "./secoes";

export type LinhaDoFluxo = {
  /** HTML dos blocos de texto da linha, sem o titulo do trecho. */
  html: string;
  /** A linha comeca no titulo do trecho. */
  comTitulo: boolean;
  /** Imagens presas ao primeiro bloco da linha, na ordem do texto. */
  fotos: Foto[];
};

export type TrechoDoFluxo = {
  /** Ancora do titulo; a abertura nao tem. */
  id?: string;
  /** Miolo do titulo (sem a tag), quando o trecho e' uma secao. */
  tituloHtml?: string;
  linhas: LinhaDoFluxo[];
};

export type PlanoDoFluxo = {
  nivel: Documento["nivel"];
  abertura: TrechoDoFluxo | null;
  secoes: TrechoDoFluxo[];
};

const IMG = /<img\b[^>]*>/gi;

function atributo(tag: string, nome: string): string {
  const m = new RegExp(`\\s${nome}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : "";
}

function desfazerEscape(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** As imagens de um trecho de HTML, com medida; sem medida, nao entra. */
export function imagensDoHtml(html: string): Foto[] {
  const legenda = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(html);
  const fotos: Foto[] = [];
  for (const tag of html.match(IMG) ?? []) {
    const largura = Number(atributo(tag, "width"));
    const altura = Number(atributo(tag, "height"));
    const src = desfazerEscape(atributo(tag, "src"));
    if (!src || !(largura > 0) || !(altura > 0)) continue;
    fotos.push({
      src,
      alt: desfazerEscape(atributo(tag, "alt")),
      legenda: legenda ? desfazerEscape(legenda[1].replace(/<[^>]+>/g, "").trim()) : desfazerEscape(atributo(tag, "title")),
      largura,
      altura,
    });
  }
  return fotos;
}

/**
 * O que sobra de um elemento sem as imagens. Paragrafo que so tinha imagem
 * (o formato do Markdown: `<p><img></p>`) e figura somem por inteiro.
 */
function semImagens(el: Elemento): string {
  if (el.tag === "figure") return "";
  const resto = el.html.replace(IMG, "");
  const vazio = resto
    .replace(/<\/?p\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/g, "")
    .trim();
  return vazio ? resto.replace(/<p>(\s*<br\s*\/?>)+/i, "<p>").replace(/(<br\s*\/?>\s*)+<\/p>$/i, "</p>") : "";
}

type Peca = { html: string; fotos: Foto[] };

/**
 * Os blocos de texto de um trecho, cada um com as imagens que vieram logo
 * depois dele. Imagem antes de qualquer texto espera o primeiro bloco.
 */
function pecasDe(html: string, comTitulo: boolean): Peca[] {
  // o titulo do trecho e' a primeira peca: imagem logo depois dele fica nele
  const pecas: Peca[] = comTitulo ? [{ html: "", fotos: [] }] : [];
  let pendentes: Foto[] = [];
  for (const el of elementos(html)) {
    const fotos = /<img\b/i.test(el.html) ? imagensDoHtml(el.html) : [];
    const texto = fotos.length > 0 || el.tag === "figure" ? semImagens(el) : el.html;
    if (texto) {
      pecas.push({ html: texto, fotos: pendentes });
      pendentes = [];
    }
    if (fotos.length === 0) continue;
    const alvo = pecas[pecas.length - 1];
    if (alvo) alvo.fotos.push(...fotos);
    else pendentes.push(...fotos);
  }
  if (pendentes.length > 0) pecas.push({ html: "", fotos: pendentes });
  return pecas;
}

/** Corta as pecas em linhas: uma nova a cada bloco com imagem presa. */
function linhasDe(pecas: Peca[], comTitulo: boolean): LinhaDoFluxo[] {
  const linhas: LinhaDoFluxo[] = [];
  pecas.forEach((p, k) => {
    const titulo = comTitulo && k === 0;
    const abre = k === 0 || p.fotos.length > 0;
    if (abre) linhas.push({ html: titulo ? "" : p.html, comTitulo: titulo, fotos: [...p.fotos] });
    else linhas[linhas.length - 1].html += p.html;
  });
  return linhas;
}

const FIO = /<hr\b[^>]*>/i;

/**
 * O plano de uma pagina. `apoio` sao as fotos que o painel guarda por
 * pagina, presas a um titulo pelo `secao` da primeira (sem ancora, ou com
 * ancora que o texto nao tem mais, ao titulo da primeira secao): entram
 * depois das imagens que o proprio texto ja tiver ali.
 */
export function planejarFluxo(html: string, apoio: Foto[] = []): PlanoDoFluxo {
  const doc = dividirEmSecoes(html);

  const semTitulo = (trecho: string): TrechoDoFluxo[] =>
    trecho.trim() ? [{ linhas: linhasDe(pecasDe(trecho, false), false) }] : [];

  // um fio fecha a faixa: o que vem depois dele e' uma faixa sem titulo
  const [primeiroDaAbertura, ...restoDaAbertura] = doc.abertura.split(FIO);
  const abertura = primeiroDaAbertura.trim() ? linhasDe(pecasDe(primeiroDaAbertura, false), false) : [];
  const secoes: TrechoDoFluxo[] = restoDaAbertura.flatMap(semTitulo);
  for (const s of doc.secoes) {
    const m = /^<(h[23])[^>]*>([\s\S]*?)<\/\1>/.exec(s.html);
    const [corpo, ...resto] = (m ? s.html.slice(m[0].length) : s.html).split(FIO);
    secoes.push({ id: s.id, tituloHtml: m ? m[2] : s.titulo, linhas: linhasDe(pecasDe(corpo, true), true) });
    secoes.push(...resto.flatMap(semTitulo));
  }

  if (apoio.length > 0) {
    const ancora = apoio[0].secao;
    const alvo = secoes.find((s) => s.id && s.id === ancora) ?? secoes.find((s) => s.id);
    const fotos = apoio.map((f) => {
      const copia = { ...f };
      delete copia.secao;
      return copia;
    });
    if (alvo) alvo.linhas[0].fotos.push(...fotos);
    else if (abertura.length > 0) abertura[0].fotos.push(...fotos);
    else abertura.push({ html: "", comTitulo: false, fotos });
  }

  return {
    nivel: doc.nivel,
    abertura: abertura.length > 0 ? { linhas: abertura } : null,
    secoes,
  };
}

/** Os titulos que podem receber as fotos do painel: no fluxo, todos. */
export function trechosDoFluxo(html: string): { id: string; titulo: string }[] {
  return dividirEmSecoes(html).secoes.map((s) => ({ id: s.id, titulo: s.titulo }));
}
