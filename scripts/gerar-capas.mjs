/**
 * Mede as capas do blog e gera a imagem de compartilhamento de cada uma.
 *
 * As capas sao artes de Instagram com texto na propria imagem, em 9:16, 2:3,
 * 3:4, 4:5, 1:1 e 3:2. Qualquer recorte corta texto. Duas saidas, para que
 * nenhum lugar do site precise recortar:
 *
 *   src/content/capas.json   largura e altura reais de cada capa. A pagina do
 *                            post mostra a capa na proporcao nativa e precisa
 *                            da razao antes do download para o CLS ficar zero.
 *   public/img/og/<nome>.jpg 1200x630 com a capa inteira no centro, sobre ela
 *                            mesma desfocada. Redes sociais recortam a imagem
 *                            de og para 1.91:1; entregando ja nessa razao, nao
 *                            ha o que recortar.
 *
 * Passo manual, como dimensionar-imagens-do-blog.mjs: roda de novo quando
 * entrar capa nova em public/img/blog. Capa do painel (/img/post/) traz as
 * medidas no nome e nao passa por aqui.
 *
 * Uso:
 *   node scripts/gerar-capas.mjs
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(RAIZ, "public");
const BLOG = path.join(PUBLIC, "img", "blog");
const OG = path.join(PUBLIC, "img", "og");
const SAIDA = path.join(RAIZ, "src", "content", "capas.json");

const L = 1200;
const A = 630;
/** Respiro acima e abaixo da capa no cartao de compartilhamento. */
const MARGEM = 40;

async function gerarOg(arquivo, destino) {
  const fundo = await sharp(arquivo)
    .resize(L, A, { fit: "cover" })
    .blur(36)
    .modulate({ brightness: 0.82, saturation: 0.8 })
    .toBuffer();
  const frente = await sharp(arquivo)
    .resize(L - 2 * MARGEM, A - 2 * MARGEM, { fit: "inside" })
    .toBuffer();
  await sharp(fundo)
    .composite([{ input: frente, gravity: "center" }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(destino);
}

async function main() {
  await mkdir(OG, { recursive: true });
  // As capas dos posts e as dez de reserva (posts.ts); as fotos do corpo dos
  // posts moram na mesma pasta e nao sao capa.
  const posts = JSON.parse(await readFile(path.join(RAIZ, "src", "content", "posts.json"), "utf8"));
  const capas = new Set(posts.map((p) => p.capa).filter(Boolean).map((c) => path.basename(c)));
  for (let i = 1; i <= 10; i += 1) capas.add(`${String(i).padStart(2, "0")}.webp`);
  const nomes = (await readdir(BLOG)).filter((n) => capas.has(n)).sort();
  const medidas = {};

  for (const nome of nomes) {
    const arquivo = path.join(BLOG, nome);
    const { width, height } = await sharp(arquivo).metadata();
    if (!width || !height) continue;
    medidas[`/img/blog/${nome}`] = [width, height];
    await gerarOg(arquivo, path.join(OG, nome.replace(/\.webp$/, ".jpg")));
  }

  await writeFile(SAIDA, JSON.stringify(medidas, null, 1) + "\n");
  console.log(`${Object.keys(medidas).length} capas medidas; og em public/img/og/`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
