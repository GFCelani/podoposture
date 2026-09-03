/**
 * Gera src/content/rotas.json: o mapa slug-original -> slug-ascii.
 *
 * O proxy (src/proxy.ts) precisa desse mapa para traduzir as URLs acentuadas
 * que o Google indexou. Ele nao pode importar src/lib/posts.ts para consegui-lo:
 * isso arrastaria posts.json inteiro — 68 posts com o HTML completo, alguns MB —
 * para dentro do bundle que roda na borda a cada requisicao. A documentacao do
 * Next e explicita em nao depender de modulos compartilhados no proxy.
 *
 * Este arquivo e derivado; nao editar a mao.
 *
 * Uso:
 *   node scripts/gerar-mapa-de-rotas.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(RAIZ, "src", "content");

/** Mesma reducao de src/lib/slug-ascii.ts. Mantidas em sincronia pelo teste abaixo. */
function paraAscii(slug) {
  return slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function montarMapa(slugs) {
  const original = {};
  const usados = new Set();
  for (const slug of slugs) {
    let ascii = paraAscii(slug) || "pagina";
    if (usados.has(ascii)) {
      let n = 2;
      while (usados.has(`${ascii}-${n}`)) n += 1;
      ascii = `${ascii}-${n}`;
    }
    usados.add(ascii);
    if (ascii !== slug) original[slug] = ascii;
  }
  return original;
}

const ROTAS_PROPRIAS = new Set(["home", "nosso-blog"]);

async function main() {
  const posts = JSON.parse(await readFile(path.join(CONTENT, "posts.json"), "utf8"));
  const paginas = JSON.parse(await readFile(path.join(CONTENT, "pages.json"), "utf8"));

  // a ordem tem que ser a mesma de src/lib/*.ts, senao o desempate de colisao
  // atribuiria sufixos diferentes e uma pagina mudaria de endereco silenciosamente
  const slugsDePost = [...posts]
    .sort((a, b) => b.dataISO.localeCompare(a.dataISO))
    .map((p) => p.slug);
  const slugsDePagina = paginas
    .filter((p) => !ROTAS_PROPRIAS.has(p.slug))
    .map((p) => p.slug);

  const mapa = {
    paginas: montarMapa(slugsDePagina),
    posts: montarMapa(slugsDePost),
  };

  const destino = path.join(CONTENT, "rotas.json");
  await writeFile(destino, JSON.stringify(mapa, null, 2));
  console.log(
    `rotas.json: ${Object.keys(mapa.paginas).length} paginas e ` +
      `${Object.keys(mapa.posts).length} posts precisam de traducao`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
