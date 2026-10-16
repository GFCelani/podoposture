import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";

vi.mock("server-only", () => ({}));
vi.mock("./posts", () => ({ BRUTOS_DO_JSON: [], MAPA_ASCII_POSTS: new Map(), RESUMOS_COMPLETADOS: [] }));

/**
 * A trava de versao com gravacoes de verdade ao mesmo tempo.
 *
 * Na Vercel cada instancia tem UMA conexao (painel-db.ts, max 1): a
 * concorrencia real e' entre instancias. Aqui cada "instancia" e' uma copia
 * nova dos modulos, com a conexao dela. E para a colisao nao depender de
 * sorte, uma terceira conexao prende a linha (FOR UPDATE) ate todas as
 * gravacoes estarem paradas esperando por ela; so entao solta.
 *
 *   - secoes da pagina inicial (conteudo-db.ts): N gravacoes com a mesma
 *     versao esperada, so UMA passa, as outras recebem conflito (null);
 *   - posts e paginas, com a mesma trava (versao-do-texto.ts): salvar,
 *     publicar, tirar do site e apagar com a mesma versao esperada, so UMA
 *     passa, as outras recebem `VersaoDesatualizada`; o envio repetido de
 *     um texto novo so passa enquanto ninguem mexeu nele;
 *   - sem versao esperada (uso interno), as gravacoes passam todas, e cada
 *     uma sai exatamente 1 ms depois da anterior, mesmo com o relogio
 *     "parado".
 *
 * Banco proprio (`podoposture_teste_versao`), apagado e recriado a cada
 * execucao.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();
const BANCO = "podoposture_teste_versao";
const INSTANCIAS = 4;

function urlDoBanco(url: string, banco: string): string {
  const u = new URL(url.replace("@localhost:", "@127.0.0.1:"));
  u.pathname = `/${banco}`;
  return u.toString();
}

type Instancia = {
  conteudo: typeof import("./conteudo-db");
  posts: typeof import("./painel-db");
  paginas: typeof import("./paginas-db");
};

describe.skipIf(!URL_DE_TESTE)("trava de versao com gravacoes simultaneas", () => {
  const urlOriginal = process.env.DATABASE_URL;
  const instancias: Instancia[] = [];
  let direto: postgres.Sql;

  beforeAll(async () => {
    const admin = postgres(urlDoBanco(URL_DE_TESTE!, "postgres"), { max: 1, onnotice: () => {} });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${BANCO} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${BANCO}`);
    await admin.end();
    process.env.DATABASE_URL = urlDoBanco(URL_DE_TESTE!, BANCO);
    direto = postgres(process.env.DATABASE_URL, { max: 2, onnotice: () => {} });
    for (let i = 0; i < INSTANCIAS; i++) {
      vi.resetModules();
      instancias.push({
        conteudo: await import("./conteudo-db"),
        posts: await import("./painel-db"),
        paginas: await import("./paginas-db"),
      });
    }
    // As tabelas, uma vez, antes de qualquer corrida.
    await instancias[0].conteudo.listarSecoesSalvas();
    await instancias[0].posts.garantirBanco();
    await instancias[0].paginas.garantirPaginas();
  }, 120_000);

  afterAll(async () => {
    for (const i of instancias) await i.posts.bancoDoPainel().end();
    await direto?.end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  /**
   * Prende a linha, dispara as gravacoes, espera todas estarem paradas na
   * trava e solta: elas competem de verdade pela mesma linha.
   */
  async function aoMesmoTempo<T>(tabela: string, onde: postgres.Fragment, gravacoes: (() => Promise<T>)[]): Promise<T[]> {
    let presa!: () => void;
    let soltar!: () => void;
    const linhaPresa = new Promise<void>((r) => (presa = r));
    const solta = new Promise<void>((r) => (soltar = r));
    const trava = direto.begin(async (tx) => {
      await tx`SELECT 1 FROM ${tx(tabela)} WHERE ${onde} FOR UPDATE`;
      presa();
      await solta;
    });
    await linhaPresa;
    const resultados = Promise.all(gravacoes.map((g) => g()));
    // Todas as gravacoes chegaram a linha e esperam por ela.
    for (let espera = 0; ; espera++) {
      const [{ n }] = await direto<{ n: number }[]>`
        SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = ${BANCO} AND wait_event_type = 'Lock'`;
      if (n >= gravacoes.length) break;
      if (espera > 400) throw new Error(`so ${n} de ${gravacoes.length} gravacoes chegaram a trava`);
      await new Promise((r) => setTimeout(r, 25));
    }
    soltar();
    await trava;
    return resultados;
  }

  const secao = (chave: string) => direto`chave = ${chave}`;

  /**
   * "ok" quando gravou; "conflito" quando a trava recusou (pelo nome: cada
   * instancia tem a sua classe); "nada" quando o texto ja nao existia (outra
   * aba apagou antes: apagar devolve false/null, salvar devolve null).
   */
  const resultado = (p: Promise<unknown>) =>
    p.then(
      (v) => (v === false || v === null ? ("nada" as const) : ("ok" as const)),
      (erro: Error) => (erro?.name === "VersaoDesatualizada" ? ("conflito" as const) : Promise.reject(erro)),
    );

  /**
   * A versao da linha uma hora a frente do relogio: e' como fica quando as
   * gravacoes caem no mesmo milissegundo, sem depender de elas cairem. Com a
   * regra, cada gravacao sai exatamente 1 ms depois da anterior.
   */
  async function relogioParado(tabela: "posts" | "paginas", id: string): Promise<number> {
    const [{ v }] = await direto<{ v: Date }[]>`
      UPDATE ${direto(tabela)} SET atualizado_em = date_trunc('milliseconds', NOW() + INTERVAL '1 hour')
      WHERE id = ${id} RETURNING atualizado_em AS v`;
    return v.getTime();
  }

  it("secao da home: publicar com a mesma versao, so uma passa", async () => {
    const [{ conteudo }] = instancias;
    for (let rodada = 0; rodada < 5; rodada++) {
      const base = (await conteudo.publicarSecao("galeria", CONTEUDO_PADRAO.galeria))!;
      const r = await aoMesmoTempo(
        "conteudo_site",
        secao("galeria"),
        instancias.map((i) => () => i.conteudo.publicarSecao("galeria", CONTEUDO_PADRAO.galeria, base.atualizadoEm)),
      );
      expect(r.filter((x) => x !== null)).toHaveLength(1);
      const vencedora = r.find((x) => x !== null)!;
      expect(Date.parse(vencedora.atualizadoEm!)).toBeGreaterThan(Date.parse(base.atualizadoEm!));
      expect((await conteudo.lerSecao("galeria"))!.atualizadoEm).toBe(vencedora.atualizadoEm);
    }
  }, 60_000);

  it("secao da home: rascunho, descarte e voltar ao padrao com a mesma versao, so um passa", async () => {
    const [{ conteudo }] = instancias;
    const base = (await conteudo.publicarSecao("contato", CONTEUDO_PADRAO.contato))!;
    const rascunhos = await aoMesmoTempo(
      "conteudo_site",
      secao("contato"),
      instancias.map((i, n) => () => i.conteudo.gravarRascunho("contato", { ...CONTEUDO_PADRAO.contato, horario: `rascunho ${n}` }, base.atualizadoEm)),
    );
    expect(rascunhos.filter((x) => x !== null)).toHaveLength(1);

    const comRascunho = (await conteudo.lerSecao("contato"))!;
    const descartes = await aoMesmoTempo(
      "conteudo_site",
      secao("contato"),
      instancias.map((i) => () => i.conteudo.descartarRascunho("contato", comRascunho.atualizadoEm)),
    );
    expect(descartes.filter((x) => x !== null)).toHaveLength(1);

    const semRascunho = (await conteudo.lerSecao("contato"))!;
    const voltas = await aoMesmoTempo(
      "conteudo_site",
      secao("contato"),
      instancias.map((i) => () => i.conteudo.voltarAoPadrao("contato", semRascunho.atualizadoEm)),
    );
    expect(voltas.filter((x) => x !== null)).toHaveLength(1);
    expect((await conteudo.lerSecao("contato"))!.publicado).toBeNull();
  }, 60_000);

  it("secao da home nunca salva: duas primeiras gravacoes ao mesmo tempo, so uma passa", async () => {
    // Sem linha para prender: as gravacoes disputam o INSERT. Repetido para a
    // corrida acontecer de verdade em alguma rodada.
    const chaves = ["hero", "bem-vindo", "abordagem", "tratamentos", "responsabilidade"] as const;
    for (const chave of chaves) {
      const r = await Promise.all(instancias.map((i) => i.conteudo.publicarSecao(chave, CONTEUDO_PADRAO[chave], null)));
      expect(r.filter((x) => x !== null), chave).toHaveLength(1);
    }
  }, 60_000);

  it("post: gravacoes ao mesmo tempo saem com versoes diferentes e crescentes", async () => {
    const [{ posts }] = instancias;
    const dados = { titulo: "Texto da corrida", resumo: "r", categoria: "", capa: "", corpo: "corpo", publicado: false };
    const { post } = await posts.criarPost(dados);
    const base = await relogioParado("posts", post.id);
    const r = await aoMesmoTempo(
      "posts",
      direto`id = ${post.id}`,
      instancias.map((i, n) => () => i.posts.atualizarPost(post.id, { ...dados, corpo: `corpo ${n}` })),
    );
    const versoes = r.map((p) => Date.parse(p!.atualizadoEm)).sort((a, b) => a - b);
    expect(versoes).toEqual(instancias.map((_, n) => base + n + 1));
  }, 60_000);

  it("pagina: gravacoes ao mesmo tempo saem com versoes diferentes e crescentes", async () => {
    const [{ paginas }] = instancias;
    const dados = {
      titulo: "Pagina da corrida",
      resumo: "r",
      categoria: "",
      capa: "",
      capaAlt: "",
      capaLegenda: "",
      corpo: "corpo",
      publicado: false,
    };
    const { pagina } = await paginas.criarPagina(dados, randomUUID());
    const base = await relogioParado("paginas", pagina.id);
    const r = await aoMesmoTempo(
      "paginas",
      direto`id = ${pagina.id}`,
      instancias.map((i, n) => () => i.paginas.atualizarPagina(pagina.id, { ...dados, corpo: `corpo ${n}` })),
    );
    const versoes = r.map((p) => Date.parse(p!.pagina.atualizadoEm)).sort((a, b) => a - b);
    expect(versoes).toEqual(instancias.map((_, n) => base + n + 1));
  }, 60_000);

  const DADOS_DO_POST = { titulo: "Texto disputado", resumo: "r", categoria: "", capa: "", corpo: "corpo", publicado: false };
  const DADOS_DA_PAGINA = { ...DADOS_DO_POST, titulo: "Pagina disputada", capaAlt: "", capaLegenda: "" };

  it("post: salvar, publicar e tirar do site com a mesma versao, so uma gravacao passa", async () => {
    const [{ posts }] = instancias;
    const { post } = await posts.criarPost(DADOS_DO_POST);
    let versao = post.atualizadoEm;
    // rascunho, publicar, tirar do site: cada rodada parte da versao que a anterior deixou
    for (const publicado of [false, true, false]) {
      const r = await aoMesmoTempo(
        "posts",
        direto`id = ${post.id}`,
        instancias.map((i, n) => () => resultado(i.posts.atualizarPost(post.id, { ...DADOS_DO_POST, publicado, corpo: `aba ${n}` }, "markdown", versao))),
      );
      expect(r.filter((x) => x === "ok"), `publicado=${publicado}`).toHaveLength(1);
      expect(r.filter((x) => x === "conflito")).toHaveLength(INSTANCIAS - 1);
      const agora = (await posts.buscarPorId(post.id))!;
      expect(agora.publicado).toBe(publicado);
      expect(agora.corpo).toBe(`aba ${r.indexOf("ok")}`);
      versao = agora.atualizadoEm;
    }
  }, 60_000);

  it("post: apagar e salvar ao mesmo tempo com a mesma versao, so um passa; apagar com versao velha nao apaga", async () => {
    const [{ posts }] = instancias;
    const { post } = await posts.criarPost(DADOS_DO_POST);
    const r = await aoMesmoTempo("posts", direto`id = ${post.id}`, [
      () => resultado(instancias[0].posts.apagarPost(post.id, post.atualizadoEm)),
      () => resultado(instancias[1].posts.atualizarPost(post.id, DADOS_DO_POST, "markdown", post.atualizadoEm)),
      () => resultado(instancias[2].posts.apagarPost(post.id, post.atualizadoEm)),
    ]);
    expect(r.filter((x) => x === "ok")).toHaveLength(1);

    const { post: outro } = await posts.criarPost(DADOS_DO_POST);
    const editado = (await posts.atualizarPost(outro.id, { ...DADOS_DO_POST, corpo: "novo" }, "markdown", outro.atualizadoEm))!;
    await expect(posts.apagarPost(outro.id, outro.atualizadoEm)).rejects.toMatchObject({ name: "VersaoDesatualizada" });
    expect(await posts.buscarPorId(outro.id)).not.toBeNull();
    expect(await posts.apagarPost(outro.id, editado.atualizadoEm)).toBe(true);
  }, 60_000);

  it("post: envio repetido de texto novo passa enquanto ninguem mexeu; depois, e' conflito", async () => {
    const [{ posts }] = instancias;
    const id = randomUUID();
    await posts.criarPost(DADOS_DO_POST, id);
    const repetido = await posts.criarPost({ ...DADOS_DO_POST, corpo: "repetido" }, id);
    expect(repetido.post.corpo).toBe("repetido");
    // outra aba abriu e salvou; o envio repetido da primeira nao grava por cima
    const salvo = await posts.buscarPorId(id);
    await posts.atualizarPost(id, { ...DADOS_DO_POST, corpo: "outra aba" }, "markdown", salvo!.atualizadoEm);
    await expect(posts.criarPost({ ...DADOS_DO_POST, corpo: "por cima" }, id)).rejects.toMatchObject({ name: "VersaoDesatualizada" });
    expect((await posts.buscarPorId(id))!.corpo).toBe("outra aba");
  }, 60_000);

  it("pagina: salvar, publicar, tirar do site e apagar com a mesma versao, so uma passa", async () => {
    const [{ paginas }] = instancias;
    const { pagina } = await paginas.criarPagina(DADOS_DA_PAGINA, randomUUID());
    let versao = pagina.atualizadoEm;
    for (const publicado of [false, true, false]) {
      const r = await aoMesmoTempo(
        "paginas",
        direto`id = ${pagina.id}`,
        instancias.map((i, n) => () =>
          resultado(i.paginas.atualizarPagina(pagina.id, { ...DADOS_DA_PAGINA, publicado, corpo: `aba ${n}` }, "markdown", versao)),
        ),
      );
      expect(r.filter((x) => x === "ok"), `publicado=${publicado}`).toHaveLength(1);
      const agora = (await paginas.buscarPaginaPorId(pagina.id))!;
      expect(agora.publicado).toBe(publicado);
      versao = agora.atualizadoEm;
    }
    const r = await aoMesmoTempo(
      "paginas",
      direto`id = ${pagina.id}`,
      instancias.map((i) => () => resultado(i.paginas.apagarPagina(pagina.id, versao))),
    );
    expect(r.filter((x) => x === "ok")).toHaveLength(1);
    expect(await paginas.buscarPaginaPorId(pagina.id)).toBeNull();
  }, 60_000);

  it("pagina: envio repetido de pagina nova passa enquanto ninguem mexeu; depois, e' conflito", async () => {
    const [{ paginas }] = instancias;
    const id = randomUUID();
    await paginas.criarPagina(DADOS_DA_PAGINA, id);
    expect((await paginas.criarPagina({ ...DADOS_DA_PAGINA, corpo: "repetido" }, id)).pagina.corpo).toBe("repetido");
    const salva = await paginas.buscarPaginaPorId(id);
    await paginas.atualizarPagina(id, { ...DADOS_DA_PAGINA, corpo: "outra aba" }, "markdown", salva!.atualizadoEm);
    await expect(paginas.criarPagina({ ...DADOS_DA_PAGINA, corpo: "por cima" }, id)).rejects.toMatchObject({
      name: "VersaoDesatualizada",
    });
    expect((await paginas.buscarPaginaPorId(id))!.corpo).toBe("outra aba");
  }, 60_000);
});
