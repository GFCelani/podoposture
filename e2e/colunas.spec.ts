import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * Layout unico das paginas de conteudo: texto na coluna da esquerda, toda
 * imagem na coluna da direita, alinhada pelo topo com o bloco ao lado do
 * qual foi inserida (components/corpo-em-fluxo.tsx, lib/fluxo.ts).
 *
 * Falha se, em qualquer das 11 telas da folha de contato:
 *   - houver imagem no corpo fora da coluna das imagens (.ja-foto);
 *   - de 1024 em diante, a coluna das imagens nao ficar inteira a direita
 *     do texto, ou a primeira imagem nao alinhar com o topo do texto ao lado;
 *   - duas imagens seguidas ficarem lado a lado em vez de empilhadas;
 *   - abaixo de 1024, a imagem nao vier logo depois do texto a que pertence.
 *
 * As paginas sao as de pages.json (menos a home, o indice do blog e Contato,
 * que no lugar da foto tem o mapa) e a do atendimento, que usa a mesma grade.
 */
const TELAS: [number, number][] = [
  [1280, 586],
  [1366, 657],
  [1440, 900],
  [1536, 695],
  [1536, 730],
  [1600, 900],
  [1920, 945],
  [1920, 1080],
  [2560, 1440],
  [768, 1024],
  [390, 844],
];

const FORA = new Set(["home", "nosso-blog", "contato"]);
const PAGINAS = [
  ...(JSON.parse(readFileSync(join(__dirname, "..", "src", "content", "pages.json"), "utf8")) as { slug: string }[])
    .map((p) => p.slug.normalize("NFC"))
    .filter((s) => !FORA.has(s)),
  "como-e-o-meu-atendimento",
];

type Linha = {
  texto: { l: number; r: number; t: number; b: number } | null;
  fotos: { l: number; r: number; t: number; b: number } | null;
  figuras: { l: number; r: number; t: number; b: number }[];
};

async function medir(page: Page) {
  return page.evaluate(() => {
    const ret = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY };
    };
    const main = document.querySelector("main")!;
    const hero = main.querySelector("header[data-hero]");
    const soltas = [...main.querySelectorAll("img")]
      .filter((img) => !hero?.contains(img) && !img.closest(".ja-foto"))
      .map((img) => img.getAttribute("src") ?? "?");
    const linhas = [...main.querySelectorAll(".ja-grade")].map((g) => {
      const texto = g.querySelector(":scope > .ja-texto");
      const fotos = g.querySelector(":scope > .ja-foto");
      return {
        texto: texto && texto.getBoundingClientRect().height > 0 ? ret(texto) : null,
        fotos: fotos ? ret(fotos) : null,
        figuras: fotos ? [...fotos.querySelectorAll("figure")].map(ret) : [],
      };
    });
    return { soltas, linhas, largura: document.documentElement.clientWidth };
  });
}

for (const slug of PAGINAS) {
  test(`imagens na coluna da direita: /${slug}`, async ({ page }) => {
    for (const [largura, altura] of TELAS) {
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto(`/${encodeURI(slug)}`, { waitUntil: "load" });
      const { soltas, linhas, largura: janela } = await medir(page);
      const tela = `${largura}x${altura}`;

      expect(soltas, `${tela}: imagem fora da coluna das imagens`).toEqual([]);
      for (const [k, l] of (linhas as Linha[]).entries()) {
        if (!l.fotos) continue;
        const onde = `${tela}, linha ${k}`;
        expect(l.fotos.r, `${onde}: imagem sai da tela`).toBeLessThanOrEqual(janela + 0.5);
        // empilhadas: cada figura comeca depois da anterior, na mesma abscissa
        l.figuras.forEach((f, i) => {
          if (i === 0) return;
          const antes = l.figuras[i - 1];
          expect(f.t, `${onde}: figura ${i} ao lado da anterior`).toBeGreaterThanOrEqual(antes.b - 0.5);
          expect(Math.abs(f.l - antes.l), `${onde}: figura ${i} fora do prumo`).toBeLessThanOrEqual(0.5);
        });
        if (!l.texto) continue;
        if (largura >= 1024) {
          expect(l.fotos.l, `${onde}: imagem invade a coluna do texto`).toBeGreaterThanOrEqual(l.texto.r);
          expect(Math.abs(l.figuras[0].t - l.texto.t), `${onde}: imagem nao alinha com o bloco ao lado`).toBeLessThanOrEqual(2);
        } else {
          expect(l.fotos.t, `${onde}: imagem antes do texto a que pertence`).toBeGreaterThanOrEqual(l.texto.b - 0.5);
          const seguinte = (linhas as Linha[])[k + 1];
          if (seguinte?.texto) {
            expect(seguinte.texto.t, `${onde}: imagem depois do texto seguinte`).toBeGreaterThanOrEqual(l.fotos.b - 0.5);
          }
        }
      }
    }
  });
}
