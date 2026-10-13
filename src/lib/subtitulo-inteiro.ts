/**
 * Subtitulo do topo sem corte.
 *
 * Duas origens de texto cortado no meio de palavra chegaram ao topo das
 * paginas e dos posts (corrigido em 2026-10-13):
 *
 * - Paginas do site antigo sem subtitulo proprio usavam a descricao de busca,
 *   que e' o primeiro paragrafo cortado em 155 caracteres com "…" ("promover
 *   a c…" na Acupuntura). Pior: o "…" entrava sempre que o paragrafo passava
 *   de 60 caracteres, mesmo inteiro. A descricao de busca continua curta (ela
 *   e' da <meta>); o subtitulo passa a ser o paragrafo inteiro.
 * - Posts do GoDaddy cujo resumo e' o trecho que o blog antigo gerava: os
 *   primeiros ~220 caracteres do corpo e "...". O resumo passa a ir ate o fim
 *   da frase em que o trecho parava, tirada do proprio corpo do post.
 *
 * O banco guarda o texto da importacao: paginas-db.ts e painel-db.ts trocam
 * o cortado pelo inteiro so onde o banco ainda tem exatamente o cortado
 * (o que a clinica editou no painel fica como esta).
 */

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Texto corrido de um trecho de HTML: sem tags, entidades resolvidas, espacos colapsados. */
export function textoDoHtml(html: string): string {
  // Tag de bloco separa palavras; tag de texto (<strong>, <a>) nao: virar
  // espaco poria um espaco antes da virgula que vem depois do negrito.
  return html
    .replace(/<\/?(p|br|div|li|ul|ol|h[1-6]|blockquote|figure|figcaption|hr)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira, nome: string) => {
      if (nome[0] === "#") {
        const codigo = nome[1].toLowerCase() === "x" ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
        return String.fromCodePoint(codigo);
      }
      return ENTIDADES[nome.toLowerCase()] ?? inteira;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** O primeiro paragrafo, so sem as tags (a forma que a descricao de busca sempre usou). */
export function primeiroParagrafo(html: string): string {
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

/** Termina em reticencias de corte: "..." ou "…". */
const CORTE = /\s*(\.\.\.|…)\s*$/;

/**
 * O resumo de post que o blog antigo cortou, completado ate o fim da frase
 * pelo corpo do post. Resumo sem reticencias no fim, ou que nao e' o inicio
 * do corpo, volta como veio: sem a fonte, completar seria inventar.
 */
export function resumoInteiro(resumo: string, html: string): string {
  if (!CORTE.test(resumo)) return resumo;
  const trecho = resumo.replace(CORTE, "").replace(/\s+/g, " ").trim();
  const corpo = textoDoHtml(html);
  if (!trecho || !corpo.startsWith(trecho)) return resumo;
  // A frase acaba no primeiro ponto final, de interrogacao ou de exclamacao
  // seguido de espaco (ou do fim), a partir do ultimo caractere do trecho.
  const fim = /[.!?](?=\s|$)/g;
  fim.lastIndex = Math.max(0, trecho.length - 1);
  const achou = fim.exec(corpo);
  return achou ? corpo.slice(0, achou.index + 1) : corpo;
}

/**
 * O que vai no topo e o que fica no corpo, para paginas e posts cujo
 * subtitulo vem do proprio texto (o site antigo; o resumo automatico do
 * painel). Tres casos, comparando como texto (sem tags, entidades e
 * espacos de diferenca):
 *
 * - O subtitulo E' o primeiro paragrafo: o paragrafo sai do corpo e vai
 *   para o topo com o HTML que tinha (links, negrito, quebra de linha). O
 *   texto aparece uma vez so e nada da formatacao se perde.
 * - O subtitulo e' so o COMECO do texto (o trecho que o blog antigo
 *   cortava, o resumo automatico): o topo fica sem subtitulo e o corpo vai
 *   inteiro. Mostrar o trecho no topo era repetir metade do paragrafo.
 * - Qualquer outro subtitulo (escrito no painel): aparece no topo como
 *   texto, e o corpo vai inteiro.
 */
export type TopoDoTexto = {
  /** O subtitulo do topo, em texto; null = topo sem subtitulo. */
  subtitulo: string | null;
  /** O HTML do paragrafo, quando o subtitulo e' o primeiro paragrafo do corpo. */
  subtituloHtml: string | null;
  corpo: string;
};

const PRIMEIRO_PARAGRAFO = /<p\b[^>]*>([\s\S]*?)<\/p>\s*/i;

export function topoDoTexto(html: string, subtitulo: string | null | undefined): TopoDoTexto {
  if (!subtitulo) return { subtitulo: null, subtituloHtml: null, corpo: html };
  const alvo = textoDoHtml(subtitulo);
  const m = PRIMEIRO_PARAGRAFO.exec(html);
  if (m && textoDoHtml(m[1]) === alvo) {
    return {
      subtitulo,
      subtituloHtml: m[1].trim(),
      corpo: html.slice(0, m.index) + html.slice(m.index + m[0].length),
    };
  }
  if (alvo && textoDoHtml(html).startsWith(alvo)) return { subtitulo: null, subtituloHtml: null, corpo: html };
  return { subtitulo, subtituloHtml: null, corpo: html };
}
