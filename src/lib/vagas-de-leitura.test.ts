import { describe, expect, it } from "vitest";

import { criarVagasDeLeitura } from "./vagas-de-leitura";

/**
 * O caso que importa: um script com dezenas de conexoes lentas nao pode fazer
 * a dona, de outro endereco, levar "Muitas tentativas ao mesmo tempo".
 */
describe("vagas de leitura do corpo do login", () => {
  it("50 leituras lentas de um script so recusam o proprio script, e a dona le normalmente", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 200 });
    const modos = Array.from({ length: 50 }, () => vagas.ocupar("198.51.100.7"));
    expect(modos.filter((m) => m !== "recusado")).toHaveLength(4);
    expect(vagas.ocupar("203.0.113.20")).toBe("normal");
  });

  it("total cheio nao recusa ninguem: le com prazo curto", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8 });
    for (let i = 0; i < 8; i += 1) expect(vagas.ocupar(`10.0.0.${i}`)).toBe("normal");
    expect(vagas.ocupar("203.0.113.20")).toBe("curto");
  });

  it("sem origem conhecida nao da para separar a dona de quem ataca: acima do teto, prazo curto e nao recusa", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 2, maximoTotal: 100 });
    expect(vagas.ocupar(null)).toBe("normal");
    expect(vagas.ocupar(null)).toBe("normal");
    expect(vagas.ocupar(null)).toBe("curto");
  });

  it("liberar devolve a vaga e nao guarda a origem que zerou", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 1, maximoTotal: 10 });
    expect(vagas.ocupar("198.51.100.7")).toBe("normal");
    expect(vagas.ocupar("198.51.100.7")).toBe("recusado");
    vagas.liberar("198.51.100.7");
    expect(vagas.total()).toBe(0);
    expect(vagas.ocupar("198.51.100.7")).toBe("normal");
    // Liberar a mais nao deixa o total negativo.
    vagas.liberar("198.51.100.7");
    vagas.liberar("198.51.100.7");
    expect(vagas.total()).toBe(0);
  });
});
