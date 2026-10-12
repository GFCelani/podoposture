import { expect, test } from "@playwright/test";

/**
 * Home em janela larga e baixa, em que a altura limita a escala do palco
 * (proporcao acima de 1536:695). A tela de referencia e' a da cliente,
 * 1280 x 559 (Windows em 150%), medida no login do painel. Antes, o palco
 * encolhia pela altura e a largura que sobrava virava margem: cartao a 141px
 * de cada borda, titulo a 178. Agora o conteudo vai de borda a borda
 * (globals.css, "HERO E CABECALHO DA HOME - janela larga e baixa").
 */
const LARGAS_E_BAIXAS: [number, number][] = [
  [1280, 559],
  [1280, 577],
  [1366, 600],
  [1229, 554],
  [1920, 800],
  [1097, 494],
];

for (const [largura, altura] of LARGAS_E_BAIXAS) {
  test(`home de borda a borda: ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const caixa = (s: string) => {
        const e = document.querySelector(s);
        if (!e) throw new Error(`${s} nao encontrado`);
        return e.getBoundingClientRect();
      };
      const tinta = (s: string) => {
        const f = document.createRange();
        f.selectNodeContents(document.querySelector(s)!);
        const rs = [...f.getClientRects()].filter((r) => r.width > 0);
        return { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)) };
      };
      const cartao = caixa(".cab-cartao");
      const itens = [...document.querySelectorAll(".cab-lista > li")].map((li) => li.getBoundingClientRect());
      const rotulos = [...document.querySelectorAll(".hero-rotulo")].map((r) => r.getBoundingClientRect());
      const baixos = [".hero-curva", ".hero-acoes", ".pd-fig--frontal", ".pd-fig--perfil"].map((s) => caixa(s).bottom);
      return {
        janela: W,
        altura: innerHeight,
        cartaoEsq: cartao.left,
        cartaoDir: W - cartao.right,
        cartaoBase: cartao.bottom,
        titulo: tinta(".hero-titulo").left,
        rotuloDir: W - Math.max(...rotulos.map((r) => r.right)),
        numeralTopo: caixa(".hero-numeral").top,
        menuEmUmaLinha: new Set(itens.map((r) => Math.round(r.top))).size === 1,
        menu: parseFloat(getComputedStyle(document.querySelector(".cab-item")!).fontSize),
        maisBaixo: Math.max(...baixos),
        rolagem: document.documentElement.scrollWidth - W,
      };
    });

    const margem = m.janela * 0.03;
    expect(m.cartaoEsq, "cartao perto da borda esquerda").toBeLessThanOrEqual(margem);
    expect(m.cartaoEsq, "cartao nao encosta na borda").toBeGreaterThanOrEqual(12);
    expect(Math.abs(m.cartaoEsq - m.cartaoDir), "margem simetrica").toBeLessThanOrEqual(1);
    expect(m.titulo - m.cartaoEsq, "o cartao comeca um pouco antes do titulo").toBeGreaterThan(20);
    expect(m.titulo, "titulo perto da borda esquerda").toBeLessThanOrEqual(m.janela * 0.06);
    expect(m.rotuloDir, "rotulos das abordagens perto da borda direita").toBeLessThanOrEqual(m.janela * 0.045);
    expect(m.rotuloDir, "rotulos nao encostam na borda").toBeGreaterThanOrEqual(12);
    expect(m.menuEmUmaLinha, "menu numa linha").toBe(true);
    expect(m.numeralTopo - m.cartaoBase, "o hero nao entra no cabecalho").toBeGreaterThanOrEqual(16);
    expect(m.maisBaixo, "o hero cabe na primeira tela").toBeLessThanOrEqual(m.altura);
    expect(m.rolagem, "sem rolagem horizontal").toBe(0);
  });
}

/** Na tela da cliente, o cabecalho cresce com a largura que ganhou: o menu
 *  passa do piso de 13px, e logo e botao acompanham. */
test("tela da cliente 1280x559: itens do cabecalho maiores que o piso", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 559 });
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => ({
    menu: parseFloat(getComputedStyle(document.querySelector(".cab-item")!).fontSize),
    cta: parseFloat(getComputedStyle(document.querySelector(".cab-cta")!).fontSize),
    marca: document.querySelector(".cab-marca")!.getBoundingClientRect().height,
  }));
  expect(m.menu).toBeGreaterThanOrEqual(14);
  expect(m.cta).toBeGreaterThan(12);
  expect(m.marca).toBeGreaterThanOrEqual(46);
});
