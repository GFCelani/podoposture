import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exigirSegredoDoCron } from "./cron";

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
