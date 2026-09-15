import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exigirSegredoDoCron, invalidarCacheSeOBancoResponde, statusDoCron } from "./cron";

const SEGREDO = "s3gredo-do-cron-com-folga";

function pedido(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("https://exemplo.invalido/api/cron/numeros", { headers });
}

describe("exigirSegredoDoCron", () => {
  beforeEach(() => {
    // O aviso de configuracao ausente e esperado nestes casos; silenciar evita
    // que a saida do teste pareca uma falha.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("deixa passar o agendador com o segredo certo", () => {
    vi.stubEnv("CRON_SECRET", SEGREDO);
    expect(exigirSegredoDoCron(pedido(`Bearer ${SEGREDO}`))).toBeNull();
  });

  it("recusa quando o servidor nao tem segredo — falha fechada", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const resposta = exigirSegredoDoCron(pedido("Bearer "));
    expect(resposta?.status).toBe(401);
    expect(await resposta?.json()).toEqual({ erro: "Não autorizado." });
  });

  it("recusa segredo com menos de 16 caracteres, mesmo com o cabecalho batendo", () => {
    const curto = "a".repeat(15);
    vi.stubEnv("CRON_SECRET", curto);
    expect(exigirSegredoDoCron(pedido(`Bearer ${curto}`))?.status).toBe(401);
  });

  it("aceita segredo com exatamente 16 caracteres", () => {
    const justo = "b".repeat(16);
    vi.stubEnv("CRON_SECRET", justo);
    expect(exigirSegredoDoCron(pedido(`Bearer ${justo}`))).toBeNull();
  });

  it.each([
    ["sem cabecalho", undefined],
    ["cabecalho vazio", ""],
    ["mesmo tamanho, um caractere diferente", `Bearer ${SEGREDO.slice(0, -1)}X`],
    ["mais curto", `Bearer ${SEGREDO.slice(0, -1)}`],
    ["mais longo", `Bearer ${SEGREDO}X`],
    ["sem o prefixo Bearer", SEGREDO],
    ["prefixo em minusculas", `bearer ${SEGREDO}`],
    ["outro esquema", `Basic ${SEGREDO}`],
  ])("recusa: %s", (_caso, authorization) => {
    vi.stubEnv("CRON_SECRET", SEGREDO);
    expect(exigirSegredoDoCron(pedido(authorization))?.status).toBe(401);
  });
});

/**
 * A autocura do cache so pode acontecer com o banco respondendo.
 *
 * O caso que importa e o de baixo: invalidar com o banco fora troca o conteudo
 * publicado, que esta certo no cache, pelo texto padrao — e ele fica ate a
 * proxima publicacao ou deploy. Uma queda as 6h da manha deixaria o site inteiro
 * com o telefone antigo por 24 horas.
 */
describe("autocura do cache do site", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("banco fora: nao invalida nada e deixa anotado", async () => {
    const invalidar = vi.fn();
    const anotar = vi.fn<(motivo: string) => Promise<void>>(async () => {});

    const invalidou = await invalidarCacheSeOBancoResponde({
      provarLeitura: () => Promise.reject(new Error("ECONNREFUSED")),
      invalidar,
      anotarQuePulou: anotar,
    });

    expect(invalidou).toBe(false);
    expect(invalidar).not.toHaveBeenCalled();
    expect(anotar).toHaveBeenCalledTimes(1);
    expect(anotar.mock.calls[0][0]).toMatch(/cache nao invalidado/);
  });

  it("disjuntor em pausa conta como banco fora", async () => {
    const invalidar = vi.fn();
    const pausa = Object.assign(new Error("banco em pausa"), { name: "BancoEmPausa" });

    const invalidou = await invalidarCacheSeOBancoResponde({
      provarLeitura: () => Promise.reject(pausa),
      invalidar,
      anotarQuePulou: async () => {},
    });

    expect(invalidou).toBe(false);
    expect(invalidar).not.toHaveBeenCalled();
  });

  it("banco respondendo: invalida uma vez", async () => {
    const invalidar = vi.fn();
    const anotar = vi.fn<(motivo: string) => Promise<void>>(async () => {});

    const invalidou = await invalidarCacheSeOBancoResponde({
      provarLeitura: () => Promise.resolve({ hero: { titulo: "x" } }),
      invalidar,
      anotarQuePulou: anotar,
    });

    expect(invalidou).toBe(true);
    expect(invalidar).toHaveBeenCalledTimes(1);
    expect(anotar).not.toHaveBeenCalled();
  });

  it("falhar ao anotar nao derruba o cron", async () => {
    const invalidar = vi.fn();

    const invalidou = await invalidarCacheSeOBancoResponde({
      provarLeitura: () => Promise.reject(new Error("fora")),
      invalidar,
      anotarQuePulou: () => Promise.reject(new Error("o banco tambem nao grava")),
    });

    expect(invalidou).toBe(false);
    expect(invalidar).not.toHaveBeenCalled();
  });
});

describe("status da execucao do cron", () => {
  it("autocura pulada responde 502, mesmo com a coleta certa", () => {
    // Antes saia 200: a autocura pulada ficava so no diario que ninguem le.
    expect(statusDoCron({ coletaFalhou: false, cacheInvalidado: false })).toBe(502);
  });

  it("coleta com erro responde 502", () => {
    expect(statusDoCron({ coletaFalhou: true, cacheInvalidado: true })).toBe(502);
  });

  it("poda dos dados do painel que falhou responde 502, mesmo com coleta e autocura certas", () => {
    expect(statusDoCron({ coletaFalhou: false, cacheInvalidado: true, podaFalhou: true })).toBe(502);
    expect(statusDoCron({ coletaFalhou: false, cacheInvalidado: true, podaFalhou: false })).toBe(200);
    expect(statusDoCron({ coletaFalhou: false, cacheInvalidado: null, podaFalhou: null })).toBe(200);
  });

  it("tudo certo, ou lote de historico sem autocura, responde 200", () => {
    expect(statusDoCron({ coletaFalhou: false, cacheInvalidado: true })).toBe(200);
    expect(statusDoCron({ coletaFalhou: false, cacheInvalidado: null })).toBe(200);
  });
});
