import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { DadosDaPagina } from "./paginas-tipos";

vi.mock("server-only", () => ({}));

/**
 * As paginas no Postgres: a importacao das paginas do codigo e as regras do
 * post aplicadas a pagina (endereco, publicacao, envio repetido, apagar).
 * Comportamento de banco, entao contra um Postgres de verdade.
 *
 * Pulado sem DATABASE_URL_TESTE. Apaga e recria SO paginas,
 * paginas_importadas e conteudo_site.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();

const NOVA: DadosDaPagina = {
  titulo: "Fisioterapia Pélvica",
  resumo: "Uma frase sob o título.",
  categoria: "Tratamentos",
  capa: "",
  capaAlt: "",
  capaLegenda: "",
  corpo: "## Como funciona\n\nUm texto de pagina com mais de quarenta caracteres.",
  publicado: false,
};

describe.skipIf(!URL_DE_TESTE)("paginas no Postgres", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let db: typeof import("./paginas-db");
  let banco: typeof import("./painel-db");

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_DE_TESTE!.replace("@localhost:", "@127.0.0.1:");
    banco = await import("./painel-db");
    const sql = banco.bancoDoPainel();
    await sql`DROP TABLE IF EXISTS paginas`;
    await sql`DROP TABLE IF EXISTS paginas_importadas`;
    await sql`DROP TABLE IF EXISTS conteudo_site`;
    await sql`
      CREATE TABLE conteudo_site (chave TEXT PRIMARY KEY, publicado JSONB, rascunho JSONB,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), publicado_em TIMESTAMPTZ)`;
    // A foto que a clinica publicou para palmilhas tem de sobreviver a importacao.
    await sql`
      INSERT INTO conteudo_site (chave, publicado) VALUES ('pagina-palmilhas-personalizadas', ${sql.json({
        foto: [],
        apoio: [
          {
            imagem: { src: `/img/post/${"c".repeat(64)}-1122x1402.webp`, largura: 1122, altura: 1402, alt: "Chinelos" },
            legenda: "Chinelos palmilhados.",
          },
        ],
        ancoraDoApoio: "",
      })})`;
    db = await import("./paginas-db");
    await db.listarTodasAsPaginas();
  });

  beforeEach(async () => {
    const sql = banco.bancoDoPainel();
    await sql`DELETE FROM paginas WHERE id NOT IN (SELECT p.id FROM paginas p JOIN paginas_importadas i ON i.slug = p.slug)`;
  });

  afterAll(async () => {
    await banco?.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  it("importa as 18 paginas do codigo, publicadas, uma vez so, com a foto publicada no painel", async () => {
    const todas = await db.listarTodasAsPaginas();
    expect(todas).toHaveLength(18);
    expect(todas.every((p) => p.publicado && p.formato === "html")).toBe(true);
    expect(await db.importarPaginas([])).toBe(0);

    const palmilhas = await db.buscarPaginaPublicada("palmilhas-personalizadas");
    expect(palmilhas?.capa).toBe("");
    expect(palmilhas?.corpo).toContain(`/img/post/${"c".repeat(64)}-1122x1402.webp`);
    expect(palmilhas?.corpo).toContain("<figcaption>Chinelos palmilhados.</figcaption>");
    expect(palmilhas?.categoria).toBe("Técnicas");

    const dor = await db.buscarPaginaPublicada("dor-lombar-crônica");
    expect(dor?.slug).toBe("dor-lombar-crônica");
  });

  it("pagina nova: endereco do titulo, em ASCII, no fim do grupo; o endereco anda so antes da estreia", async () => {
    const { pagina } = await db.criarPagina(NOVA);
    expect(pagina.slug).toBe("fisioterapia-pelvica");
    const doGrupo = (await db.listarTodasAsPaginas()).filter((p) => p.categoria === "Tratamentos");
    expect(doGrupo.at(-1)?.id).toBe(pagina.id);

    const renomeada = await db.atualizarPagina(pagina.id, { ...NOVA, titulo: "Fisioterapia Pélvica Feminina" });
    expect(renomeada?.pagina.slug).toBe("fisioterapia-pelvica-feminina");

    const noAr = await db.atualizarPagina(pagina.id, { ...NOVA, titulo: "Fisioterapia Pélvica Feminina", publicado: true });
    expect(noAr?.pagina.publicadoEm).not.toBeNull();
    const outroNome = await db.atualizarPagina(pagina.id, { ...NOVA, titulo: "Outro nome", publicado: true });
    expect(outroNome?.pagina.slug).toBe("fisioterapia-pelvica-feminina");
    expect(outroNome?.pagina.titulo).toBe("Outro nome");
  });

  it("endereco de pagina do site antigo e de rota propria nunca e' tomado", async () => {
    expect((await db.criarPagina({ ...NOVA, titulo: "Osteopatia" })).pagina.slug).toBe("osteopatia-2");
    expect((await db.criarPagina({ ...NOVA, titulo: "Contato" })).pagina.slug).toBe("contato-2");
    expect((await db.criarPagina({ ...NOVA, titulo: "Nosso blog" })).pagina.slug).toBe("nosso-blog-2");
    expect((await db.criarPagina({ ...NOVA, titulo: "Dor lombar crônica" })).pagina.slug).toBe("dor-lombar-cronica-2");
  });

  it("despublicar tira do site; o envio repetido de pagina nova nunca tira do ar", async () => {
    const id = crypto.randomUUID();
    const { pagina } = await db.criarPagina({ ...NOVA, publicado: true }, id);
    expect(pagina.publicado).toBe(true);
    await expect(db.criarPagina({ ...NOVA, publicado: false }, id)).rejects.toThrow(db.PaginaTiraDoArSemConfirmacao);

    const fora = await db.atualizarPagina(id, { ...NOVA, publicado: false });
    expect(fora?.estavaPublicada).toBe(true);
    expect(await db.buscarPaginaPublicada(pagina.slug)).toBeNull();
    expect(fora?.pagina.publicadoEm).not.toBeNull();
  });

  it("trocar de grupo leva para o fim do grupo novo; fora do menu fica sem grupo", async () => {
    const { pagina } = await db.criarPagina(NOVA);
    const tecnica = await db.atualizarPagina(pagina.id, { ...NOVA, categoria: "Técnicas" });
    const tecnicas = (await db.listarTodasAsPaginas()).filter((p) => p.categoria === "Técnicas");
    expect(tecnica?.pagina.ordem).toBe(Math.max(...tecnicas.map((p) => p.ordem)));
    const fora = await db.atualizarPagina(pagina.id, { ...NOVA, categoria: "" });
    expect(fora?.pagina.categoria).toBe("");
  });

  it("pagina do codigo apagada nao volta na proxima importacao", async () => {
    const quem = (await db.listarTodasAsPaginas()).find((p) => p.slug === "rpg")!;
    expect(await db.apagarPagina(quem.id)).toBe("rpg");
    const { paginasDoAcervo } = await import("./pagina-do-acervo");
    const { CONTEUDO_PADRAO } = await import("./conteudo-padrao");
    expect(await db.importarPaginas(paginasDoAcervo(CONTEUDO_PADRAO))).toBe(0);
    expect(await db.buscarPaginaPublicada("rpg")).toBeNull();
    // e o endereco dela continua reservado
    expect((await db.criarPagina({ ...NOVA, titulo: "RPG" })).pagina.slug).toBe("rpg-2");
  });
});
