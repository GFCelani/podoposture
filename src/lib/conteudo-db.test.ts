import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";

// `server-only` lanca fora do empacotador do Next, e `posts.ts` usa o apelido
// `@/`, que o vitest deste projeto nao resolve (mesmo motivo de numeros-db.test).
vi.mock("server-only", () => ({}));
vi.mock("./posts", () => ({ BRUTOS_DO_JSON: [], MAPA_ASCII_POSTS: new Map() }));

/**
 * A conferencia de versao e comportamento do banco (a clausula WHERE do
 * ON CONFLICT), entao so se prova contra um Postgres de verdade.
 *
 * Pulado sem DATABASE_URL_TESTE. Apaga e recria SO a tabela conteudo_site.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();

describe.skipIf(!URL_DE_TESTE)("versao da secao da pagina inicial no Postgres", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let db: typeof import("./conteudo-db");
  let banco: typeof import("./painel-db");
  const contato = CONTEUDO_PADRAO.contato;

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_DE_TESTE!.replace("@localhost:", "@127.0.0.1:");
    banco = await import("./painel-db");
    db = await import("./conteudo-db");
    await banco.bancoDoPainel()`DROP TABLE IF EXISTS conteudo_site`;
    await db.listarSecoesSalvas();
  });

  beforeEach(async () => {
    await banco.bancoDoPainel()`TRUNCATE conteudo_site`;
  });

  afterAll(async () => {
    await banco?.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  it("publicar com a versao que o editor carregou grava; a aba com a versao velha nao apaga essa publicacao", async () => {
    const rascunho = await db.gravarRascunho("contato", contato, null);
    expect(rascunho?.atualizadoEm).toEqual(expect.any(String));

    // aba A publica o telefone novo a partir da versao que carregou
    const novo = { ...contato, telefoneFixo: "552133334444" };
    const publicadoA = await db.publicarSecao("contato", novo, rascunho!.atualizadoEm);
    expect(publicadoA).not.toBeNull();

    // aba B ainda tem a versao do rascunho e tenta publicar o telefone antigo
    expect(await db.publicarSecao("contato", contato, rascunho!.atualizadoEm)).toBeNull();
    expect(await db.gravarRascunho("contato", contato, rascunho!.atualizadoEm)).toBeNull();

    const atual = await db.lerSecao("contato");
    expect((atual?.publicado as { telefoneFixo: string }).telefoneFixo).toBe("552133334444");
    expect(atual?.atualizadoEm).toBe(publicadoA!.atualizadoEm);
  });

  it("secao nunca salva: versao null grava, e outra aba que tambem nao conhecia versao recebe conflito", async () => {
    expect(await db.gravarRascunho("galeria", CONTEUDO_PADRAO.galeria, null)).not.toBeNull();
    expect(await db.publicarSecao("galeria", CONTEUDO_PADRAO.galeria, null)).toBeNull();
  });

  it("sem versao a escrita continua valendo, e a previa le a versao de cada linha", async () => {
    const linha = await db.publicarSecao("hero", CONTEUDO_PADRAO.hero);
    expect(linha).not.toBeNull();
    const { versoes, publicados } = await db.lerPublicadosERascunhos();
    expect(versoes.hero).toBe(linha!.atualizadoEm);
    expect(publicados.hero).toEqual(CONTEUDO_PADRAO.hero);
  });
});
