import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Acervo vazio: aqui interessa o tema, nao a importacao (essa tem o proprio teste).
vi.mock("./posts", () => ({ BRUTOS_DO_JSON: [], MAPA_ASCII_POSTS: new Map() }));

/**
 * O CRUD de temas e a trava que impede apagar tema com texto.
 *
 * A trava tem duas camadas e as duas sao testadas: a funcao recusa apagar sem
 * destino, e o proprio banco recusa (chave estrangeira) mesmo que alguem passe
 * por cima da funcao.
 *
 * Banco proprio, recriado a cada execucao (os outros testes de banco rodam em
 * paralelo no principal).
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();
const BANCO = "podoposture_teste_temas";

function urlDoBanco(url: string, banco: string): string {
  const u = new URL(url.replace("@localhost:", "@127.0.0.1:"));
  u.pathname = `/${banco}`;
  return u.toString();
}

describe.skipIf(!URL_DE_TESTE)("temas no Postgres", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let temas: typeof import("./temas-db");
  let banco: typeof import("./painel-db");

  beforeAll(async () => {
    const admin = postgres(urlDoBanco(URL_DE_TESTE!, "postgres"), { max: 1, onnotice: () => {} });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${BANCO} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${BANCO}`);
    await admin.end();
    process.env.DATABASE_URL = urlDoBanco(URL_DE_TESTE!, BANCO);
    banco = await import("./painel-db");
    temas = await import("./temas-db");
    await banco.garantirTabelas();
  }, 60_000);

  beforeEach(async () => {
    const sql = banco.bancoDoPainel();
    await sql`DELETE FROM posts`;
    await sql`DELETE FROM temas`;
  });

  afterAll(async () => {
    await banco?.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  const post = (titulo: string, categoria: string) =>
    banco.criarPost({ titulo, resumo: "", categoria, capa: "", corpo: "Um texto qualquer com mais de quarenta letras.", publicado: true });

  it("cria, lista com a contagem de textos e ordena em portugues", async () => {
    await temas.criarTema("Zumbido");
    await temas.criarTema("  Ácido   úrico ");
    const dor = await temas.criarTema("Dor crônica");
    await post("Um texto sobre dor", dor.nome);

    const lista = await temas.listarTemas();
    expect(lista.map((t) => [t.nome, t.textos])).toEqual([
      ["Ácido úrico", 0],
      ["Dor crônica", 1],
      ["Zumbido", 0],
    ]);
  });

  it("recusa nome repetido, inclusive so com a caixa diferente", async () => {
    await temas.criarTema("Zumbido");
    await expect(temas.criarTema("zumbido")).rejects.toBeInstanceOf(temas.TemaRepetido);
  });

  it("renomear leva todos os textos junto", async () => {
    const t = await temas.criarTema("Zumbido");
    const { post: p } = await post("Sobre zumbido", "Zumbido");

    await temas.renomearTema(t.id, "Zumbido e Tinnitus");

    expect((await banco.buscarPorId(p.id))?.categoria).toBe("Zumbido e Tinnitus");
  });

  it("apaga direto o tema sem nenhum texto", async () => {
    const t = await temas.criarTema("Vazio");
    expect(await temas.apagarTema(t.id)).toEqual({ tipo: "apagado", movidos: 0, slugs: [] });
    expect(await temas.listarTemas()).toEqual([]);
  });

  it("RECUSA apagar tema com texto sem dizer para onde os textos vao — e nada muda", async () => {
    const t = await temas.criarTema("Zumbido");
    const { post: p } = await post("Sobre zumbido", "Zumbido");

    expect(await temas.apagarTema(t.id)).toEqual({ tipo: "tem-textos", textos: 1 });
    expect((await temas.listarTemas()).map((x) => x.nome)).toEqual(["Zumbido"]);
    expect((await banco.buscarPorId(p.id))?.categoria).toBe("Zumbido");
  });

  it("apagar movendo os textos para outro tema", async () => {
    const velho = await temas.criarTema("Tratamento para o Zumbido");
    const novo = await temas.criarTema("Zumbido e Tinnitus");
    const { post: p } = await post("Sobre zumbido", velho.nome);

    const r = await temas.apagarTema(velho.id, { para: novo.id });

    expect(r).toEqual({ tipo: "apagado", movidos: 1, slugs: [p.slug] });
    expect((await banco.buscarPorId(p.id))?.categoria).toBe("Zumbido e Tinnitus");
  });

  it("apagar deixando os textos sem tema", async () => {
    const t = await temas.criarTema("Zumbido");
    const { post: p } = await post("Sobre zumbido", "Zumbido");

    expect(await temas.apagarTema(t.id, { para: null })).toMatchObject({ tipo: "apagado", movidos: 1 });
    expect((await banco.buscarPorId(p.id))?.categoria).toBe("");
  });

  it("recusa mover os textos para o proprio tema ou para tema que nao existe", async () => {
    const t = await temas.criarTema("Zumbido");
    await post("Sobre zumbido", "Zumbido");

    await expect(temas.apagarTema(t.id, { para: t.id })).rejects.toBeInstanceOf(temas.DestinoInvalido);
    await expect(
      temas.apagarTema(t.id, { para: "00000000-0000-4000-8000-000000000000" }),
    ).rejects.toBeInstanceOf(temas.DestinoInvalido);
    expect((await temas.listarTemas()).map((x) => x.nome)).toEqual(["Zumbido"]);
  });

  it("o PROPRIO BANCO recusa apagar tema com texto, mesmo por fora do painel", async () => {
    await temas.criarTema("Zumbido");
    await post("Sobre zumbido", "Zumbido");
    const sql = banco.bancoDoPainel();

    await expect(sql`DELETE FROM temas WHERE nome = 'Zumbido'`).rejects.toMatchObject({ code: "23503" });
  });

  it("post com tema que nao existe e recusado pelo banco", async () => {
    await expect(post("Sem casa", "Tema fantasma")).rejects.toBeInstanceOf(banco.TemaInexistente);
  });
});
