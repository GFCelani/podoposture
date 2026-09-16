import { describe, expect, it } from "vitest";

import { criarVagasDeLeitura } from "./vagas-de-leitura";

/**
 * O caso que importa: um script com dezenas de conexoes lentas nao pode fazer
 * a dona, de outro endereco, levar "Muitas tentativas ao mesmo tempo".
 */
describe("vagas de leitura do corpo do login", () => {
  it("50 leituras lentas de um script so recusam o proprio script, e a dona le normalmente", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 200, maximoAbsoluto: 400, origensLembradas: 8 });
    const modos = Array.from({ length: 50 }, () => vagas.ocupar("198.51.100.7"));
    expect(modos.filter((m) => m !== "recusado")).toHaveLength(4);
    expect(vagas.ocupar("203.0.113.20")).toBe("normal");
  });

  it("total cheio, abaixo do teto absoluto, nao recusa ninguem: le com prazo curto", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8, maximoAbsoluto: 16, origensLembradas: 2 });
    for (let i = 0; i < 8; i += 1) expect(vagas.ocupar(`10.0.0.${i}`)).toBe("normal");
    expect(vagas.ocupar("203.0.113.20")).toBe("curto");
  });

  it("sem origem conhecida nao da para separar a dona de quem ataca: acima do teto, prazo curto e nao recusa", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 2, maximoTotal: 100, maximoAbsoluto: 200, origensLembradas: 8 });
    expect(vagas.ocupar(null)).toBe("normal");
    expect(vagas.ocupar(null)).toBe("normal");
    expect(vagas.ocupar(null)).toBe("curto");
  });

  it("acima do teto absoluto recusa a origem nova ou desconhecida, que quem ataca tem de sobra", () => {
    // Um bloco de enderecos com 4 leituras cada enchia o total e seguia abrindo
    // leituras curtas sem limite.
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8, maximoAbsoluto: 12, origensLembradas: 2 });
    for (let i = 0; i < 12; i += 1) expect(vagas.ocupar(`2001:db8::${i}`)).not.toBe("recusado");
    expect(vagas.ocupar("2001:db8::ff")).toBe("recusado");
    expect(vagas.ocupar(null)).toBe("recusado");
    expect(vagas.total()).toBe(12);
    vagas.liberar("2001:db8::0");
    expect(vagas.ocupar("203.0.113.20")).toBe("curto");
  });

  it("acima do teto absoluto, quem ja entrou nesta instancia le na reserva e nao leva 429", () => {
    // O bloqueio barato de volta: 12 leituras de um /64 enchiam o teto absoluto
    // e a dona, de outro endereco, levava "Muitas tentativas ao mesmo tempo".
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8, maximoAbsoluto: 12, origensLembradas: 2 });
    vagas.lembrarOrigem("203.0.113.20");
    for (let i = 0; i < 12; i += 1) expect(vagas.ocupar(`2001:db8::${i}`)).not.toBe("recusado");

    expect(vagas.ocupar("203.0.113.20")).toBe("curto");
    // O flood segue recusado, e a reserva nao depende de ele parar.
    expect(vagas.ocupar("2001:db8::ff")).toBe("recusado");
    for (let i = 0; i < 3; i += 1) expect(vagas.ocupar("203.0.113.20")).toBe("curto");
    // A reserva tem fim: nem quem ja entrou passa do proprio teto por origem...
    expect(vagas.ocupar("203.0.113.20")).toBe("recusado");
    // ...nem do teto duro, que e o que limita a memoria (12 + 2 x 4 = 20).
    vagas.lembrarOrigem("203.0.113.21");
    for (let i = 0; i < 4; i += 1) expect(vagas.ocupar("203.0.113.21")).toBe("curto");
    expect(vagas.total()).toBe(20);
    expect(vagas.ocupar("203.0.113.21")).toBe("recusado");
  });

  it("a lista de quem ja entrou e curta: a origem mais antiga sai, a que entrou por ultimo fica", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 1, maximoTotal: 2, maximoAbsoluto: 2, origensLembradas: 2 });
    vagas.lembrarOrigem("203.0.113.1");
    vagas.lembrarOrigem("203.0.113.2");
    vagas.lembrarOrigem("203.0.113.3");
    for (let i = 0; i < 2; i += 1) expect(vagas.ocupar(`2001:db8::${i}`)).not.toBe("recusado");
    expect(vagas.ocupar("203.0.113.1")).toBe("recusado");
    expect(vagas.ocupar("203.0.113.2")).toBe("curto");
    expect(vagas.ocupar("203.0.113.3")).toBe("curto");
  });

  it("lembra so quem acertou a senha, e nada sem origem conhecida", () => {
    // E o que da a vaga reservada de scrypt na rota de entrada.
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 4, maximoTotal: 8, maximoAbsoluto: 12, origensLembradas: 2 });
    expect(vagas.lembra("203.0.113.20")).toBe(false);
    expect(vagas.lembra(null)).toBe(false);
    vagas.lembrarOrigem("203.0.113.20");
    expect(vagas.lembra("203.0.113.20")).toBe(true);
    expect(vagas.lembra("2001:db8::ff")).toBe(false);
    // Sai da lista pela ponta antiga como qualquer outra.
    vagas.lembrarOrigem("203.0.113.21");
    vagas.lembrarOrigem("203.0.113.22");
    expect(vagas.lembra("203.0.113.20")).toBe(false);
  });

  it("a chave de origem desconhecida e texto comum, sem caractere nulo literal no arquivo", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync(new URL("./vagas-de-leitura.ts", import.meta.url), "utf8");
    expect(fonte.includes("\u0000")).toBe(false);
  });

  it("liberar devolve a vaga e nao guarda a origem que zerou", () => {
    const vagas = criarVagasDeLeitura({ maximoPorOrigem: 1, maximoTotal: 10, maximoAbsoluto: 20, origensLembradas: 8 });
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
