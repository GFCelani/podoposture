import { beforeEach, describe, expect, it, vi } from "vitest";

// O banco fica de fora: o que se testa aqui e a regra de quem conta e quem e
// esquecido. O banco de verdade entra so para confirmar que a limpeza chega
// nele com a origem certa.
const banco = vi.hoisted(() => ({
  configurado: false,
  limpar: vi.fn<(chave: string) => Promise<void>>(async () => {}),
  contar: vi.fn<(chave: string, janela: number) => Promise<{ daChave: number; todas: number }>>(async () => ({
    daChave: 1,
    todas: 1,
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("./painel-db", () => ({
  bancoConfigurado: () => banco.configurado,
  contarERegistrarTentativa: banco.contar,
  limparTentativas: banco.limpar,
}));

import {
  LIMITE_POR_ORIGEM,
  _limparMemoria,
  chaveDaOrigem,
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
  banco.contar.mockClear();
});

describe("chaveDaOrigem", () => {
  it("IPv4 conta pelo endereco; IPv6 conta pelo /64", () => {
    expect(chaveDaOrigem("203.0.113.7")).toBe("203.0.113.7");
    expect(chaveDaOrigem("2001:db8:1:2::a")).toBe("2001:db8:1:2::/64");
    expect(chaveDaOrigem("2001:0db8:0001:0002:ffff:0:0:1")).toBe("2001:db8:1:2::/64");
    expect(chaveDaOrigem("[2001:DB8:1:2::1]")).toBe("2001:db8:1:2::/64");
    expect(chaveDaOrigem("2001:db8:1:3::a")).toBe("2001:db8:1:3::/64");
    expect(chaveDaOrigem("::ffff:198.51.100.4")).toBe("198.51.100.4");
    expect(chaveDaOrigem("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });
});

describe("registrarTentativa", () => {
  it("trocar de endereco dentro do mesmo /64 nao zera o limite", async () => {
    for (let i = 1; i <= LIMITE_POR_ORIGEM; i += 1) {
      expect((await registrarTentativa(`2001:db8:1:2::${i.toString(16)}`)).permitido).toBe(true);
    }
    expect((await registrarTentativa("2001:db8:1:2:ffff::1")).permitido).toBe(false);
    expect((await registrarTentativa("2001:db8:1:3::1")).permitido).toBe(true);
  });

  it("quem ja estourou o limite nesta instancia e recusado sem escrever no banco", async () => {
    await tentar(CELULAR, LIMITE_POR_ORIGEM);
    banco.configurado = true;
    const veredicto = await registrarTentativa(CELULAR);
    expect(veredicto.permitido).toBe(false);
    expect(banco.contar).not.toHaveBeenCalled();
  });

  it("com banco, vale o maior entre o banco e a memoria, e o banco recebe a chave do /64", async () => {
    banco.configurado = true;
    banco.contar.mockResolvedValueOnce({ daChave: LIMITE_POR_ORIGEM + 1, todas: 20 });
    expect((await registrarTentativa("2001:db8:1:2::9")).permitido).toBe(false);
    expect(banco.contar).toHaveBeenCalledWith("2001:db8:1:2::/64", expect.any(Number));
  });
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
