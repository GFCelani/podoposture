import { expect, test, type Page } from "@playwright/test";

/**
 * O painel de ponta a ponta, com banco: a ordem das paginas no menu (setas da
 * aba "Paginas do site") e o Importar arquivo do blog e das paginas.
 *
 * Grava no banco, entao NAO roda no pre-commit (o build de la nao tem banco
 * nem senha): so com PAINEL_SENHA e um servidor de pe com DATABASE_URL de um
 * Postgres descartavel, ADMIN_PASSWORD_HASH e ADMIN_SESSION_SECRET:
 *
 *   PW_BASE_URL=http://localhost:3218 PAINEL_SENHA="..." npx playwright test e2e/painel-paginas.spec.ts --workers=1
 *
 * Cada teste desfaz o que fez (ordem de volta, textos apagados). --workers=1
 * porque todos mexem no mesmo banco e no mesmo login: em paralelo (inclusive
 * com --repeat-each) um teste reordena o grupo no meio do outro, e o login
 * simultaneo cai no limite de tentativas.
 */
const SENHA = process.env.PAINEL_SENHA;

test.describe.configure({ mode: "serial" });
test.skip(!SENHA || !process.env.PW_BASE_URL, "precisa de PAINEL_SENHA e PW_BASE_URL (servidor com banco)");
test.use({ viewport: { width: 1440, height: 900 } });

async function entrar(page: Page, aba: "Blog" | "Páginas do site") {
  await page.goto("/publicar");
  const senha = page.getByRole("textbox", { name: "Senha" });
  const tab = page.getByRole("tab", { name: aba });
  // com a sessao de antes ainda valendo, o painel abre direto
  await expect(senha.or(tab)).toBeVisible();
  if (await senha.isVisible()) {
    await senha.fill(SENHA!);
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await tab.click();
}

/** Os titulos das paginas de um grupo, de cima para baixo, na lista do painel. */
async function titulosNoPainel(page: Page, grupo: string): Promise<string[]> {
  const secao = page.locator("section", { has: page.getByRole("heading", { name: `Menu · ${grupo}` }) });
  return secao.locator("li p.font-display").allInnerTexts();
}

const endereco = (href: string | null) => decodeURIComponent(href ?? "").normalize("NFC");

/** Os enderecos das paginas publicadas de um grupo, na ordem da lista do painel. */
async function enderecosNoPainel(page: Page, grupo: string): Promise<string[]> {
  const secao = page.locator("section", { has: page.getByRole("heading", { name: `Menu · ${grupo}` }) });
  const links = secao.getByRole("link", { name: "ver no site" });
  return (await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")))).map(endereco);
}

/**
 * Os enderecos de um grupo no menu do topo do site (o menu usa rotulos
 * proprios, entao a comparacao e' pelo endereco, nao pelo titulo).
 */
async function enderecosNoMenu(page: Page, grupo: string): Promise<string[]> {
  await page.goto("/");
  // passar o mouse abre o grupo (clicar alterna: o foco ja abriu, o clique fecharia)
  await page.getByRole("navigation", { name: "Principal" }).first().getByRole("button", { name: grupo }).hover();
  const menu = page.locator('[id^="mega-menu-"]');
  await expect(menu).toBeVisible();
  return (await menu.locator("li a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).map(endereco);
}

test("as setas mudam a ordem no painel e no menu do site, e a ordem fica salva", async ({ page }) => {
  await entrar(page, "Páginas do site");
  await expect(page.getByRole("heading", { name: "Menu · Tratamentos" })).toBeVisible();
  const antes = await titulosNoPainel(page, "Tratamentos");
  expect(antes.length).toBeGreaterThan(2);
  const [primeira, segunda] = antes;

  // a primeira nao sobe
  const subirPrimeira = page.getByRole("button", { name: `Subir “${primeira}” no menu de Tratamentos` });
  await expect(subirPrimeira).toHaveAttribute("aria-disabled", "true");

  const descer = page.getByRole("button", { name: `Descer “${primeira}” no menu de Tratamentos` });
  await descer.click();
  await expect(page.getByRole("status").filter({ hasText: `agora é a 2ª de ${antes.length} em Tratamentos` })).toBeVisible();
  expect(await titulosNoPainel(page, "Tratamentos")).toEqual([segunda, primeira, ...antes.slice(2)]);
  // o foco fica na seta usada, mesmo com a linha trocando de lugar
  await expect(descer).toBeFocused();

  // continua depois de recarregar, e o menu do site mudou junto
  await page.reload();
  await page.getByRole("tab", { name: "Páginas do site" }).click();
  await expect(page.getByRole("heading", { name: "Menu · Tratamentos" })).toBeVisible();
  expect(await titulosNoPainel(page, "Tratamentos")).toEqual([segunda, primeira, ...antes.slice(2)]);
  const doPainel = await enderecosNoPainel(page, "Tratamentos");
  expect(await enderecosNoMenu(page, "Tratamentos")).toEqual(doPainel);

  // e volta como estava
  await entrar(page, "Páginas do site");
  await page.getByRole("button", { name: `Subir “${primeira}” no menu de Tratamentos` }).click();
  await expect(page.getByRole("status").filter({ hasText: `agora é a 1ª de ${antes.length}` })).toBeVisible();
  expect(await titulosNoPainel(page, "Tratamentos")).toEqual(antes);
  await expect(page.getByRole("button", { name: `Descer “${primeira}” no menu de Tratamentos` })).toBeFocused();
});

test("pedido com a lista velha e' recusado e a lista recarrega", async ({ page }) => {
  await entrar(page, "Páginas do site");
  await expect(page.getByRole("heading", { name: "Menu · Avaliação" })).toBeVisible();
  const resposta = await page.evaluate(async () => {
    const r = await fetch("/api/painel/paginas/ordem", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupo: "Avaliação", ids: ["00000000-0000-4000-8000-000000000000"] }),
    });
    return r.status;
  });
  expect(resposta).toBe(409);
  const invalido = await page.evaluate(async () => {
    const r = await fetch("/api/painel/paginas/ordem", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupo: "Blog", ids: [] }),
    });
    return r.status;
  });
  expect(invalido).toBe(400);
});

test("sem sessao, a rota de ordem recusa", async ({ request }) => {
  const r = await request.put("/api/painel/paginas/ordem", {
    data: { grupo: "Tratamentos", ids: ["00000000-0000-4000-8000-000000000000"] },
    headers: { "sec-fetch-site": "same-origin" },
  });
  expect(r.status()).toBe(401);
});

// "Ação, coração e pressão: o que muda" e acentos no corpo, salvo como ANSI
// (Windows-1252) pelo Bloco de Notas antigo: o caso que virava losango.
// As aspas curvas nao existem em Latin-1: no Windows-1252 sao 0x93 e 0x94.
const MD_ANSI = Buffer.from(
  (
    "---\r\ndescription: >\r\n  Um resumo em\r\n  duas linhas.\r\n---\r\n# Ação, coração e pressão: o que muda\r\n\r\n" +
    "Texto do corpo com acentuação: avaliação, atenção e “aspas do Word”.\r\n\r\n## Uma seção\r\n\r\nMais um parágrafo.\r\n"
  )
    .replace(/“/g, "\x93")
    .replace(/”/g, "\x94"),
  "latin1",
);

test("Importar arquivo no blog: .md vira rascunho com titulo, resumo e acentos certos", async ({ page }) => {
  await entrar(page, "Blog");
  await page.getByLabel("Importar arquivo como texto do blog").setInputFiles({ name: "texto.md", mimeType: "text/markdown", buffer: MD_ANSI });

  await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Ação, coração e pressão: o que muda");
  await expect(page.getByLabel(/^Resumo/)).toHaveValue("Um resumo em duas linhas.");
  await expect(page.getByText("Arquivo importado como rascunho.")).toBeVisible();
  // a previa abre sozinha, e mostra o texto com os acentos e as aspas
  await expect(page.getByText("avaliação, atenção e “aspas do Word”")).toBeVisible();

  await page.getByRole("button", { name: "Guardar como rascunho" }).click();
  const linha = page.locator("li", { hasText: "Ação, coração e pressão: o que muda" });
  await expect(linha).toContainText("Rascunho");

  // limpa
  await linha.getByRole("button", { name: /^Apagar texto/ }).click();
  await linha.getByRole("button", { name: /^Confirmar e apagar/ }).click();
  await expect(page.getByText("Texto apagado.")).toBeVisible();
});

test("Importar arquivo como pagina: entra no fim do grupo, sobe pelas setas e aparece no menu", async ({ page }) => {
  const titulo = "Pilates Clínico de Teste";
  const md = `---\ntitle: ${titulo}\ndescription: Uma página importada pelo teste.\n---\n\n## Como funciona\n\nUm texto de página com bem mais de quarenta caracteres para passar.\n`;
  await entrar(page, "Páginas do site");
  await page.getByLabel("Importar arquivo como página").setInputFiles({ name: "pagina.md", mimeType: "text/markdown", buffer: Buffer.from(md) });
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(titulo);
  await page.getByLabel("Onde entra no menu").selectOption("Avaliação");
  await page.getByRole("button", { name: "Publicar no site" }).click();

  await expect(page.getByRole("heading", { name: "Menu · Avaliação" })).toBeVisible();
  const lista = await titulosNoPainel(page, "Avaliação");
  expect(lista.at(-1)).toBe(titulo);

  await page.getByRole("button", { name: `Subir “${titulo}” no menu de Avaliação` }).click();
  await expect(page.getByRole("status").filter({ hasText: "O menu do site já mudou." })).toBeVisible();
  expect((await titulosNoPainel(page, "Avaliação"))[lista.length - 2]).toBe(titulo);
  const doPainel = await enderecosNoPainel(page, "Avaliação");
  expect(doPainel[lista.length - 2]).toBe("/pilates-clinico-de-teste");
  expect(await enderecosNoMenu(page, "Avaliação")).toEqual(doPainel);

  // limpa
  await entrar(page, "Páginas do site");
  const linha = page.locator("li", { hasText: titulo });
  await linha.getByRole("button", { name: /^Apagar página/ }).click();
  await linha.getByRole("button", { name: /^Confirmar e apagar/ }).click();
  await expect(page.getByText("Página apagada.")).toBeVisible();
});
