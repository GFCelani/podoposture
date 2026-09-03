/**
 * As 20 paginas internas, extraidas do site GoDaddy.
 *
 * Os slugs sao os mesmos de producao (com acento, e o '+' de "metodo-posture+").
 * Isso nao e detalhe estetico: sao as URLs que ja ranqueiam no Google, e servi-las
 * identicas e o que torna a troca de plataforma invisivel para o buscador.
 *
 * O conteudo vem de src/content/pages.json, gerado por scripts/extrair_paginas.py,
 * ja como HTML — o mesmo formato dos posts, para as duas superficies passarem pela
 * mesma tipografia. Nao editar o JSON a mao: rode o script.
 */

import dados from "@/content/pages.json";
import rotas from "@/content/rotas.json";

export type Pagina = {
  slug: string;
  /** <h1> da fonte. E o titulo exibido; nao se repete dentro do corpo. */
  titulo: string;
  /** <title> que a pagina tinha no GoDaddy, guardado como referencia. */
  tituloOriginal: string;
  descricaoOriginal: string;
  html: string;
  palavras: number;
  cortadosDoMenu: number;
};

const PAGINAS = dados as Pagina[];

/**
 * Rotas com arquivo proprio, que por isso nao passam por [slug].
 *
 * `/home` e caso a parte: no GoDaddy servia conteudo identico ao da raiz (mesmos
 * 259 KB, ambos HTTP 200, sem canonical). Aqui vira redirect 301 para "/" em
 * next.config.ts, consolidando a duplicacao.
 */
const ROTAS_PROPRIAS = new Set(["home", "nosso-blog"]);

export const PAGINAS_DINAMICAS = PAGINAS.filter((p) => !ROTAS_PROPRIAS.has(p.slug));

/**
 * ascii -> slug real.
 *
 * Derivado de src/content/rotas.json, a MESMA fonte que o middleware consulta. Se
 * cada lado calculasse o proprio mapa, um desempate de colisao diferente mudaria o
 * endereco de uma pagina sem ninguem perceber — e o sintoma seria um 404 numa URL
 * que o Google ja indexou.
 */
export const MAPA_ASCII_PAGINAS = new Map<string, string>(
  Object.entries(rotas.paginas as Record<string, string>).map(([real, ascii]) => [
    ascii,
    real,
  ]),
);

/** Slugs das rotas geradas: o ASCII quando ha traducao, senao o proprio slug. */
export const SLUGS_A_GERAR = PAGINAS_DINAMICAS.map(
  (p) => (rotas.paginas as Record<string, string>)[p.slug] ?? p.slug,
);

export function buscarPagina(slug: string): Pagina | undefined {
  // o param que chega e a chave ASCII da rota gerada
  const real = MAPA_ASCII_PAGINAS.get(slug) ?? slug;
  const alvo = real.normalize("NFC");
  return PAGINAS_DINAMICAS.find((p) => p.slug.normalize("NFC") === alvo);
}

export function tituloDaPagina(pagina: Pagina): string {
  return pagina.titulo || pagina.tituloOriginal || pagina.slug;
}

/** Descricao para <meta>: a do site antigo quando existe, senao o 1o paragrafo. */
export function descricaoDaPagina(pagina: Pagina): string {
  if (pagina.descricaoOriginal) return pagina.descricaoOriginal;
  const m = pagina.html.match(/<p>([\s\S]*?)<\/p>/);
  const texto = m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
  return texto.length > 60 ? `${texto.slice(0, 155).trimEnd()}…` : DESCRICAO_PADRAO;
}

import { DESCRICAO_PADRAO } from "./site";
