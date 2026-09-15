import { describe, expect, it } from "vitest";

import { criarVagasDeLeitura } from "./vagas-de-leitura";

/**
 * O caso que importa: um script com dezenas de conexoes lentas nao pode fazer
 * a dona, de outro endereco, levar "Muitas tentativas ao mesmo tempo".
 */
describe("vagas de leitura do corpo do login", () => {
  it("50 leituras lentas de um script so recusam o proprio script, e a dona le normalmente", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 200, maximoAbsoluto: 400 });
    const modos = Array.from({ length: 50 }, () => vagas.ocupar("198.51.100.7"));
    expect(modos.filter((m) => m !== "recusado")).toHaveLength(4);
    expect(vagas.ocupar("203.0.113.20")).toBe("normal");
  });

  it("total cheio, abaixo do teto absoluto, nao recusa ninguem: le com prazo curto", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8, maximoAbsoluto: 16 });
    for (let i = 0; i < 8; i += 1) expect(vagas.ocupar(`10.0.0.${i}`)).toBe("normal");
    expect(vagas.ocupar("203.0.113.20")).toBe("curto");
  });

  it("sem origem conhecida nao da para separar a dona de quem ataca: acima do teto, prazo curto e nao recusa", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 2, maximoTotal: 100, maximoAbsoluto: 200 });
    expect(vagas.ocupar(null)).toBe("normal");
    expect(vagas.ocupar(null)).toBe("normal");
    expect(vagas.ocupar(null)).toBe("curto");
  });

  it("acima do teto absoluto recusa, mesmo de origem nova ou desconhecida", () => {
    // Um bloco de enderecos com 4 leituras cada enchia o total e seguia abrindo
    // leituras curtas sem limite.
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8, maximoAbsoluto: 12 });
    for (let i = 0; i < 12; i += 1) expect(vagas.ocupar(`2001:db8::${i}`)).not.toBe("recusado");
    expect(vagas.ocupar("2001:db8::ff")).toBe("recusado");
    expect(vagas.ocupar(null)).toBe("recusado");
    expect(vagas.total()).toBe(12);
    vagas.liberar("2001:db8::0");
    expect(vagas.ocupar("203.0.113.20")).toBe("curto");
  });

  it("a chave de origem desconhecida e texto comum, sem caractere nulo literal no arquivo", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync(new URL("./vagas-de-leitura.ts", import.meta.url), "utf8");
    expect(fonte.includes("\u0000")).toBe(false);
  });

  it("liberar devolve a vaga e nao guarda a origem que zerou", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 1, maximoTotal: 10, maximoAbsoluto: 20 });
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
