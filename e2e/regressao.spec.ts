import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

/**
 * Regressao visual das paginas antigas: as que existiam antes do layout
 * unico de 2026-10-12 (as de pages.json e Como e o meu atendimento) tem de
 * continuar pixel a pixel como estavam no commit 11b492c, o ultimo antes
 * dele. Elas usam o renderizador antigo (components/pagina-interna.tsx,
 * lib/paginas-antigas.ts); o layout unico vale so para pagina nova.
 *
 * As referencias (e2e/regressao.spec.ts-snapshots/) foram capturadas do build
 * de producao daquele commit, com este mesmo arquivo:
 *
 *   git worktree add ../ref 11b492c && (cd ../ref && npm ci && npm run build && npx next start -p 3301)
 *   PW_BASE_URL=http://localhost:3301 npx playwright test e2e/regressao.spec.ts --update-snapshots
 *
 * Unica pagina com diferenca de proposito: Palmilhas Personalizadas, em que
 * as duas fotos da cliente ficam na coluna da direita sem deixar vazio (a
 * referencia dela foi regravada depois dessa correcao, e conferida a olho).
 *
 * Em 2026-10-13 o TOPO de todas mudou de proposito e as referencias foram
 * regravadas: o bloco de texto passou a ficar centrado na altura da foto
 * (antes, rente a base dela; muda em 1440, nao em 390), e o subtitulo de
 * seis paginas deixou de sair cortado em 155 caracteres (Acupuntura,
 * Acupuntura Clinica, Baropodometria, Dor Lombar Cronica, Neuromodulacao,
 * Palmilhas; muda tambem em 390). Abaixo do topo, conferido elemento a
 * elemento (posicao relativa ao fim do topo, tamanho e texto), nada mudou.
 *
 * Ainda em 2026-10-13, as mesmas seis foram regravadas de novo (1440 e 390):
 * o primeiro paragrafo do corpo, identico ao subtitulo do topo, deixou de
 * aparecer duas vezes (lib/subtitulo-inteiro.ts, semParagrafoRepetido). O
 * topo ficou identico; a diferenca comeca no corpo.
 *
 * E Dor Lombar Cronica e Neuromodulacao uma terceira vez (1440 e 390): o
 * paragrafo que sobe para o topo leva a formatacao que tinha (o link e o
 * negrito em "Claudia Meirelles", a quebra de linha; o negrito da frase de
 * Neuromodulacao). So a linha do subtitulo muda.
 *
 * Falha se qualquer pixel divergir (a tolerancia por pixel e' a padrao do
 * Playwright, para o antisserrilhado da fonte).
 */
const FORA = new Set(["home", "nosso-blog"]);
const PAGINAS = [
  ...(JSON.parse(readFileSync(join(__dirname, "..", "src", "content", "pages.json"), "utf8")) as { slug: string }[])
    .map((p) => p.slug.normalize("NFC"))
    .filter((s) => !FORA.has(s)),
  "como-e-o-meu-atendimento",
];

const LARGURAS: [number, number][] = [
  [1440, 900],
  [390, 844],
];

/** Nome de arquivo ASCII: acento em nome de arquivo muda de forma entre Windows, git e Linux. */
const nomeDe = (slug: string) =>
  slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-");

/**
 * Pagina inteira carregada: toda imagem baixada e decodificada (as de baixo
 * da dobra sao lazy, e o print de pagina inteira nao rola a janela) e as
 * fontes prontas. Rola ate o fim e volta, para todo observador ja ter
 * disparado; com movimento reduzido, nada depende dele.
 */
async function prepararPagina(page: Page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img")) img.loading = "eager";
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 200));
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.querySelectorAll("img")].map((img) =>
        img.complete ? img.decode().catch(() => {}) : new Promise((r) => img.addEventListener("load", r, { once: true })).then(() => img.decode().catch(() => {})),
      ),
    );
    await document.fonts.ready;
  });
  await page.waitForLoadState("networkidle");
}

for (const slug of PAGINAS) {
  for (const [largura, altura] of LARGURAS) {
    test(`pagina antiga igual a de antes: /${slug} em ${largura}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto(`/${encodeURI(slug)}`, { waitUntil: "load" });
      await prepararPagina(page);
      await expect(page).toHaveScreenshot(`${nomeDe(slug)}-${largura}.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixels: 0,
        timeout: 30_000,
      });
    });
  }
}
