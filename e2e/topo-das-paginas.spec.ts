import { expect, test } from "@playwright/test";

/**
 * Topo das paginas internas e dos posts com foto ao lado (page-shell.tsx).
 *
 * Desde 2026-10-13 o bloco da esquerda (trilha, emblema, titulo, subtitulo)
 * fica centrado na altura da foto, e nao mais rente a base dela. No telefone
 * empilha: texto em cima, foto embaixo. E o subtitulo sai inteiro: ate entao
 * o da Acupuntura (e de outras cinco paginas e quinze posts) parava em
 * "promover a c…" (lib/subtitulo-inteiro.ts).
 *
 * Pagina criada pelo painel usa o mesmo topo (PageShell); a de exemplo dos
 * testes nao tem foto, entao fica fora desta lista.
 */
const PAGINAS = [
  "/acupuntura",
  "/baropodometria",
  "/tratamento-da-dor",
  "/palmilhas-personalizadas",
  "/como-e-o-meu-atendimento",
  `/home/f/${encodeURIComponent("afinal-para-que-serve-o-exame-de-baropodometria")}`,
];

const LADO_A_LADO: [number, number][] = [
  [1440, 900],
  [1536, 695],
  [1280, 559],
  [1024, 461],
];

async function medir(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    // a grade do topo: o bloco de texto e a coluna da midia (foto ou capa)
    const [texto, midia] = [...(document.querySelector(".ps-topo > div")?.children ?? [])];
    if (!texto || !midia) throw new Error("topo sem texto ou sem midia");
    const t = texto.getBoundingClientRect();
    const m = midia.getBoundingClientRect();
    return {
      centroTexto: (t.top + t.bottom) / 2,
      centroMidia: (m.top + m.bottom) / 2,
      baseTexto: t.bottom,
      topoMidia: m.top,
      subtitulo: document.querySelector(".ps-subtitulo")?.textContent?.trim() ?? "",
    };
  });
}

for (const caminho of PAGINAS) {
  for (const [largura, altura] of LADO_A_LADO) {
    test(`texto centrado na foto: ${decodeURIComponent(caminho)} ${largura}x${altura}`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto(caminho, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const m = await medir(page);
      expect(Math.abs(m.centroTexto - m.centroMidia), "centro do texto no centro da foto").toBeLessThanOrEqual(1);
      expect(m.subtitulo, "subtitulo sem reticencias de corte").not.toMatch(/(\.\.\.|…)$/);
    });
  }

  test(`telefone empilha: ${decodeURIComponent(caminho)} 390x844`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(caminho, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const m = await medir(page);
    expect(m.topoMidia, "foto abaixo do texto").toBeGreaterThan(m.baseTexto);
  });
}
