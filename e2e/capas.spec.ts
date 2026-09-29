import { expect, test, type Page } from "@playwright/test";

/**
 * Nenhuma capa do blog com espaco vazio dentro da moldura: uma imagem so, do
 * tamanho exato da moldura, object-fit cover ancorado no topo (corte so por
 * baixo), moldura sem borda nem respiro, e moldura pelo menos tao larga, em
 * razao, quanto a capa (senao o cover cortaria as laterais).
 *
 * Os quatro lugares onde capa aparece: pagina do post, indice do blog, cartoes
 * da home e posts relacionados.
 */
const LUGARES = [
  { nome: "post", caminho: "/home/f/o-c%C3%A9rebro-pode-aprender-a-sentir-dor" },
  { nome: "indice", caminho: "/nosso-blog" },
  { nome: "home", caminho: "/" },
];

async function carregarTudo(page: Page) {
  // capas abaixo da dobra sao lazy: rola a pagina para todas baixarem
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() =>
    Promise.all([...document.querySelectorAll("[data-capa] img")].map((i) => (i as HTMLImageElement).decode().catch(() => 0))),
  );
}

for (const lugar of LUGARES) {
  for (const [largura, altura] of [[1536, 695], [1920, 1080], [390, 844]] as [number, number][]) {
    test(`capas sem vazio na moldura: ${lugar.nome} ${largura}x${altura}`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto(lugar.caminho, { waitUntil: "load" });
      await carregarTudo(page);

      const capas = await page.evaluate(() =>
        [...document.querySelectorAll("[data-capa]")]
          .filter((f) => f.getBoundingClientRect().width > 0)
          .map((f) => {
            const imgs = f.querySelectorAll("img");
            const img = imgs[0] as HTMLImageElement;
            const fr = f.getBoundingClientRect();
            const ir = img.getBoundingClientRect();
            const cf = getComputedStyle(f);
            const ci = getComputedStyle(img);
            return {
              src: img.getAttribute("src")?.slice(0, 80) ?? "",
              imagens: imgs.length,
              sobraL: Math.abs(fr.width - ir.width),
              sobraA: Math.abs(fr.height - ir.height),
              fit: ci.objectFit,
              pos: ci.objectPosition,
              borda: parseFloat(cf.borderLeftWidth) + parseFloat(cf.paddingLeft) + parseFloat(cf.paddingTop),
              razaoMoldura: fr.width / fr.height,
              razaoCapa: img.naturalWidth / img.naturalHeight,
            };
          }),
      );

      expect(capas.length, "a pagina tem capas").toBeGreaterThan(0);
      for (const c of capas) {
        expect(c.imagens, `${c.src}: uma imagem so, sem fundo desfocado`).toBe(1);
        expect(c.sobraL + c.sobraA, `${c.src}: a imagem ocupa a moldura inteira`).toBeLessThanOrEqual(1);
        expect(c.fit, `${c.src}: preenche a moldura`).toBe("cover");
        expect(c.pos, `${c.src}: ancorada no topo`).toMatch(/^50% 0%/);
        expect(c.borda, `${c.src}: moldura sem borda nem respiro`).toBe(0);
        expect(c.razaoCapa, `${c.src}: nao corta as laterais`).toBeLessThanOrEqual(c.razaoMoldura + 0.01);
      }
    });
  }
}
