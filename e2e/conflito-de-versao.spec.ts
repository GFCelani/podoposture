import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * A trava contra gravacao por cima (lib/versao-do-texto.ts), de ponta a
 * ponta, com duas abas no mesmo texto: a primeira salva; a segunda, aberta
 * antes disso, tenta salvar e recebe o aviso com a hora, sem perder nada do
 * que escreveu. "Ver a versao salva" mostra a do banco ao lado; "Salvar a
 * minha por cima" grava a dela depois da confirmacao. Apagar pela lista com
 * a versao velha so avisa e recarrega. Tudo para post e para pagina.
 *
 * Grava no banco, entao NAO roda no pre-commit: so com PAINEL_SENHA e um
 * servidor de pe com DATABASE_URL de um Postgres descartavel (ver
 * e2e/painel-paginas.spec.ts). Apaga o que criou.
 *
 *   PW_BASE_URL=http://localhost:3218 PAINEL_SENHA="..." npx playwright test e2e/conflito-de-versao.spec.ts --workers=1
 */
const SENHA = process.env.PAINEL_SENHA;
const BASE = process.env.PW_BASE_URL;

test.describe.configure({ mode: "serial" });
test.skip(!SENHA || !BASE, "precisa de PAINEL_SENHA e PW_BASE_URL (servidor com banco)");
test.use({ viewport: { width: 1440, height: 900 } });

const origem = () => ({ Origin: new URL(BASE!).origin });

type Perfil = {
  nome: string;
  aba: "Blog" | "Páginas do site";
  api: string;
  chave: "post" | "pagina";
  editar: string;
  apagar: string;
  aviso: RegExp;
  avisoAoApagar: RegExp;
  dados: Record<string, unknown>;
};

const PERFIS: Perfil[] = [
  {
    nome: "post",
    aba: "Blog",
    api: "/api/painel/posts",
    chave: "post",
    editar: "Editar texto",
    apagar: "Apagar texto",
    aviso: /^Este texto foi alterado em outra aba ou aparelho às \d{2}:\d{2}\. O que você escreveu aqui não foi salvo\.$/,
    avisoAoApagar: /Este texto foi alterado em outra aba ou aparelho às \d{2}:\d{2} e não foi apagado\./,
    dados: { titulo: "Texto do teste de conflito", resumo: "", categoria: "", capa: "", corpo: "Corpo de antes, escrito para o teste de conflito de versao.", publicado: false },
  },
  {
    nome: "pagina",
    aba: "Páginas do site",
    api: "/api/painel/paginas",
    chave: "pagina",
    editar: "Editar página",
    apagar: "Apagar página",
    aviso: /^Esta página foi alterada em outra aba ou aparelho às \d{2}:\d{2}\. O que você escreveu aqui não foi salvo\.$/,
    avisoAoApagar: /Esta página foi alterada em outra aba ou aparelho às \d{2}:\d{2} e não foi apagada\./,
    dados: {
      titulo: "Pagina do teste de conflito",
      resumo: "",
      categoria: "",
      capa: "",
      capaAlt: "",
      capaLegenda: "",
      corpo: "Corpo de antes, escrito para o teste de conflito de versao.",
      publicado: false,
    },
  },
];

async function entrar(page: Page, aba: Perfil["aba"]) {
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

async function lerNoBanco(request: APIRequestContext, p: Perfil, id: string) {
  const r = await request.get(`${p.api}/${id}`, { headers: origem() });
  if (r.status() === 404) return null;
  expect(r.ok()).toBe(true);
  return ((await r.json()) as Record<string, { titulo: string; corpo: string; atualizadoEm: string }>)[p.chave];
}

async function abrirEditor(page: Page, p: Perfil, titulo: string) {
  await page.getByRole("button", { name: `${p.editar}: ${titulo}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: /Editar (página|texto)/ })).toBeVisible();
}

for (const p of PERFIS) {
  test(`${p.nome}: duas abas, a segunda recebe o aviso, ve a versao salva e salva a dela por cima`, async ({ page, context }) => {
    await entrar(page, p.aba);
    const criado = await page.request.post(p.api, { data: p.dados, headers: origem() });
    expect(criado.ok()).toBe(true);
    const { id } = ((await criado.json()) as Record<string, { id: string }>)[p.chave];
    const titulo = p.dados.titulo as string;

    try {
      // As duas abas abrem o mesmo texto antes de qualquer gravacao.
      await entrar(page, p.aba);
      await abrirEditor(page, p, titulo);
      const segunda = await context.newPage();
      await entrar(segunda, p.aba);
      await abrirEditor(segunda, p, titulo);

      // A primeira muda o titulo e guarda.
      await page.locator("#campo-titulo").fill(`${titulo} (primeira aba)`);
      await page.getByRole("button", { name: "Guardar como rascunho" }).click();
      await expect(page.getByRole("button", { name: `${p.editar}: ${titulo} (primeira aba)`, exact: true })).toBeVisible();

      // A segunda escreve e tenta guardar: recusado, o texto dela fica.
      const corpo = segunda.locator("#campo-corpo");
      await corpo.fill("O que a segunda aba escreveu, e que nao pode se perder no conflito.");
      await segunda.getByRole("button", { name: "Guardar como rascunho" }).click();
      const caixa = segunda.locator("[data-conflito-de-versao]");
      await expect(caixa.getByRole("alert").first()).toHaveText(p.aviso);
      await expect(corpo).toHaveValue("O que a segunda aba escreveu, e que nao pode se perder no conflito.");
      expect((await lerNoBanco(page.request, p, id))!.titulo).toBe(`${titulo} (primeira aba)`);

      // Ver a versao salva: a do banco ao lado, e o editor intacto.
      await caixa.getByRole("button", { name: "Ver a versão salva" }).click();
      const salva = segunda.locator("#versao-salva");
      await expect(salva).toBeVisible();
      await expect(salva).toContainText(`${titulo} (primeira aba)`);
      await expect(salva).toContainText("Corpo de antes, escrito para o teste de conflito de versao.");
      await expect(corpo).toHaveValue("O que a segunda aba escreveu, e que nao pode se perder no conflito.");
      // ao lado, e nao embaixo: a coluna da versao salva comeca a direita do editor
      const caixaDoEditor = await corpo.boundingBox();
      const caixaDaSalva = await salva.boundingBox();
      expect(caixaDaSalva!.x).toBeGreaterThan(caixaDoEditor!.x + caixaDoEditor!.width);
      await caixa.getByRole("button", { name: "Fechar a versão salva" }).click();
      await expect(salva).toHaveCount(0);

      // Salvar a minha por cima: o primeiro clique so pede confirmacao.
      await caixa.getByRole("button", { name: "Salvar a minha por cima" }).click();
      await expect(caixa.getByRole("alert").filter({ hasText: "Para confirmar" })).toBeVisible();
      expect((await lerNoBanco(page.request, p, id))!.corpo).toBe("Corpo de antes, escrito para o teste de conflito de versao.");
      await caixa.getByRole("button", { name: "Confirmar e salvar por cima" }).click();
      // Gravou e voltou a lista; no banco esta o que ela escreveu, com o titulo dela.
      await expect(segunda.getByRole("button", { name: `${p.editar}: ${titulo}`, exact: true })).toBeVisible();
      const final = (await lerNoBanco(page.request, p, id))!;
      expect(final.corpo).toBe("O que a segunda aba escreveu, e que nao pode se perder no conflito.");
      expect(final.titulo).toBe(titulo);
      await segunda.close();
    } finally {
      const atual = await lerNoBanco(page.request, p, id);
      if (atual) await page.request.delete(`${p.api}/${id}?versao=${encodeURIComponent(atual.atualizadoEm)}`, { headers: origem() });
    }
  });

  test(`${p.nome}: apagar pela lista com a versao velha so avisa e recarrega`, async ({ page }) => {
    await entrar(page, p.aba);
    const criado = await page.request.post(p.api, { data: p.dados, headers: origem() });
    const { id } = ((await criado.json()) as Record<string, { id: string }>)[p.chave];
    const titulo = p.dados.titulo as string;
    try {
      // A lista desta aba carrega com a versao de agora...
      await entrar(page, p.aba);
      await expect(page.getByRole("button", { name: `${p.apagar}: ${titulo}`, exact: true })).toBeVisible();
      // ...e outra aba muda o texto depois.
      const atual = (await lerNoBanco(page.request, p, id))!;
      const mudou = await page.request.put(`${p.api}/${id}`, {
        data: { ...p.dados, corpo: "Mudado em outra aba, depois que a lista desta aba carregou.", versao: atual.atualizadoEm },
        headers: origem(),
      });
      expect(mudou.ok()).toBe(true);

      const apagar = page.getByRole("button", { name: `${p.apagar}: ${titulo}`, exact: true });
      await apagar.click();
      await page.getByRole("button", { name: `Confirmar e apagar: ${titulo}`, exact: true }).click();
      await expect(page.getByText(p.avisoAoApagar)).toBeVisible();
      // nada apagado, e sem opcao de forcar: a lista recarregou e o botao e' o de sempre
      expect((await lerNoBanco(page.request, p, id))!.corpo).toBe("Mudado em outra aba, depois que a lista desta aba carregou.");
      await expect(page.getByRole("button", { name: `${p.apagar}: ${titulo}`, exact: true })).toBeVisible();
      // com a lista nova, apagar passa
      await page.getByRole("button", { name: `${p.apagar}: ${titulo}`, exact: true }).click();
      await page.getByRole("button", { name: `Confirmar e apagar: ${titulo}`, exact: true }).click();
      await expect.poll(async () => await lerNoBanco(page.request, p, id)).toBeNull();
    } finally {
      const atual = await lerNoBanco(page.request, p, id);
      if (atual) await page.request.delete(`${p.api}/${id}?versao=${encodeURIComponent(atual.atualizadoEm)}`, { headers: origem() });
    }
  });
}
