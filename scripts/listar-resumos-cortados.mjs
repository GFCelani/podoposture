/**
 * Lista, SEM ALTERAR NADA, os resumos e subtitulos guardados no banco que
 * terminam em corte: "…" ou "..." no fim (o resumo automatico do painel ate
 * 2026-10-13 cortava em 180 caracteres com "…"; o blog antigo, com "...").
 *
 * Para cada um diz se o corte caiu no MEIO de uma palavra (o texto do corpo
 * continua a palavra logo depois do trecho) ou entre palavras.
 *
 * So leitura: uma conexao, dois SELECT, e fecha. Roda com a URL do banco de
 * producao no ambiente:
 *
 *   DATABASE_URL="postgres://..." node scripts/listar-resumos-cortados.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL no ambiente.");
  process.exit(1);
}

/** Mesmo ajuste de lib/url-do-banco.ts: o driver nao aceita channel_binding. */
function urlParaODriver(bruta) {
  try {
    const u = new URL(bruta);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return bruta;
  }
}

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Texto corrido do corpo, em HTML ou Markdown (o bastante para comparar o comeco). */
function textoDoCorpo(corpo) {
  return corpo
    .replace(/<\/?(p|br|div|li|ul|ol|h[1-6]|blockquote|figure|figcaption|hr)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira, nome) =>
      nome[0] === "#"
        ? String.fromCodePoint(nome[1].toLowerCase() === "x" ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10))
        : (ENTIDADES[nome.toLowerCase()] ?? inteira),
    )
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const CORTE = /\s*(\.\.\.|…)\s*$/;
const LETRA = /[\p{L}\p{N}]/u;

function classificar(resumo, corpo) {
  const trecho = resumo.replace(CORTE, "").replace(/\s+/g, " ").trim();
  const texto = textoDoCorpo(corpo);
  if (!texto.startsWith(trecho)) return "corte (o corpo nao comeca pelo trecho)";
  const antes = trecho.slice(-1);
  const depois = texto.charAt(trecho.length);
  return LETRA.test(antes) && LETRA.test(depois) ? "NO MEIO DA PALAVRA" : "entre palavras";
}

const sql = postgres(urlParaODriver(url), { max: 1, prepare: false });
try {
  const linhas = [
    ...(await sql`SELECT 'post' AS tipo, slug, titulo, resumo, corpo, publicado FROM posts
                  WHERE resumo ~ '(\\.\\.\\.|…)\\s*$' ORDER BY slug`),
    ...(await sql`SELECT 'pagina' AS tipo, slug, titulo, resumo, corpo, publicado FROM paginas
                  WHERE resumo ~ '(\\.\\.\\.|…)\\s*$' ORDER BY slug`),
  ];
  if (linhas.length === 0) {
    console.log("Nenhum resumo ou subtitulo termina em corte.");
  }
  for (const l of linhas) {
    console.log(
      [
        `${l.tipo.padEnd(6)} ${l.publicado ? "publicado " : "rascunho  "} ${l.slug}`,
        `  ${classificar(l.resumo, l.corpo)}`,
        `  ...${l.resumo.slice(-90)}`,
      ].join("\n"),
    );
  }
  console.log(`\n${linhas.length} no total.`);
} finally {
  await sql.end();
}
