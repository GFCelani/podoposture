/**
 * Escreve width/height nas <img> dentro do HTML dos posts.
 *
 * O corpo dos posts vem do editor do GoDaddy sem dimensao nenhuma. Sem
 * width/height o navegador so descobre o espaco que a imagem ocupa quando ela
 * termina de baixar, e o texto abaixo pula — foi o que levou o CLS da pagina de
 * post a 0,185 (o limite de "bom" nos Core Web Vitals e 0,1).
 *
 * Como as imagens ja estao em public/, as dimensoes reais sao lidas do arquivo
 * e gravadas no HTML. O CSS continua mandando no tamanho exibido; width/height
 * servem so para o navegador reservar a proporcao antes do download.
 *
 * Usa o sharp que ja vem com o Next. Idempotente.
 *
 * Uso:
 *   node scripts/dimensionar-imagens-do-blog.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(RAIZ, "public");
const POSTS_JSON = path.join(RAIZ, "src", "content", "posts.json");

const dimensoes = new Map();

async function medir(src) {
  if (dimensoes.has(src)) return dimensoes.get(src);
  try {
    const { width, height } = await sharp(path.join(PUBLIC, src.replace(/^\//, ""))).metadata();
    const valor = width && height ? { width, height } : null;
    dimensoes.set(src, valor);
    return valor;
  } catch {
    dimensoes.set(src, null);
    return null;
  }
}

async function main() {
  const posts = JSON.parse(await readFile(POSTS_JSON, "utf8"));
  let anotadas = 0;
  let semArquivo = 0;

  for (const post of posts) {
    if (!post.html) continue;

    const tags = [...post.html.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
    for (const tag of tags) {
      if (/\swidth=/.test(tag)) continue;

      const src = tag.match(/src="([^"]+)"/)?.[1];
      if (!src || !src.startsWith("/")) continue;

      const medida = await medir(src);
      if (!medida) {
        semArquivo += 1;
        continue;
      }

      const novo = tag.replace(
        /<img\s/,
        `<img width="${medida.width}" height="${medida.height}" `,
      );
      post.html = post.html.split(tag).join(novo);
      anotadas += 1;
    }
  }

  await writeFile(POSTS_JSON, JSON.stringify(posts, null, 2));
  console.log(`imagens anotadas com width/height: ${anotadas}`);
  console.log(`imagens sem arquivo local: ${semArquivo}`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
