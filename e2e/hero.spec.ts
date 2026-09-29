import { expect, test } from "@playwright/test";

/**
 * Regras do hero da home que quebram sem ninguem perceber: o subtitulo em
 * duas linhas no desktop (credencial numa linha, lugar e anos de pratica na
 * linha de dado) e a anotacao do mapa de dor apontando o proprio ponto.
 */
const DESKTOP: [number, number][] = [
  [1280, 586],
  [1366, 657],
  [1440, 900],
  [1536, 695],
  [1536, 730],
  [1600, 900],
  [1920, 945],
  [1920, 1080],
  [2560, 1440],
];

const TODAS: [number, number][] = [...DESKTOP, [768, 1024], [390, 844]];

for (const [largura, altura] of DESKTOP) {
  test(`subtitulo em duas linhas: ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const linhas = await page.evaluate(() => {
      /** Linhas pela altura da caixa sobre a entrelinha. (Agrupar os tops das
       *  caixas de linha falha: pecas da mesma linha diferem 1px de topo.) */
      const contar = (el: Element) =>
        Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      const credencial = document.querySelector(".hero-credencial");
      const dado = document.querySelector(".hero-dado");
      if (!credencial || !dado) throw new Error("subtitulo do hero nao encontrado");
      return { credencial: contar(credencial), dado: contar(dado), texto: dado.textContent ?? "" };
    });

    expect(linhas.credencial, "a credencial ocupa uma linha").toBe(1);
    expect(linhas.dado, "lugar e anos de pratica ocupam uma linha").toBe(1);
    expect(linhas.texto).toMatch(/anos de experiência clínica/);
  });
}

for (const [largura, altura] of TODAS) {
  test(`anotacao aponta o proprio ponto: ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const m = await page.evaluate(() => {
      const anot = [...document.querySelectorAll(".pd-anot")].find((e) => getComputedStyle(e).display !== "none");
      if (!anot) throw new Error("nenhuma anotacao visivel");
      const alvo = anot.classList.contains("pd-anot--ciatica") ? /ciática/i : /fascite/i;
      const ponto = [...document.querySelectorAll(".pd-fig--perfil .pd-ponto")].find((p) =>
        alvo.test(p.getAttribute("aria-label") ?? ""),
      );
      if (!ponto) throw new Error("ponto da anotacao nao encontrado");
      const a = anot.querySelector(".pd-anot-anel")!.getBoundingClientRect();
      const p = ponto.querySelector(".pd-anel")!.getBoundingClientRect();
      return {
        erro: Math.hypot(a.left + a.width / 2 - (p.left + p.width / 2), a.top + a.height / 2 - (p.top + p.height / 2)),
        linhas: anot.querySelectorAll(".pd-anot-texto span").length,
      };
    });

    expect(m.erro, "o anel da anotacao esta centrado no ponto").toBeLessThanOrEqual(1);
    expect(m.linhas).toBe(3);
  });
}
