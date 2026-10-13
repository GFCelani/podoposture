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
 * O corpo sem o paragrafo que o topo ja mostra. Nas paginas e posts do site
 * antigo o subtitulo e' o primeiro paragrafo do corpo, e ele aparecia duas
 * vezes, no topo e logo abaixo. Se o primeiro <p> do corpo diz exatamente o
 * subtitulo (comparado como texto: sem tags, entidades e espacos de
 * diferenca), ele sai do corpo e o texto fica uma vez so, no topo. Qualquer
 * diferenca, como um subtitulo escrito no painel ou um resumo que e' so o
 * comeco do paragrafo, e o corpo volta inteiro.
 */
export function semParagrafoRepetido(html: string, subtitulo: string | null | undefined): string {
  if (!subtitulo) return html;
  const m = /<p\b[^>]*>([\s\S]*?)<\/p>\s*/i.exec(html);
  if (!m || textoDoHtml(m[1]) !== textoDoHtml(subtitulo)) return html;
  return html.slice(0, m.index) + html.slice(m.index + m[0].length);
}
