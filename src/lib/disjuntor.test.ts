import { describe, expect, it, vi } from "vitest";

import { BancoEmPausa, conexaoCaida, criarDisjuntor, emConstrucao } from "./disjuntor";

function erroCom(code: string) {
  return Object.assign(new Error(code), { code });
}

function relogio(inicio = 1_000_000) {
  let t = inicio;
  return { agora: () => t, andar: (ms: number) => (t += ms) };
}

describe("conexaoCaida", () => {
  it("reconhece conexao que morreu, e nao banco que recusa ou demora", () => {
    expect(conexaoCaida(erroCom("ECONNRESET"))).toBe(true);
    expect(conexaoCaida(erroCom("CONNECTION_CLOSED"))).toBe(true);
    expect(conexaoCaida(erroCom("CONNECT_TIMEOUT"))).toBe(false);
    expect(conexaoCaida(erroCom("ECONNREFUSED"))).toBe(false);
    expect(conexaoCaida(new Error("sem codigo"))).toBe(false);
    expect(conexaoCaida(null)).toBe(false);
  });
});

describe("criarDisjuntor", () => {
  it("conexao caida tenta de novo uma vez, e a segunda tentativa vale", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora });
    const leitura = vi.fn().mockRejectedValueOnce(erroCom("ECONNRESET")).mockResolvedValueOnce("ok");
    await expect(disjuntor.ler(leitura)).resolves.toBe("ok");
    expect(leitura).toHaveBeenCalledTimes(2);
    expect(disjuntor.emPausa()).toBe(false);
  });

  it("banco que demora nao ganha segunda espera: falha na hora e entra em pausa", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora });
    const leitura = vi.fn().mockRejectedValue(erroCom("CONNECT_TIMEOUT"));
    await expect(disjuntor.ler(leitura)).rejects.toMatchObject({ code: "CONNECT_TIMEOUT" });
    expect(leitura).toHaveBeenCalledTimes(1);
    expect(disjuntor.emPausa()).toBe(true);
  });

  it("durante a pausa nao toca no banco; depois dela tenta de novo", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora });
    await expect(disjuntor.ler(() => Promise.reject(erroCom("ECONNREFUSED")))).rejects.toBeTruthy();

    const leitura = vi.fn().mockResolvedValue(1);
    r.andar(14_999);
    await expect(disjuntor.ler(leitura)).rejects.toBeInstanceOf(BancoEmPausa);
    expect(leitura).not.toHaveBeenCalled();

    r.andar(1);
    await expect(disjuntor.ler(leitura)).resolves.toBe(1);
    expect(disjuntor.emPausa()).toBe(false);
  });

  it("conexao que cai duas vezes seguidas conta como falha", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora });
    const leitura = vi.fn().mockRejectedValue(erroCom("ECONNRESET"));
    await expect(disjuntor.ler(leitura)).rejects.toBeTruthy();
    expect(leitura).toHaveBeenCalledTimes(2);
    expect(disjuntor.emPausa()).toBe(true);
  });
});

describe("emConstrucao", () => {
  it("so no build de producao do Next", () => {
    expect(emConstrucao({ NEXT_PHASE: "phase-production-build" })).toBe(true);
    expect(emConstrucao({ NEXT_PHASE: "phase-production-server" })).toBe(false);
    expect(emConstrucao({})).toBe(false);
  });
});
