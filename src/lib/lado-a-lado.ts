import { elementos } from "./blocos";
import type { Documento } from "./secoes";

/**
 * Quanto do texto do post corre ao lado da capa.
 *
 * Na pagina do post a capa fica a direita, na proporcao nativa, e o texto a
 * esquerda. Ao lado dela entra o suficiente para cobrir a altura da capa;
 * dali em diante o corpo volta a coluna normal de leitura. Pouco texto ao lado
 * deixaria um vao sob ele, texto demais prenderia o artigo inteiro numa coluna
 * estreita (42% dos posts nao tem um unico subtitulo, entao "a abertura" deles
 * e' o texto todo).
 *
 * A conta e' uma estimativa em caracteres, feita no servidor e sem medir
 * nada: a coluna ao lado tem cerca de 55 caracteres por linha em 18px com
 * entrelinha 1.7 (30.6px), e cerca de 15% da altura vai para o espaco entre
 * paragrafos e para o primeiro paragrafo, que e' maior. Sobra de texto nao e'
 * problema, porque a capa e' fixa enquanto a coluna rola.
 *
 * O corte cai sempre entre dois paragrafos: nunca no meio de uma lista, nem
 * entre um rotulo em negrito e a lista que ele abre (classificar() junta os
 * dois), nem dentro de uma secao com titulo, que ou vai inteira ou nao vai.
 */

/** Largura da coluna da capa em lg, em px (ver .pi-lado em paginas-internas.css). */
const LARGURA_DA_CAPA = 400;
/** Altura maxima da capa: a janela de um laptop menos cabecalho e respiro. */
const ALTURA_MAXIMA = 630;
/** O quanto a capa sobe para dentro da banda do titulo (lg:-mt-16). */
const PENDE = 64;
const CARACTERES_POR_PX = (55 / 30.6) * 0.85;

export function caracteresAoLado(razao: number): number {
  const altura = Math.min(LARGURA_DA_CAPA / razao, ALTURA_MAXIMA) - PENDE;
  return Math.max(0, Math.round(altura * CARACTERES_POR_PX));
}

export type Reparticao = {
  /** Abertura que corre ao lado da capa (html). */
  aberturaAoLado: string;
  /** O que sobra da abertura, ja na coluna normal (html, pode ser vazio). */
  aberturaAbaixo: string;
  /** Quantas secoes inteiras, a partir da primeira, tambem ficam ao lado. */
  secoesAoLado: number;
};

const texto = (html: string) => html.replace(/<[^>]+>/g, "").trim().length;

export function repartirAoLado(doc: Documento, caracteres: number): Reparticao {
  const els = elementos(doc.abertura);
  let soma = 0;
  let corte = els.length;
  for (let i = 0; i < els.length; i++) {
    const podeCortar =
      i > 0 && els[i].tag === "p" && els[i - 1].tag === "p" && !els[i - 1].soStrong;
    if (podeCortar && soma >= caracteres) {
      corte = i;
      break;
    }
    soma += els[i].texto.length;
  }

  let secoesAoLado = 0;
  if (corte === els.length) {
    while (secoesAoLado < doc.secoes.length && soma < caracteres) {
      soma += texto(doc.secoes[secoesAoLado].html);
      secoesAoLado++;
    }
  }

  return {
    aberturaAoLado: els.slice(0, corte).map((e) => e.html).join(""),
    aberturaAbaixo: els.slice(corte).map((e) => e.html).join(""),
    secoesAoLado,
  };
}
