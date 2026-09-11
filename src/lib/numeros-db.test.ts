import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { LinhaDoDia } from "./numeros-tipos";

// `server-only` lanca fora do empacotador do Next. `posts.ts` usa o apelido
// `@/`, que o vitest deste projeto nao resolve, e aqui so importa porque
// `painel-db.ts` o carrega para outra coisa.
vi.mock("server-only", () => ({}));
vi.mock("./posts", () => ({ BRUTOS_DO_JSON: [], MAPA_ASCII_POSTS: new Map() }));

/**
 * Contra um Postgres de verdade: idempotencia e upsert sao comportamento do
 * banco, e um banco falso so provaria o que o teste mandou ele responder.
 *
 * Pulado sem DATABASE_URL_TESTE. Apaga e recria SO as tabelas `numeros_*`.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();

function linha(parcial: Partial<LinhaDoDia>): LinhaDoDia {
  return {
    fonte: "vercel",
    dia: "2026-09-01",
    dimensao: "total",
    chave: "",
    visitas: 0,
    pessoas: 0,
    cliques: 0,
    aparicoes: 0,
    posicao: null,
    ...parcial,
  };
}

describe.skipIf(!URL_DE_TESTE)("arquivo diario no Postgres", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let db: typeof import("./numeros-db");
  let banco: typeof import("./painel-db");

  beforeAll(async () => {
    // 127.0.0.1, e nao localhost: no Windows localhost resolve primeiro para
    // ::1 e o container so escuta IPv4.
    process.env.DATABASE_URL = URL_DE_TESTE!.replace("@localhost:", "@127.0.0.1:");
    banco = await import("./painel-db");
    db = await import("./numeros-db");
    // Recria do zero: uma tabela de rodada antiga, com outra forma, nao seria
    // corrigida pelo CREATE TABLE IF NOT EXISTS e o teste provaria a forma velha.
    const sql = banco.bancoDoPainel();
    await sql`DROP TABLE IF EXISTS numeros_dia`;
    await sql`DROP TABLE IF EXISTS numeros_coleta`;
    await db.primeiroDiaGuardado("vercel");
  });

  beforeEach(async () => {
    const sql = banco.bancoDoPainel();
    await sql`TRUNCATE numeros_dia, numeros_coleta`;
  });

  afterAll(async () => {
    await banco?.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  async function contarLinhas(): Promise<number> {
    const sql = banco.bancoDoPainel();
    const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM numeros_dia`;
    return total;
  }

  const coleta = [
    linha({ visitas: 10, pessoas: 7 }),
    linha({ dimensao: "rota", chave: "/home/f/texto", visitas: 3, pessoas: 2 }),
    linha({ fonte: "busca", cliques: 5, aparicoes: 50, posicao: 7.5 }),
  ];
  const DIA = { inicio: "2026-09-01", fim: "2026-09-01" };

  it("gravar a mesma coleta duas vezes nao duplica linha nem soma de novo", async () => {
    expect(await db.gravarLinhas(coleta)).toBe(3);
    await db.gravarLinhas(coleta);
    expect(await contarLinhas()).toBe(3);
    expect(await db.somarTotal("vercel", DIA)).toMatchObject({ visitas: 10, pessoas: 7 });
    expect(await db.somarTotal("busca", DIA)).toMatchObject({ cliques: 5, aparicoes: 50, posicao: 7.5 });
  });

  it("refazer o dia com numero novo substitui o antigo", async () => {
    await db.gravarLinhas(coleta);
    await db.gravarLinhas([linha({ visitas: 12, pessoas: 8 })]);
    expect(await contarLinhas()).toBe(3);
    expect(await db.somarTotal("vercel", DIA)).toMatchObject({ visitas: 12, pessoas: 8 });
  });

  it("zero deduzido nunca apaga o numero guardado, mas preenche o dia que falta", async () => {
    // O cenario do backfill: o arquivo ja tem o dia com visitas, a Vercel ja
    // apagou esse dia e responde vazio, e o total do dia vira zero deduzido.
    await db.gravarLinhas([linha({ visitas: 40, pessoas: 25 })]);
    await db.gravarLinhas([
      linha({ soSeVazio: true }),
      linha({ dia: "2026-09-02", soSeVazio: true }),
    ]);
    expect(await db.somarTotal("vercel", DIA)).toMatchObject({ visitas: 40, pessoas: 25 });
    expect(await db.serieDiaria("vercel", { inicio: "2026-09-01", fim: "2026-09-02" })).toEqual([
      { dia: "2026-09-01", pessoas: 25 },
      { dia: "2026-09-02", pessoas: 0 },
    ]);
    // e a medicao de verdade continua substituindo o zero deduzido
    await db.gravarLinhas([linha({ dia: "2026-09-02", visitas: 3, pessoas: 2 })]);
    expect((await db.somarTotal("vercel", { inicio: "2026-09-02", fim: "2026-09-02" })).pessoas).toBe(2);
  });

  it("chave repetida no mesmo lote nao derruba a gravacao", async () => {
    await db.gravarLinhas([linha({ visitas: 1 }), linha({ visitas: 2 })]);
    expect(await contarLinhas()).toBe(1);
    expect((await db.somarTotal("vercel", DIA)).visitas).toBe(2);
  });

  it("cada dimensao guarda no maximo 50 linhas por dia", async () => {
    const muitas = Array.from({ length: 60 }, (_, i) => linha({ dimensao: "origem", chave: `site${i}.com`, pessoas: i }));
    expect(await db.gravarLinhas(muitas)).toBe(50);
    const guardadas = await db.somarPorChave("vercel", "origem", DIA, 100);
    expect(guardadas).toHaveLength(50);
    expect(guardadas[0]).toMatchObject({ chave: "site59.com", pessoas: 59 });
  });

  it("soma por chave pondera a posicao pelas aparicoes", async () => {
    await db.gravarLinhas([
      linha({ fonte: "busca", dimensao: "consulta", chave: "zumbido", cliques: 1, aparicoes: 100, posicao: 10 }),
      linha({ fonte: "busca", dia: "2026-09-02", dimensao: "consulta", chave: "zumbido", cliques: 3, aparicoes: 300, posicao: 2 }),
    ]);
    const [zumbido] = await db.somarPorChave("busca", "consulta", { inicio: "2026-09-01", fim: "2026-09-02" }, 10);
    expect(zumbido).toMatchObject({ chave: "zumbido", cliques: 4, aparicoes: 400, posicao: 4 });
  });

  it("cliques por mes e serie diaria", async () => {
    await db.gravarLinhas([
      linha({ fonte: "busca", dia: "2026-08-31", cliques: 4 }),
      linha({ fonte: "busca", dia: "2026-09-01", cliques: 5 }),
      linha({ fonte: "busca", dia: "2026-09-02", cliques: 6 }),
      linha({ dia: "2026-09-02", pessoas: 9 }),
    ]);
    expect(await db.cliquesPorMes("2026-08-01")).toEqual([
      { mes: "2026-08", cliques: 4, aparicoes: 0 },
      { mes: "2026-09", cliques: 11, aparicoes: 0 },
    ]);
    expect(await db.serieDiaria("vercel", { inicio: "2026-09-01", fim: "2026-09-30" })).toEqual([{ dia: "2026-09-02", pessoas: 9 }]);
    expect(await db.primeiroDiaGuardado("busca")).toBe("2026-08-31");
    expect(await db.primeiroDiaGuardado("vercel")).toBe("2026-09-02");
  });

  it("o estado da fonte ignora lote de historico e diz o que esta guardado", async () => {
    await db.gravarLinhas(coleta);
    await db.registrarColeta({ fonte: "vercel", situacao: "ok", historico: false, ate: "2026-09-01", linhas: 2, erro: null });
    await db.registrarColeta({ fonte: "vercel", situacao: "erro", historico: true, ate: null, linhas: 0, erro: "lote antigo" });
    await db.registrarColeta({ fonte: "busca", situacao: "nao-configurada", historico: false, ate: null, linhas: 0, erro: null });

    const estado = await db.estadoDasFontes();
    expect(estado.vercel).toMatchObject({
      ultima: { situacao: "ok", ate: "2026-09-01", linhas: 2 },
      ultimaComSucesso: { situacao: "ok" },
      primeiroDia: "2026-09-01",
      ultimoDia: "2026-09-01",
    });
    expect(typeof estado.vercel.ultima?.em).toBe("string");
    expect(estado.busca.ultima?.situacao).toBe("nao-configurada");
    expect(estado.busca.ultimaComSucesso).toBeNull();
  });

  it("conta noites seguidas de falha pela ultima execucao de cada dia", async () => {
    const sql = banco.bancoDoPainel();
    await sql`
      INSERT INTO numeros_coleta (fonte, em, situacao, historico) VALUES
        ('busca', NOW() - INTERVAL '3 days', 'erro', false),
        ('busca', NOW() - INTERVAL '2 days', 'ok', false),
        ('busca', NOW() - INTERVAL '1 day', 'ok', false),
        ('busca', NOW() - INTERVAL '1 day' + INTERVAL '1 second', 'erro', false),
        ('busca', NOW(), 'nao-configurada', false),
        ('busca', NOW(), 'erro', true)`;
    // ontem terminou em erro; hoje so houve fonte nao configurada e lote de historico
    expect(await db.diasSeguidosComFalha("busca")).toBe(1);
    expect(await db.falhasDeHoje("busca")).toBe(0);

    await db.registrarColeta({ fonte: "busca", situacao: "erro", historico: false, ate: null, linhas: 0, erro: "x" });
    expect(await db.diasSeguidosComFalha("busca")).toBe(2);
    expect(await db.falhasDeHoje("busca")).toBe(1);

    // segunda execucao da mesma noite: ainda duas noites, mas nao e a primeira falha de hoje
    await db.registrarColeta({ fonte: "busca", situacao: "erro", historico: false, ate: null, linhas: 0, erro: "x" });
    expect(await db.diasSeguidosComFalha("busca")).toBe(2);
    expect(await db.falhasDeHoje("busca")).toBe(2);
    expect(await db.diasSeguidosComFalha("vercel")).toBe(0);
  });

  it("a poda apaga resumo com mais de 3 anos e mantem o resto", async () => {
    await db.gravarLinhas([linha({ dia: "2020-01-01", visitas: 1 }), linha({ visitas: 2 })]);
    await db.podarNumeros();
    expect(await contarLinhas()).toBe(1);
  });
});
