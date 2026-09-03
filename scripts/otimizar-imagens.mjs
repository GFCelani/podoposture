/**
 * Converte as imagens do site para WebP e atualiza as referencias.
 *
 * A pasta public/ chegou a 19 MB depois de trazer as 80 imagens do blog do CDN
 * do GoDaddy — tudo em JPG e PNG, boa parte em resolucao muito acima do que a
 * pagina usa. O next/image otimiza sob demanda, mas o arquivo de origem ainda e
 * baixado no deploy e ainda custa a primeira conversao; encolher a origem e
 * ganho direto.
 *
 * Usa o sharp que ja vem com o Next — nao adiciona dependencia.
 *
 * Uso:
 *   node scripts/otimizar-imagens.mjs [--aplicar]
 *
 * Sem --aplicar apenas relata o que faria.
 */

import { readFile, writeFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(RAIZ, "public");
const POSTS_JSON = path.join(RAIZ, "src", "content", "posts.json");

const APLICAR = process.argv.includes("--aplicar");

/**
 * Teto de largura padrao.
 *
 * 1600px cobre com folga qualquer imagem que aparece dentro da grade de 1240px,
 * inclusive em tela retina. Imagens full-bleed (fundo de secao a 100vw) sao a
 * excecao e ficam em FULL_BLEED: reduzi-las a 1600 deixa a foto visivelmente
 * mole em monitor grande.
 */
const LARGURA_MAXIMA = 1600;
const LARGURA_FULL_BLEED = 2560;

/** Imagens usadas como fundo a 100vw. */
const FULL_BLEED = new Set(["/img/clinica-podoposture-5.jpg", "/img/clinica-podoposture-5.webp"]);
const QUALIDADE = 80;

/**
 * Imagens que precisam continuar no formato original.
 *
 * og.png e o cartao de compartilhamento. O WhatsApp — canal principal da
 * clinica — e varios outros leitores de Open Graph nao renderizam WebP: o
 * cartao viria sem imagem. Este arquivo e recomprimido como PNG, nao convertido.
 */
const NAO_CONVERTER = new Set(["/og.png"]);

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function listarImagens(dir) {
  const achados = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      achados.push(...(await listarImagens(completo)));
    } else if (/\.(jpe?g|png)$/i.test(entrada.name)) {
      achados.push(completo);
    }
  }
  return achados;
}

async function main() {
  const imagens = await listarImagens(PUBLIC);
  const renomeadas = new Map(); // caminho publico antigo -> novo
  let antes = 0;
  let depois = 0;
  let convertidas = 0;

  for (const origem of imagens.sort()) {
    const tamanhoOrigem = (await stat(origem)).size;
    antes += tamanhoOrigem;

    const publico = "/" + path.relative(PUBLIC, origem).split(path.sep).join("/");
    const manterFormato = NAO_CONVERTER.has(publico);
    const destino = manterFormato
      ? origem
      : origem.replace(/\.(jpe?g|png)$/i, ".webp");
    const meta = await sharp(origem).metadata();

    let pipeline = sharp(origem);
    const teto = FULL_BLEED.has(publico) ? LARGURA_FULL_BLEED : LARGURA_MAXIMA;
    if (meta.width && meta.width > teto) {
      pipeline = pipeline.resize({ width: teto, withoutEnlargement: true });
    }
    const buffer = manterFormato
      ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await pipeline.webp({ quality: QUALIDADE }).toBuffer();

    // so troca se o WebP realmente compensar; um PNG pequeno de UI as vezes nao
    if (buffer.length >= tamanhoOrigem * 0.9) {
      depois += tamanhoOrigem;
      continue;
    }

    depois += buffer.length;
    convertidas += 1;
    const publicoNovo = "/" + path.relative(PUBLIC, destino).split(path.sep).join("/");
    if (publico !== publicoNovo) renomeadas.set(publico, publicoNovo);

    const ganho = tamanhoOrigem - buffer.length;
    if (ganho > 100 * 1024) {
      console.log(
        `  ${kb(tamanhoOrigem)} -> ${kb(buffer.length)}  (-${kb(ganho)})  ${publico}` +
          (manterFormato ? "  [mantido em PNG: cartao de OG]" : ""),
      );
    }

    if (APLICAR) {
      await writeFile(destino, buffer);
      if (destino !== origem) await unlink(origem);
    }
  }

  console.log(`\nimagens analisadas: ${imagens.length} | convertidas: ${convertidas}`);
  console.log(`public/: ${kb(antes)} -> ${kb(depois)}  (-${Math.round((1 - depois / antes) * 100)}%)`);

  if (!APLICAR) {
    console.log("\n(simulacao — rode com --aplicar para gravar)");
    return;
  }

  // As imagens do blog sao citadas dentro do HTML de cada post e no campo capa;
  // sem reescrever o JSON, os posts apontariam para arquivos que nao existem mais.
  let json = await readFile(POSTS_JSON, "utf8");
  let trocas = 0;
  for (const [antigo, novo] of renomeadas) {
    const partes = json.split(antigo);
    trocas += partes.length - 1;
    json = partes.join(novo);
  }
  await writeFile(POSTS_JSON, json);
  console.log(`referencias reescritas em posts.json: ${trocas}`);

  const restantes = [...renomeadas.keys()].filter((c) => json.includes(c));
  console.log(`referencias antigas restantes: ${restantes.length}`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
