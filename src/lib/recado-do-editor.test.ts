import { describe, expect, it } from "vitest";

import {
  CHAVE_DO_RECADO,
  deixarRecado,
  lerRecado,
  tomarRecado,
  type Armazem,
} from "./recado-do-editor";

const ID = "3f1c2a9e-8d4b-4c7a-9e21-0b5d6f7a8c90";

function armazemDeTeste(): Armazem & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => void dados.set(chave, valor),
    removeItem: (chave) => void dados.delete(chave),
  };
}

describe("recado do editor", () => {
  it("o recado de reabrir atravessa a troca de tela", () => {
    const armazem = armazemDeTeste();
    deixarRecado(armazem, { tipo: "reabrir", id: ID });
    expect(tomarRecado(armazem)).toEqual({ tipo: "reabrir", id: ID });
  });

  it("texto novo, ainda sem id, tambem reabre", () => {
    const armazem = armazemDeTeste();
    deixarRecado(armazem, { tipo: "reabrir", id: null });
    expect(tomarRecado(armazem)).toEqual({ tipo: "reabrir", id: null });
  });

  it("quem le apaga: o mesmo recado nao vale duas vezes", () => {
    const armazem = armazemDeTeste();
    deixarRecado(armazem, { tipo: "salvo", mensagem: "Texto publicado." });
    expect(tomarRecado(armazem)).toEqual({ tipo: "salvo", mensagem: "Texto publicado." });
    expect(tomarRecado(armazem)).toBeNull();
    expect(armazem.dados.has(CHAVE_DO_RECADO)).toBe(false);
  });

  it.each([
    ["vazio", ""],
    ["nao e JSON", "{reabrir"],
    ["tipo desconhecido", JSON.stringify({ tipo: "apagar", id: ID })],
    ["id que nao e UUID", JSON.stringify({ tipo: "reabrir", id: "../sessao" })],
    ["id numerico", JSON.stringify({ tipo: "reabrir", id: 7 })],
    ["mensagem vazia", JSON.stringify({ tipo: "salvo", mensagem: "" })],
    ["mensagem longa demais", JSON.stringify({ tipo: "salvo", mensagem: "x".repeat(201) })],
    ["null", "null"],
  ])("recado fora do formato e ignorado: %s", (_caso, valor) => {
    expect(lerRecado(valor)).toBeNull();
  });

  it("sem armazenamento, ninguem quebra", () => {
    expect(() => deixarRecado(null, { tipo: "reabrir", id: ID })).not.toThrow();
    expect(tomarRecado(null)).toBeNull();
  });

  it("armazenamento que lanca (cota, modo privado) nao derruba a tela", () => {
    const quebrado: Armazem = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("cota");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(() => deixarRecado(quebrado, { tipo: "salvo", mensagem: "ok" })).not.toThrow();
    expect(tomarRecado(quebrado)).toBeNull();
  });
});
