import { expect, test } from "@playwright/test";

/**
 * Regras do hero da home que quebram sem ninguem perceber: o subtitulo em
 * duas linhas no desktop (credencial numa linha, lugar e anos de pratica na
 * linha de dado) e a anotacao do mapa de dor apontando o proprio ponto: a
 * ciatica no palco, a lombar no empilhado, com o texto no vao das figuras.
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

/** Abaixo de 1200px o par empilha e a anotacao troca de ponto. */
const EMPILHADO: [number, number][] = [
  [1024, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
];

const TODAS: [number, number][] = [...DESKTOP, ...EMPILHADO];

/** Maior x do contorno da frontal na faixa do texto (y 150..330 de 560): a
 *  mao, em unidades do viewBox de 221. */
const MAO_FRONTAL_U = 196.8;

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

    const empilhado = largura < 1200;
    const m = await page.evaluate((maoU) => {
      const visiveis = [...document.querySelectorAll(".pd-anot")].filter((e) => getComputedStyle(e).display !== "none");
      if (visiveis.length !== 1) throw new Error(`${visiveis.length} anotacoes visiveis`);
      const anot = visiveis[0];
      const lombar = anot.classList.contains("pd-anot--lombar");
      const alvo = lombar ? /^dor lombar/i : /ciática/i;
      const ponto = [...document.querySelectorAll(".pd-fig--perfil .pd-ponto")].find((p) =>
        alvo.test(p.getAttribute("aria-label") ?? ""),
      );
      if (!ponto) throw new Error("ponto da anotacao nao encontrado");
      const a = anot.querySelector(".pd-anot-anel")!.getBoundingClientRect();
      const p = ponto.querySelector(".pd-anel")!.getBoundingClientRect();
      const t = anot.querySelector(".pd-anot-texto")!.getBoundingClientRect();
      const fr = document.querySelector(".pd-fig--frontal")!.getBoundingClientRect();
      const pf = document.querySelector(".pd-fig--perfil")!.getBoundingClientRect();
      return {
        lombar,
        erro: Math.hypot(a.left + a.width / 2 - (p.left + p.width / 2), a.top + a.height / 2 - (p.top + p.height / 2)),
        linhas: anot.querySelectorAll(".pd-anot-texto span").length,
        folgaMao: t.left - (fr.left + (fr.width * maoU) / 221),
        folgaPerfil: pf.left - t.right,
        rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, MAO_FRONTAL_U);

    expect(m.lombar, empilhado ? "empilhado aponta a lombar" : "palco aponta a ciatica").toBe(empilhado);
    if (empilhado) {
      expect(m.folgaMao, "texto entre as figuras, longe da mao da frontal").toBeGreaterThanOrEqual(12);
      expect(m.folgaPerfil, "texto antes da caixa do perfil").toBeGreaterThanOrEqual(0);
    }
    expect(m.rolagem, "sem rolagem horizontal").toBe(0);
    expect(m.erro, "o anel da anotacao esta centrado no ponto").toBeLessThanOrEqual(1);
    expect(m.linhas).toBe(3);
  });
}
