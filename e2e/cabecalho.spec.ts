import { expect, test, type Page } from "@playwright/test";

/**
 * A borda esquerda do cartao do cabecalho comeca SEMPRE antes da borda
 * esquerda do titulo da pagina, no topo e rolada. A regra ja regrediu uma
 * vez: a home, regerada em producao depois de uma publicacao do painel, saiu
 * com o cabecalho das paginas internas (recuo medido pela coluna de 1240px),
 * e em 1920 x 945 o cartao comecava 90px DEPOIS do titulo.
 *
 * As 11 telas sao as da folha de contato do hero. A 1536 x 695 e' a
 * referencia aprovada, e o cartao dela e' conferido ao pixel.
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

const PAGINAS = [
  { nome: "home", caminho: "/" },
  { nome: "interna", caminho: "/tratamento-da-dor" },
];

type Medida = { cartao: number; cartaoDir: number; titulo: number; janela: number };

/** Borda do cartao e a borda da TINTA do titulo (as linhas sao blocos largos). */
async function medir(page: Page): Promise<Medida> {
  return page.evaluate(() => {
    // o cartao mora num trilho de largura total: header > trilho > cartao
    const cartao = document.querySelector(".cab-cartao") ?? document.querySelector("header > div > div");
    const h1 = document.querySelector("main h1, section h1");
    if (!cartao || !h1) throw new Error("cabecalho ou titulo nao encontrado");
    const c = cartao.getBoundingClientRect();
    const faixa = document.createRange();
    faixa.selectNodeContents(h1);
    const bordas = [...faixa.getClientRects()].filter((r) => r.width > 0).map((r) => r.left);
    return {
      cartao: c.left,
      cartaoDir: c.right,
      titulo: Math.min(...bordas),
      janela: document.documentElement.clientWidth,
    };
  });
}

async function abrir(page: Page, caminho: string) {
  await page.goto(caminho, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // a entrada do texto e a transicao de largura do cartao terminam antes
  await page.waitForTimeout(600);
}

for (const pagina of PAGINAS) {
  for (const [largura, altura] of TELAS) {
    test(`cabecalho antes do titulo: ${pagina.nome} ${largura}x${altura}`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await abrir(page, pagina.caminho);

      const topo = await medir(page);
      expect(topo.cartao, "no topo, o cartao comeca antes do titulo").toBeLessThan(topo.titulo);
      expect(
        Math.abs(topo.cartao - (topo.janela - topo.cartaoDir)),
        "no topo, o cartao e' simetrico",
      ).toBeLessThanOrEqual(1);

      await page.evaluate(() => window.scrollTo(0, 150));
      await page.waitForTimeout(900);
      const rolada = await medir(page);
      expect(rolada.cartao, "rolada, o cartao comeca antes do titulo").toBeLessThan(rolada.titulo);

      await page.evaluate(() => window.scrollTo(0, 0));
    });
  }
}

test("referencia 1536x695: cartao da home identico ao aprovado", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 695 });
  await abrir(page, "/");
  const m = await medir(page);
  expect(Math.round(m.cartao)).toBe(148);
  expect(Math.round(m.cartaoDir)).toBe(1388);
  expect(Math.round(m.titulo)).toBe(194);
});
