import { beforeEach, describe, expect, it, vi } from "vitest";

// O banco fica de fora: o que se testa aqui e a regra de quem conta e quem e
// esquecido. O banco de verdade entra so para confirmar que a limpeza chega
// nele com a origem certa.
const banco = vi.hoisted(() => ({
  configurado: false,
  limpar: vi.fn<(chave: string) => Promise<void>>(async () => {}),
}));

vi.mock("server-only", () => ({}));
vi.mock("./painel-db", () => ({
  bancoConfigurado: () => banco.configurado,
  contarERegistrarTentativa: vi.fn(async () => 1),
  limparTentativas: banco.limpar,
}));

import {
  LIMITE_POR_ORIGEM,
  _limparMemoria,
  esquecerTentativas,
  registrarTentativa,
} from "./limite-de-tentativas";

const CELULAR = "203.0.113.7";
const COMPUTADOR = "198.51.100.4";

async function tentar(origem: string | null, vezes: number) {
  let ultima = await registrarTentativa(origem);
  for (let i = 1; i < vezes; i += 1) ultima = await registrarTentativa(origem);
  return ultima;
}

beforeEach(() => {
  _limparMemoria();
  banco.configurado = false;
  banco.limpar.mockClear();
});

describe("esquecerTentativas", () => {
  it("sem esquecer, entrar certo tambem gasta o limite e a proxima vez e barrada", async () => {
    await tentar(CELULAR, LIMITE_POR_ORIGEM);
    expect((await registrarTentativa(CELULAR)).permitido).toBe(false);
  });

  it("senha certa devolve o limite inteiro para aquela origem", async () => {
    await tentar(CELULAR, LIMITE_POR_ORIGEM);
    await esquecerTentativas(CELULAR);
    const depois = await registrarTentativa(CELULAR);
    expect(depois.tentativas).toBe(1);
    expect(depois.permitido).toBe(true);
  });

  it("esquecer uma origem nao mexe no contador de outra", async () => {
    await tentar(CELULAR, 3);
    await tentar(COMPUTADOR, 3);
    await esquecerTentativas(CELULAR);
    expect((await registrarTentativa(COMPUTADOR)).tentativas).toBe(4);
  });

  it("origem desconhecida nao zera o balde comum, nem no banco", async () => {
    banco.configurado = true;
    // Com banco configurado a contagem iria para o banco (mockado); o balde
    // comum em memoria e conferido sem banco, logo abaixo.
    await esquecerTentativas(null);
    expect(banco.limpar).not.toHaveBeenCalled();

    banco.configurado = false;
    await tentar(null, 3);
    await esquecerTentativas(null);
    expect((await registrarTentativa(null)).tentativas).toBe(4);
  });

  it("com banco, limpa o contador do banco daquela origem", async () => {
    banco.configurado = true;
    await esquecerTentativas(CELULAR);
    expect(banco.limpar).toHaveBeenCalledWith(CELULAR);
  });
});
