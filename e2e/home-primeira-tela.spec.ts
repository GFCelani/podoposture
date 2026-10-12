import { expect, test } from "@playwright/test";

/**
 * Regressao visual da primeira tela da home (hero e cabecalho), pixel a
 * pixel, nas telas que nao podem mudar sem decisao: 1536 x 695 (a
 * referencia aprovada, laptop do dono), 1536 x 730, 1920 x 945, 1280 x 559
 * (a tela da cliente, Windows em 150%) e 390 (telefone).
 *
 * As referencias (e2e/home-primeira-tela.spec.ts-snapshots/) sao o estado
 * do commit ce6136b. Mudanca de proposito no hero ou no cabecalho: conferir
 * a captura nova a olho e regravar com
 *
 *   npx playwright test e2e/home-primeira-tela.spec.ts --update-snapshots
 *
 * So a janela, nao a pagina inteira: as fotos da galeria, mais abaixo, sao
 * reamostradas de forma diferente entre execucoes e falseariam a prova.
 */
const TELAS: [number, number][] = [
  [1536, 695],
  [1536, 730],
  [1920, 945],
  [1280, 559],
  [390, 844],
];

for (const [largura, altura] of TELAS) {
  test(`primeira tela da home igual a de antes: ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(async () => {
      // so as ja baixadas: decode() de uma lazy fora da tela nao resolve
      const prontas = [...document.querySelectorAll("img")].filter((img) => img.complete);
      await Promise.all(prontas.map((img) => img.decode().catch(() => {})));
      await document.fonts.ready;
    });
    await page.waitForLoadState("networkidle");
    // a entrada do texto e a transicao de largura do cartao terminam antes
    await page.waitForTimeout(700);
    await expect(page).toHaveScreenshot(`home-${largura}x${altura}.png`, {
      animations: "disabled",
      maxDiffPixels: 0,
    });
  });
}
