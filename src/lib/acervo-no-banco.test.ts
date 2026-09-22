import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * O acervo migrado do GoDaddy sai do banco EXATAMENTE como saia do JSON.
 *
 * E a promessa da migracao: os posts passam a morar no Postgres e ficam
 * editaveis, e nenhuma pagina muda. As paginas sao funcao do que este modulo
 * devolve — a pagina do post renderiza `html`, o indice e a home renderizam a
 * lista na ordem da lista, o sitemap usa `dateISO` —, entao igualdade aqui e
 * igualdade la. O diff do HTML servido (antes x depois) confere o resto.
 *
 * Sem mock de `./posts`: o ponto e comparar com o JSON de verdade.
 *
 * Banco proprio (`podoposture_teste_acervo`), apagado e recriado a cada
 * execucao: os outros testes de banco rodam em paralelo no banco principal e
 * este aqui apaga posts.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();
const BANCO = "podoposture_teste_acervo";

function urlDoBanco(url: string, banco: string): string {
  const u = new URL(url.replace("@localhost:", "@127.0.0.1:"));
  u.pathname = `/${banco}`;
  return u.toString();
}

describe.skipIf(!URL_DE_TESTE)("acervo no banco: o visitante recebe o mesmo que recebia do JSON", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let json: typeof import("./posts");
  let site: typeof import("./posts-do-site");
  let banco: typeof import("./painel-db");

  beforeAll(async () => {
    const admin = postgres(urlDoBanco(URL_DE_TESTE!, "postgres"), { max: 1, onnotice: () => {} });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${BANCO} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${BANCO}`);
    await admin.end();

    process.env.DATABASE_URL = urlDoBanco(URL_DE_TESTE!, BANCO);
    json = await import("./posts");
    banco = await import("./painel-db");
    site = await import("./posts-do-site");
  }, 60_000);

  afterAll(async () => {
    await banco?.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  it("importa o acervo inteiro, uma vez", async () => {
    await banco.garantirAcervo();
    const sql = banco.bancoDoPainel();
    const [{ total }] = await sql<{ total: number }[]>`SELECT count(*)::int AS total FROM posts`;
    expect(total).toBe(json.BRUTOS_DO_JSON.length);

    // Rodar de novo (outra instancia, outro deploy) nao duplica nada.
    expect(await banco.importarAcervo(json.BRUTOS_DO_JSON)).toBe(0);
    const [{ depois }] = await sql<{ depois: number }[]>`SELECT count(*)::int AS depois FROM posts`;
    expect(depois).toBe(json.BRUTOS_DO_JSON.length);
  });

  it("a lista do blog sai identica, na mesma ordem — inclusive nos dias com mais de um post", async () => {
    expect(await site.todosOsPosts()).toEqual(json.TODOS_OS_POSTS);
  });

  it("os temas saem identicos", async () => {
    expect(await site.categoriasDoSite()).toEqual(json.CATEGORIES);
  });

  it("cada um dos posts sai identico, pela rota ASCII e pelo slug real", async () => {
    // `palavras` e `imagens` ficam de fora: nada no site os le (so o tipo).
    const semMeta = (p: import("./posts").PostBruto | undefined) =>
      p && {
        slug: p.slug,
        titulo: p.titulo,
        resumo: p.resumo,
        dataISO: p.dataISO,
        dataRotulo: p.dataRotulo,
        categorias: p.categorias,
        capa: p.capa,
        html: p.html,
      };
    const rotas = json.SLUGS_DE_POST_A_GERAR;
    for (const [i, bruto] of json.BRUTOS_DO_JSON.entries()) {
      const esperado = semMeta(json.buscarPost(bruto.slug));
      expect(semMeta(await site.buscarPostDoSite(rotas[i])), `rota ${rotas[i]}`).toEqual(esperado);
      expect(semMeta(await site.buscarPostDoSite(bruto.slug)), `slug ${bruto.slug}`).toEqual(esperado);
    }
  });

  it("os relacionados no fim de cada post saem identicos", async () => {
    for (const bruto of json.BRUTOS_DO_JSON) {
      expect(await site.relacionadosDoSite(bruto.slug, 3), bruto.slug).toEqual(
        json.postsRelacionados(bruto.slug, 3),
      );
    }
  });

  it("o build gera as mesmas rotas de post", async () => {
    expect([...(await site.slugsDePostAGerar())].sort()).toEqual([...json.SLUGS_DE_POST_A_GERAR].sort());
  });

  it("e o banco que responde: editar la muda o que o site mostra", async () => {
    // Sem isto, os testes de igualdade acima passariam tambem se o site
    // continuasse lendo do JSON por engano.
    const alvo = json.BRUTOS_DO_JSON[1];
    const sql = banco.bancoDoPainel();
    const [{ id }] = await sql<{ id: string }[]>`SELECT id FROM posts WHERE slug = ${alvo.slug}`;
    const atual = (await banco.buscarPorId(id))!;
    await banco.atualizarPost(id, { ...atual, titulo: "Titulo editado pelo painel" }, "html");

    const lido = await site.buscarPostDoSite(alvo.slug);
    expect(lido?.titulo).toBe("Titulo editado pelo painel");
    // Mudar so o titulo nao mexe no corpo do GoDaddy nem na data.
    expect(lido?.html).toBe(alvo.html);
    expect(lido?.dataISO).toBe(alvo.dataISO);

    await banco.atualizarPost(id, atual, "html");
  });

  it("endereco inventado continua 404", async () => {
    expect(await site.buscarPostDoSite("nao-existe-este-texto")).toBeUndefined();
  });

  it("post do acervo apagado pelo painel nao volta no proximo deploy", async () => {
    const alvo = json.BRUTOS_DO_JSON[json.BRUTOS_DO_JSON.length - 1];
    const sql = banco.bancoDoPainel();
    const [{ id }] = await sql<{ id: string }[]>`SELECT id FROM posts WHERE slug = ${alvo.slug}`;
    expect(await banco.apagarPost(id)).toBe(true);

    expect(await banco.importarAcervo(json.BRUTOS_DO_JSON)).toBe(0);
    const [linha] = await sql`SELECT id FROM posts WHERE slug = ${alvo.slug}`;
    expect(linha).toBeUndefined();
  });

  it("post novo no JSON (a sincronizacao do GoDaddy) entra sozinho, e o resto nao muda", async () => {
    const novo: import("./posts").PostBruto = {
      ...json.BRUTOS_DO_JSON[0],
      slug: "post-novo-vindo-do-godaddy",
      titulo: "Post novo vindo do GoDaddy",
      dataISO: "2026-09-30",
      dataRotulo: "30 de setembro de 2026",
      categorias: ["Tema novo do GoDaddy"],
    };
    expect(await banco.importarAcervo([novo, ...json.BRUTOS_DO_JSON])).toBe(1);

    const sql = banco.bancoDoPainel();
    const [linha] = await sql<{ formato: string; categoria: string; data_original: string }[]>`
      SELECT formato, categoria, data_original FROM posts WHERE slug = ${novo.slug}`;
    expect(linha).toEqual({ formato: "html", categoria: "Tema novo do GoDaddy", data_original: "2026-09-30" });
    const [tema] = await sql`SELECT nome FROM temas WHERE nome = 'Tema novo do GoDaddy'`;
    expect(tema).toBeDefined();
  });
});
