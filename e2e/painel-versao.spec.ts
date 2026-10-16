import { expect, test, type Page } from "@playwright/test";

/**
 * A versao do painel (next.config.ts): a aba aberta desde antes de um deploy
 * tem o painel velho na memoria. No login, o servidor responde com a versao
 * dele; o painel que tem outra recarrega e abre o novo, ja dentro (o cookie
 * do login ja valeu). Sair recarrega a pagina na tela de senha.
 *
 * O painel "de antes do deploy" e' o mesmo codigo com a versao trocada no
 * caminho do servidor ao navegador: cada arquivo .js que traz a versao do
 * build chega com outra no lugar.
 *
 * Precisa de um servidor de pe com a senha configurada (ver
 * e2e/painel-paginas.spec.ts):
 *
 *   PW_BASE_URL=http://localhost:3218 PAINEL_SENHA="..." npx playwright test e2e/painel-versao.spec.ts --workers=1
 */
const SENHA = process.env.PAINEL_SENHA;
const BASE = process.env.PW_BASE_URL;

test.describe.configure({ mode: "serial" });
test.skip(!SENHA || !BASE, "precisa de PAINEL_SENHA e PW_BASE_URL (servidor com a senha configurada)");
test.use({ viewport: { width: 1440, height: 900 } });

const ANTIGA = "versao-de-antes-do-deploy";

const campoDaSenha = (page: Page) => page.getByRole("textbox", { name: "Senha" });

/** Quantas vezes a pagina terminou de carregar desde agora. */
function contarCargas(page: Page): () => number {
  let cargas = 0;
  page.on("load", () => cargas++);
  return () => cargas;
}

async function digitarSenha(page: Page) {
  await campoDaSenha(page).fill(SENHA!);
  await page.getByRole("button", { name: "Entrar" }).click();
}

let versaoDoServidor = "";

test("o servidor responde ao login com a versao deste build", async ({ playwright }) => {
  // Contexto proprio: o cookie deste login nao vaza para os testes de baixo.
  const fora = await playwright.request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: new URL(BASE!).origin } });
  const resposta = await fora.post("/api/painel/entrar", { data: { senha: SENHA } });
  expect(resposta.ok()).toBe(true);
  versaoDoServidor = ((await resposta.json()) as { versao?: string }).versao ?? "";
  await fora.dispose();
  expect(versaoDoServidor).not.toBe("");
});

test("painel de antes de um deploy: o login recarrega a pagina e abre o painel novo, ja dentro", async ({ page }) => {
  expect(versaoDoServidor).not.toBe("");
  let antigo = true;
  let trocados = 0;
  // Com rota ligada o navegador nao usa cache: a recarga busca tudo de novo.
  await page.route("**/_next/static/**/*.js", async (rota) => {
    const resposta = await rota.fetch();
    const corpo = await resposta.text();
    if (!antigo || !corpo.includes(versaoDoServidor)) return rota.fulfill({ response: resposta, body: corpo });
    trocados++;
    return rota.fulfill({ response: resposta, body: corpo.replaceAll(versaoDoServidor, ANTIGA) });
  });

  await page.goto("/publicar");
  await expect(campoDaSenha(page)).toBeVisible();
  expect(trocados, "nenhum arquivo do painel trazia a versao do build").toBeGreaterThan(0);
  antigo = false;

  const cargas = contarCargas(page);
  const login = page.waitForResponse((r) => r.url().endsWith("/api/painel/entrar"));
  await digitarSenha(page);
  const resposta = await login;
  expect((JSON.parse(resposta.request().postData() ?? "{}") as { versao?: string }).versao).toBe(ANTIGA);
  expect(resposta.ok()).toBe(true);
  // O corpo da resposta (a versao do servidor) some com a recarga, que vem
  // logo em seguida: a versao dele e' a do primeiro teste.

  // Recarregou, e a pagina nova abriu dentro do painel, sem pedir a senha de novo.
  await expect.poll(cargas).toBeGreaterThan(0);
  await expect(page.getByRole("tab", { name: "Blog" })).toBeVisible();
  await expect(campoDaSenha(page)).toHaveCount(0);
  await expect(page.locator("[data-versao-do-painel]")).toHaveAttribute("data-versao-do-painel", versaoDoServidor);
});

test("painel da versao de agora: o login entra sem recarregar", async ({ page }) => {
  await page.goto("/publicar");
  // A sessao do teste anterior nao existe aqui (cada teste tem o seu contexto).
  await expect(campoDaSenha(page)).toBeVisible();
  const cargas = contarCargas(page);
  await digitarSenha(page);
  await expect(page.getByRole("tab", { name: "Blog" })).toBeVisible();
  await expect(page.locator("[data-versao-do-painel]")).toHaveAttribute("data-versao-do-painel", versaoDoServidor);
  expect(cargas()).toBe(0);
});

test("sair do painel recarrega a pagina na tela de senha, e a sessao acabou", async ({ page }) => {
  await page.goto("/publicar");
  await digitarSenha(page);
  await expect(page.getByRole("tab", { name: "Blog" })).toBeVisible();

  const cargas = contarCargas(page);
  await page.getByRole("button", { name: "Sair do painel" }).click();
  await expect(campoDaSenha(page)).toBeVisible();
  await expect.poll(cargas).toBeGreaterThan(0);
  expect(new URL(page.url()).pathname).toBe("/publicar");

  // A sessao acabou no servidor: recarregar continua na senha.
  await page.reload();
  await expect(campoDaSenha(page)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Blog" })).toHaveCount(0);
});
