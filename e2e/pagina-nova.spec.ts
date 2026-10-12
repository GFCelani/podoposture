import { expect, test, type Page } from "@playwright/test";

/**
 * O layout das paginas NOVAS (components/corpo-da-pagina-nova.tsx), na
 * pagina de exemplo criada como o painel cria: o arquivo
 * src/lib/importar-exemplos/pagina-nova-de-teste.md pelo Importar arquivo.
 * Ela so existe no build do teste (PAGINAS_DE_EXEMPLO=1, ver
 * lib/paginas-de-exemplo.ts). Tem titulo sem corpo, paragrafo curto com
 * quatro fotos e secao sem imagem.
 *
 * Confere:
 *   - fontes: titulo de secao, paragrafo, lista, citacao e legenda com a
 *     mesma familia, tamanho e peso das paginas antigas;
 *   - largura: o texto comeca na abscissa do titulo da pagina e a coluna das
 *     imagens termina na borda direita do conteudo (de 1024 em diante);
 *   - regra das imagens: a coluna de imagens de uma linha nao passa do texto
 *     ao lado mais do que a tolerancia, salvo a linha marcada como excesso
 *     (que o editor avisa); as quatro fotos aparecem;
 *   - titulo sem corpo ocupa so a altura do titulo, e nenhuma faixa fica
 *     sem texto;
 *   - no telefone, cada imagem vem logo depois do texto a que pertence.
 *
 * E Palmilhas Personalizadas (pagina antiga) com as duas fotos da cliente:
 * na coluna da direita, sem coluna de imagens muito mais alta que o texto.
 */
const NOVA = "/pagina-de-teste-do-layout-novo";
const ANTIGA = "/tratamento-da-dor";
const PALMILHAS = "/palmilhas-personalizadas";

/** lib/distribuir-fotos.ts TOLERANCIA, mais a folga da estimativa sem medir. */
const TOLERANCIA = 88 + 40;

const TELAS: [number, number][] = [
  [1280, 586],
  [1440, 900],
  [1536, 695],
  [1920, 1080],
  [768, 1024],
  [390, 844],
];

async function abrir(page: Page, caminho: string) {
  await page.goto(caminho, { waitUntil: "load" });
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img")) img.loading = "eager";
    await Promise.all(
      [...document.querySelectorAll("img")].map((img) =>
        img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true })),
      ),
    );
    await document.fonts.ready;
  });
}

type Fonte = { familia: string; tamanho: string; peso: string; entrelinha: string };

async function fonte(page: Page, seletor: string): Promise<Fonte | null> {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const c = getComputedStyle(el);
    return { familia: c.fontFamily, tamanho: c.fontSize, peso: c.fontWeight, entrelinha: c.lineHeight };
  }, seletor);
}

test("fontes da pagina nova iguais as das paginas antigas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // [peca, pagina antiga que a tem, seletor]: lista compara a mesma variante.
  const pecas: [string, string, string][] = [
    ["titulo de secao", ANTIGA, ".pi-h2"],
    ["paragrafo", ANTIGA, ".prosa p"],
    ["lista", "/dor-lombar-crônica", ".pi-lista.pi-compacta li"],
    ["citacao", ANTIGA, ".pi-citacao blockquote"],
  ];
  for (const [nome, antiga, seletor] of pecas) {
    await abrir(page, encodeURI(antiga));
    const daAntiga = await fonte(page, `main ${seletor}`);
    await abrir(page, NOVA);
    const daNova = await fonte(page, `.pn ${seletor}`);
    expect(daAntiga, `${nome} na pagina antiga`).not.toBeNull();
    expect(daNova, `${nome}: fonte diferente das paginas antigas`).toEqual(daAntiga);
  }

  // Legenda: a mesma da foto ao lado do titulo das paginas antigas.
  await abrir(page, PALMILHAS);
  const legendaAntiga = await fonte(page, "header[data-hero] figcaption");
  await abrir(page, NOVA);
  expect(await fonte(page, ".pn figcaption"), "legenda").toEqual(legendaAntiga);
});

type Caixa = { l: number; r: number; t: number; b: number };
type Linha = { texto: Caixa | null; fotos: Caixa | null; figuras: Caixa[]; excede: boolean };

async function medir(page: Page, linhaSel: string, textoSel: string, fotosSel: string) {
  return page.evaluate(
    ([linhaSel, textoSel, fotosSel]) => {
      const caixa = (els: Element[]) => {
        const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
        if (rs.length === 0) return null;
        return {
          l: Math.min(...rs.map((r) => r.left)),
          r: Math.max(...rs.map((r) => r.right)),
          t: Math.min(...rs.map((r) => r.top)) + scrollY,
          b: Math.max(...rs.map((r) => r.bottom)) + scrollY,
        };
      };
      const linhas = [...document.querySelectorAll(linhaSel)].map((l) => {
        const texto = l.querySelector(`:scope > ${textoSel}`);
        const fotos = l.querySelector(`:scope > ${fotosSel}`);
        return {
          // o conteudo do texto, nao a celula da grade (que estica ate a altura da linha)
          texto: texto ? caixa([...texto.children]) : null,
          fotos: fotos ? caixa([fotos]) : null,
          figuras: fotos ? [...fotos.querySelectorAll("figure")].map((f) => caixa([f])!) : [],
          excede: fotos?.hasAttribute("data-excede") ?? false,
        };
      });
      const h1 = document.querySelector("h1")!.getBoundingClientRect();
      const involucro = document.querySelector("h1")!.closest("[class*=\"max-w-[1240px]\"]")!;
      const estilo = getComputedStyle(involucro);
      const bordaDireita = involucro.getBoundingClientRect().right - parseFloat(estilo.paddingRight);
      return { linhas, h1Esquerda: h1.left, bordaDireita, largura: document.documentElement.clientWidth };
    },
    [linhaSel, textoSel, fotosSel],
  );
}

function conferirRegra(linhas: Linha[], tela: string, largura: number, bordaDireita: number) {
  for (const [k, l] of linhas.entries()) {
    if (!l.fotos) continue;
    const onde = `${tela}, linha ${k}`;
    expect(l.fotos.r, `${onde}: imagem sai da tela`).toBeLessThanOrEqual(largura + 0.5);
    if (largura >= 1024) {
      expect(Math.abs(l.fotos.r - bordaDireita), `${onde}: coluna das imagens nao termina na borda do conteudo`).toBeLessThanOrEqual(1);
      if (l.texto) {
        expect(l.fotos.l, `${onde}: imagem invade o texto`).toBeGreaterThanOrEqual(l.texto.r);
        if (!l.excede) {
          expect(l.fotos.b - l.fotos.t, `${onde}: coluna das imagens muito mais alta que o texto`).toBeLessThanOrEqual(
            l.texto.b - l.texto.t + TOLERANCIA,
          );
        }
      }
    } else if (l.texto) {
      expect(l.fotos.t, `${onde}: imagem antes do texto a que pertence`).toBeGreaterThanOrEqual(l.texto.b - 0.5);
      const seguinte = linhas[k + 1];
      if (seguinte?.texto) {
        expect(seguinte.texto.t, `${onde}: imagem depois do texto seguinte`).toBeGreaterThanOrEqual(l.fotos.b - 0.5);
      }
    }
  }
}

for (const [largura, altura] of TELAS) {
  const tela = `${largura}x${altura}`;

  test(`pagina nova: largura, regra das imagens e titulos sem corpo em ${tela}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await abrir(page, NOVA);
    const { linhas, h1Esquerda, bordaDireita, largura: janela } = await medir(page, ".pn-linha", ".pn-texto", ".pn-fotos");

    // as quatro fotos estao na pagina, todas na coluna das imagens
    expect(linhas.reduce((n, l) => n + l.figuras.length, 0)).toBe(4);
    expect(await page.locator(".pn img").count()).toBe(await page.locator(".pn-fotos img").count());

    // o texto comeca na abscissa do titulo da pagina
    for (const [k, l] of linhas.entries()) {
      if (l.texto) expect(Math.abs(l.texto.l - h1Esquerda), `${tela}, linha ${k}: texto fora do alinhamento do titulo`).toBeLessThanOrEqual(1);
    }
    conferirRegra(linhas, tela, janela, bordaDireita);

    // titulo sem corpo: o trecho tem so a altura do titulo
    for (const nome of ["Manipulações Osteopáticas", "Educação e Conscientização"]) {
      const trecho = page.locator(".pn-trecho", { has: page.getByRole("heading", { name: nome }) });
      const [t, h] = await Promise.all([trecho.boundingBox(), trecho.getByRole("heading", { name: nome }).boundingBox()]);
      expect(t!.height, `${tela}: "${nome}" ocupa mais que o titulo`).toBeLessThanOrEqual(h!.height + 1);
    }
    // nenhuma faixa so com titulos
    const faixas = await page.locator(".pn-faixa").evaluateAll((fs) =>
      fs.map((f) => [...f.querySelectorAll(".pn-blocos, .pi-lead, figure")].some((e) => e.getBoundingClientRect().height > 0)),
    );
    expect(faixas.every(Boolean), `${tela}: faixa sem texto`).toBe(true);
  });

  test(`palmilhas: fotos da cliente na coluna da direita, sem vazio, em ${tela}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await abrir(page, PALMILHAS);
    const { linhas, bordaDireita, largura: janela } = await medir(page, ".fx-linha", ".ja-texto", ".ja-foto");
    expect(linhas.reduce((n, l) => n + l.figuras.length, 0)).toBe(2);
    conferirRegra(linhas, tela, janela, bordaDireita);
  });
}
