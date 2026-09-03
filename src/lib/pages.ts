/**
 * As 20 paginas internas, extraidas do site GoDaddy.
 *
 * Os slugs sao os mesmos de producao (com acento, e o '+' de
 * "metodo-posture+"). Isso nao e detalhe estetico: sao as URLs que ja ranqueiam
 * no Google, e servi-las identicas e o que torna a troca de plataforma
 * invisivel para o buscador — nenhum redirect, nenhuma reindexacao.
 *
 * O conteudo vem de src/content/pages.json, gerado por
 * scripts/extrair_paginas.py. Nao editar o JSON a mao: rode o script.
 */

import dados from "@/content/pages.json";
import rotas from "@/content/rotas.json";
import { DESCRICAO_PADRAO } from "./site";

export type BlocoTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "li" | "blockquote";

export type Bloco = {
  tag: BlocoTag;
  texto: string;
};

export type Pagina = {
  slug: string;
  /** <title> que a pagina tinha no GoDaddy. Guardado como referencia. */
  tituloOriginal: string;
  descricaoOriginal: string;
  imagemOriginal: string;
  blocos: Bloco[];
  palavras: number;
};

const PAGINAS = dados as Pagina[];

/**
 * Rotas que existem como arquivo proprio e por isso nao passam por [slug].
 *
 * `/home` e um caso a parte: no GoDaddy ele servia conteudo identico ao da raiz
 * (mesmos 259 KB, ambos com HTTP 200 e sem canonical). Aqui ele vira redirect
 * 301 para "/" em next.config.ts, consolidando a duplicacao.
 */
const ROTAS_PROPRIAS = new Set(["home", "nosso-blog"]);

export const PAGINAS_DINAMICAS = PAGINAS.filter((p) => !ROTAS_PROPRIAS.has(p.slug));

/**
 * ascii -> slug real.
 *
 * Derivado de src/content/rotas.json, a MESMA fonte que o middleware consulta.
 * Se cada lado calculasse o proprio mapa, um desempate de colisao diferente
 * mudaria o endereco de uma pagina sem ninguem perceber — e o sintoma seria
 * um 404 em producao numa URL que o Google ja indexou.
 */
export const MAPA_ASCII_PAGINAS = new Map<string, string>(
  Object.entries(rotas.paginas as Record<string, string>).map(
    ([real, ascii]) => [ascii, real],
  ),
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

/**
 * Titulo de exibicao da pagina.
 *
 * Os titulos do site antigo sao fracos e inconsistentes: "RPG", "Posturologia",
 * "podoposture.com.br - Hernia De Disco, Enxaqueca". O primeiro <h1> do proprio
 * conteudo costuma ser mais descritivo e mantem a palavra-chave que ja ranqueia.
 */
export function tituloDaPagina(pagina: Pagina): string {
  const h1 = pagina.blocos.find((b) => b.tag === "h1");
  if (h1?.texto) return h1.texto;
  const h2 = pagina.blocos.find((b) => b.tag === "h2");
  return h2?.texto ?? pagina.slug;
}

/** Descricao para <meta>: a do site antigo quando existe, senao o 1o paragrafo. */
export function descricaoDaPagina(pagina: Pagina): string {
  if (pagina.descricaoOriginal) return pagina.descricaoOriginal;
  const p = pagina.blocos.find((b) => b.tag === "p" && b.texto.length > 60);
  return p ? `${p.texto.slice(0, 155).trimEnd()}…` : DESCRICAO_PADRAO;
}
