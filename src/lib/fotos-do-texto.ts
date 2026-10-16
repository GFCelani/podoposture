import { FOTO_DO_ACERVO } from "./markdown";

/**
 * As fotos que moram dentro do texto de uma pagina ou post, para o painel
 * mostrar cada uma como foto (miniatura, trocar, descricao, legenda) e nao
 * so como a linha `![descricao](/img/... "legenda")` no meio do Markdown.
 *
 * Ate 2026-10-16 o editor so mostrava como foto a do lado do titulo (a capa);
 * as do corpo existiam, iam ao site, mas no painel eram texto cru. Em Como e
 * o meu atendimento eram quatro das cinco fotos da pagina.
 *
 * Nada aqui muda o formato: a foto continua sendo a linha de Markdown que o
 * site sempre leu (lib/markdown.ts), e trocar uma foto reescreve so aquela
 * linha. A ordem e' a do texto, que e' a ordem em que a pagina as mostra
 * depois da capa.
 *
 * O titulo da imagem e' a legenda, menos na foto do acervo do blog
 * (/img/blog/), em que ele guarda a medida do arquivo ("1024x768").
 */

export type FotoDoTexto = {
  /** Posicao da linha da imagem no texto: [inicio, fim). */
  inicio: number;
  fim: number;
  src: string;
  alt: string;
  /** Legenda visivel; vazia na foto do acervo do blog, cujo titulo e' a medida. */
  legenda: string;
  /** O titulo de secao (##) que vem antes da foto; vazio = antes do primeiro. */
  secao: string;
  /** Descricao e titulo como estao escritos (com as fugas), para reescrever igual. */
  altCru: string;
  tituloCru: string;
};

/** `![alt](src "titulo")`, com as fugas que o conversor do painel escreve. */
const IMAGEM = /!\[((?:\\.|[^\]\\\n])*)\]\(\s*<?([^\s)>]+)>?(?:\s+"((?:\\.|[^"\\\n])*)")?\s*\)/g;
const TITULO_DE_SECAO = /^ {0,3}#{2,6}[ \t]+(.+?)[ \t#]*$/gm;
/** Bloco de codigo cercado: imagem ali dentro e' texto, nao foto. */
const CERCA = /^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1[ \t]*$/gm;

const desfazer = (s: string) => s.replace(/\\(.)/g, "$1");
const limparTitulo = (s: string) => desfazer(s.replace(/[*_=+`]/g, "")).trim();

export function fotosDoTexto(corpo: string): FotoDoTexto[] {
  const cercas = [...corpo.matchAll(CERCA)].map((m) => [m.index, m.index + m[0].length] as const);
  const titulos = [...corpo.matchAll(TITULO_DE_SECAO)].map((m) => ({ em: m.index, texto: limparTitulo(m[1]) }));
  const fotos: FotoDoTexto[] = [];
  for (const m of corpo.matchAll(IMAGEM)) {
    if (cercas.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const src = m[2];
    const titulo = desfazer(m[3] ?? "");
    const antes = titulos.filter((t) => t.em < m.index).at(-1);
    fotos.push({
      inicio: m.index,
      fim: m.index + m[0].length,
      src,
      alt: desfazer(m[1]),
      legenda: FOTO_DO_ACERVO.test(src) ? "" : titulo,
      secao: antes?.texto ?? "",
      altCru: m[1],
      tituloCru: m[3] ?? "",
    });
  }
  return fotos;
}

/**
 * Descricao escrita como o Markdown le: sem colchete (como a conversao do
 * HTML faz) nem quebra, barra com fuga. Sem aparar as pontas: o campo do
 * painel reescreve a linha a cada tecla, e o espaco entre duas palavras
 * sumiria antes da segunda.
 */
const escreverAlt = (alt: string) => alt.replace(/[[\]]/g, "").replace(/[\n\r]+/g, " ").replace(/\\/g, "\\\\");

/** Legenda escrita como titulo da imagem: sem quebra, aspas e barra com fuga. */
const escreverTitulo = (titulo: string) => titulo.replace(/[\n\r]+/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export type MudancaNaFoto = { src?: string; alt?: string; legenda?: string };

/**
 * O texto com a foto de numero `indice` mudada; o resto, byte a byte igual.
 * Foto do acervo do blog que continua a mesma guarda a medida no titulo;
 * qualquer outra leva a legenda nele.
 */
export function mudarFotoDoTexto(corpo: string, indice: number, mudanca: MudancaNaFoto): string {
  const foto = fotosDoTexto(corpo)[indice];
  if (!foto) return corpo;
  const src = mudanca.src ?? foto.src;
  const alt = mudanca.alt === undefined ? foto.altCru : escreverAlt(mudanca.alt);
  let titulo: string;
  if (FOTO_DO_ACERVO.test(src)) titulo = src === foto.src ? foto.tituloCru : "";
  else if (mudanca.legenda !== undefined) titulo = escreverTitulo(mudanca.legenda);
  else titulo = FOTO_DO_ACERVO.test(foto.src) ? "" : foto.tituloCru;
  const linha = `![${alt}](${src}${titulo ? ` "${titulo}"` : ""})`;
  return corpo.slice(0, foto.inicio) + linha + corpo.slice(foto.fim);
}
