import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";

/**
 * Toda foto que o site mostra aparece no painel para ser trocada.
 *
 * Ate 2026-10-16 o editor so mostrava como foto a do lado do titulo; as
 * fotos escritas no texto iam ao site mas no painel eram uma linha de
 * Markdown. Em Como e o meu atendimento, quatro das cinco.
 *
 * Aqui, para cada pagina e post no ar: as fotos que a pagina renderizada
 * mostra (medidas no navegador) sao as mesmas, na mesma ordem, que o editor
 * do painel lista como foto. Uma foto fixa no codigo, ou num formato que o
 * painel nao le, aparece de um lado e nao do outro, e o teste falha. Fica de
 * fora so o que nao e' foto de conteudo: o cabecalho do site (logo), o
 * rodape, desenho em SVG (a figura do hero, icones, a capa do mapa).
 * Imagem de cartao que leva a outra pagina (Leia tambem, o blog) tem de ser
 * a capa daquela pagina, que se troca la.
 *
 * A home e' conferida contra a aba "Pagina inicial": cada foto dela e' um
 * campo de foto de uma secao.
 *
 * E o caminho inteiro em Como e o meu atendimento: trocar a segunda foto
 * pelo painel, publicar, ver a foto nova no site, e voltar a original.
 *
 * Grava no banco, entao NAO roda no pre-commit: so com PAINEL_SENHA e um
 * servidor de pe com DATABASE_URL de um Postgres descartavel (ver
 * e2e/painel-paginas.spec.ts):
 *
 *   PW_BASE_URL=http://localhost:3218 PAINEL_SENHA="..." npx playwright test e2e/fotos-no-painel.spec.ts --workers=1
 */
const SENHA = process.env.PAINEL_SENHA;
const BASE = process.env.PW_BASE_URL;

test.describe.configure({ mode: "serial" });
test.skip(!SENHA || !BASE, "precisa de PAINEL_SENHA e PW_BASE_URL (servidor com banco)");
test.use({ viewport: { width: 1440, height: 900 } });

/** A API do painel recusa pedido sem a origem do proprio site. */
const origem = () => ({ Origin: new URL(BASE!).origin });

type Aba = "Blog" | "Páginas do site" | "Página inicial";

async function entrar(page: Page, aba: Aba) {
  await page.goto("/publicar");
  const senha = page.getByRole("textbox", { name: "Senha" });
  const tab = page.getByRole("tab", { name: aba });
  await expect(senha.or(tab)).toBeVisible();
  if (await senha.isVisible()) {
    await senha.fill(SENHA!);
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await tab.click();
}

/** O caminho legivel; "%" solto (o post "chinelos-100%-...") fica como esta. */
const caminho = (href: string) =>
  new URL(href, BASE).pathname.replace(/(%[0-9a-f]{2})+/gi, (s) => decodeURIComponent(s)).normalize("NFC");

/** O endereco do arquivo, sem o otimizador do Next na frente. */
function original(src: string): string {
  const u = new URL(src, BASE);
  return (u.pathname === "/_next/image" ? (u.searchParams.get("url") ?? "") : u.pathname).normalize("NFC");
}

type FotoNoSite = { src: string; link: string | null };

/** As fotos de conteudo que a pagina mostra, de cima para baixo. */
async function fotosNoSite(page: Page, endereco: string): Promise<FotoNoSite[]> {
  await page.goto(endereco);
  const brutas = await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img")) img.loading = "eager";
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 200));
    window.scrollTo(0, 0);
    return [...document.querySelectorAll("img")]
      .filter((img) => !img.closest("footer") && !img.closest("header.cab"))
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(img).visibility !== "hidden";
      })
      .map((img) => ({ src: img.getAttribute("src") ?? "", link: img.closest("a[href]")?.getAttribute("href") ?? null }));
  });
  return brutas
    .map((f) => ({ src: original(f.src), link: f.link ? caminho(f.link) : null }))
    .filter((f) => !/\.svg$/i.test(f.src) && !f.src.startsWith("data:"));
}

/** Os itens no ar de uma aba do painel: o endereco no site e o rotulo do botao de editar. */
async function itensNoAr(page: Page, editar: string): Promise<{ endereco: string; editar: string }[]> {
  // O botao de editar diz de que aba e' a lista: ate ele aparecer, a lista na
  // tela ainda pode ser a da aba de antes.
  await expect(page.getByRole("button", { name: new RegExp(`^${editar}: `) }).first()).toBeVisible();
  return page.locator("li").evaluateAll(
    (lis, prefixo) =>
      lis.flatMap((li) => {
        const link = [...li.querySelectorAll("a")].find((a) => a.textContent?.trim() === "ver no site");
        const botao = [...li.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? "").startsWith(`${prefixo}: `));
        return link && botao ? [{ endereco: link.getAttribute("href") ?? "", editar: botao.getAttribute("aria-label") ?? "" }] : [];
      }),
    editar,
  );
}

/** As fotos que o editor aberto lista como foto, na ordem. */
async function fotosNoEditor(page: Page): Promise<string[]> {
  await expect(page.getByRole("heading", { name: /Editar (página|texto)/ })).toBeVisible();
  return page.locator("[data-foto-do-painel] img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src") ?? ""));
}

async function conferirAba(page: Page, aba: "Blog" | "Páginas do site") {
  await entrar(page, aba);
  const itens = await itensNoAr(page, aba === "Blog" ? "Editar texto" : "Editar página");
  expect(itens.length).toBeGreaterThan(0);
  const capas = new Map<string, string>();
  const diferentes: string[] = [];
  for (const item of itens) {
    await page.getByRole("button", { name: item.editar, exact: true }).click();
    const noPainel = (await fotosNoEditor(page)).map(original);
    capas.set(caminho(item.endereco), noPainel[0] ?? "");
    await page.getByRole("button", { name: /Voltar para a lista/ }).first().click();
    await expect(page.getByRole("button", { name: item.editar, exact: true })).toBeVisible();

    const contexto = await page.context().newPage();
    const doSite = await fotosNoSite(contexto, item.endereco);
    await contexto.close();
    const proprias = doSite.filter((f) => !f.link || f.link === caminho(item.endereco)).map((f) => f.src);
    if (JSON.stringify(proprias) !== JSON.stringify(noPainel)) {
      diferentes.push(`${caminho(item.endereco)}\n  site:   ${proprias.join(" | ")}\n  painel: ${noPainel.join(" | ")}`);
    }
  }
  expect(diferentes, "paginas com foto no site que o painel nao lista (ou o contrario)").toEqual([]);
  return capas;
}

let capasDosPosts = new Map<string, string>();
let capasDasPaginas = new Map<string, string>();

test("paginas: cada foto do site e' uma foto no editor do painel, na mesma ordem", async ({ page }) => {
  test.setTimeout(300_000);
  capasDasPaginas = await conferirAba(page, "Páginas do site");
});

test("posts: cada foto do site e' uma foto no editor do painel, na mesma ordem", async ({ page }) => {
  test.setTimeout(900_000);
  capasDosPosts = await conferirAba(page, "Blog");
});

test("cartoes que levam a outra pagina mostram a capa dela, e a home so tem foto da aba Pagina inicial", async ({ page }) => {
  test.setTimeout(300_000);
  const capas = new Map([...capasDasPaginas, ...capasDosPosts]);
  expect(capas.size).toBeGreaterThan(0);

  await entrar(page, "Página inicial");
  const resposta = await page.request.get("/api/painel/inicio", { headers: origem() });
  expect(resposta.ok()).toBe(true);
  const { secoes } = (await resposta.json()) as { secoes: Record<string, { padrao: unknown; publicado: unknown }> };
  const daHome = Object.entries(secoes)
    .filter(([chave]) => chave !== "compartilhamento" && !chave.startsWith("pagina-"))
    .flatMap(([, s]) => [...JSON.stringify(s.publicado ?? s.padrao).matchAll(/"src":"([^"]+)"/g)].map((m) => m[1]));

  const erros: string[] = [];
  for (const endereco of ["/", "/nosso-blog", ...capas.keys()]) {
    for (const f of await fotosNoSite(page, endereco)) {
      if (f.link && f.link !== endereco) {
        if (capas.get(f.link) !== f.src) erros.push(`${endereco}: cartao para ${f.link} com ${f.src}, capa la e' ${capas.get(f.link)}`);
      } else if (endereco === "/" && !daHome.includes(f.src)) {
        erros.push(`/: ${f.src} nao e' foto de nenhuma secao da aba Pagina inicial`);
      } else if (endereco === "/nosso-blog") {
        erros.push(`/nosso-blog: ${f.src} fora de cartao`);
      }
    }
  }
  expect(erros).toEqual([]);
});

test("Como e o meu atendimento: trocar a segunda foto pelo painel, publicar, ver no site, voltar a original", async ({ page }) => {
  test.setTimeout(180_000);
  const endereco = "/como-e-o-meu-atendimento";
  const antes = (await fotosNoSite(page, endereco)).map((f) => f.src);
  expect(antes.length).toBe(5);

  await entrar(page, "Páginas do site");
  const lista = (await (await page.request.get("/api/painel/paginas", { headers: origem() })).json()) as { paginas: { id: string; slug: string }[] };
  const { id } = lista.paginas.find((p) => p.slug === "como-e-o-meu-atendimento")!;
  const guardada = ((await (await page.request.get(`/api/painel/paginas/${id}`, { headers: origem() })).json()) as { pagina: Record<string, unknown> }).pagina;

  try {
    await page.getByRole("button", { name: "Editar página: Como é o meu atendimento", exact: true }).click();
    expect((await fotosNoEditor(page)).map(original)).toEqual(antes);

    const foto = await sharp({ create: { width: 900, height: 1125, channels: 3, background: { r: 196, g: 92, b: 38 } } })
      .jpeg()
      .toBuffer();
    await page.getByLabel("Trocar a foto 2").setInputFiles({ name: "teste.jpg", mimeType: "image/jpeg", buffer: foto });
    await expect(page.getByRole("status").filter({ hasText: "Foto trocada" })).toBeVisible({ timeout: 30_000 });
    const nova = original((await fotosNoEditor(page))[1]);
    expect(nova).toMatch(/^\/img\/post\/[0-9a-f]{64}-\d+x\d+\.(webp|jpe?g)$/);
    // a legenda e a descricao da foto continuam as dela
    await expect(page.getByLabel("Legenda da foto 2")).toHaveValue("A mesa do consultório, onde a consulta começa.");

    await page.getByRole("button", { name: "Publicar no site" }).click();
    await expect(page.getByRole("link", { name: "ver no site" }).first()).toBeVisible({ timeout: 30_000 });

    const depois = (await fotosNoSite(page, endereco)).map((f) => f.src);
    expect(depois).toEqual([antes[0], nova, ...antes.slice(2)]);
    const servida = await page.request.get(nova);
    expect(servida.ok()).toBe(true);
    expect(servida.headers()["content-type"]).toMatch(/^image\//);
  } finally {
    // De volta ao original: o mesmo corpo, entao o servidor guarda de novo o
    // HTML de antes. Com a versao de agora (a da publicacao do teste), que e'
    // o que a trava de versao pede (lib/versao-do-texto.ts).
    const agora = ((await (await page.request.get(`/api/painel/paginas/${id}`, { headers: origem() })).json()) as {
      pagina: { atualizadoEm: string };
    }).pagina;
    const volta = await page.request.put(`/api/painel/paginas/${id}`, {
      data: { ...guardada, versao: agora.atualizadoEm },
      headers: origem(),
    });
    expect(volta.ok()).toBe(true);
  }
  expect((await fotosNoSite(page, endereco)).map((f) => f.src)).toEqual(antes);
  const relida = ((await (await page.request.get(`/api/painel/paginas/${id}`, { headers: origem() })).json()) as { pagina: Record<string, unknown> }).pagina;
  expect(relida.corpo).toBe(guardada.corpo);
  expect(relida.formato).toBe(guardada.formato);
});
