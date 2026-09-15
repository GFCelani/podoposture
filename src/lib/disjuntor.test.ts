import { describe, expect, it, vi } from "vitest";

import { BancoEmPausa, PrazoEsgotado, comPrazo, conexaoCaida, criarDisjuntor, emConstrucao } from "./disjuntor";

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

  it("na pausa, N sondagens tocam o banco uma vez so", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora });
    await expect(disjuntor.ler(() => Promise.reject(erroCom("CONNECT_TIMEOUT")))).rejects.toBeTruthy();

    // Uma leitura que nunca responde durante o teste: as outras chegam com a
    // sondagem ainda esperando o banco.
    let responder: (erro: unknown) => void = () => {};
    const leitura = vi.fn(
      () => new Promise<never>((_, rejeitar) => { responder = rejeitar; }),
    );
    const primeira = disjuntor.sondar(leitura);
    const outras = Array.from({ length: 5 }, () => disjuntor.sondar(leitura));
    for (const outra of outras) await expect(outra).rejects.toBeInstanceOf(BancoEmPausa);
    responder(erroCom("CONNECT_TIMEOUT"));
    await expect(primeira).rejects.toMatchObject({ code: "CONNECT_TIMEOUT" });
    expect(leitura).toHaveBeenCalledTimes(1);

    // A sondagem que falhou recomeca a pausa ja sondada: nada de outra tentativa.
    r.andar(5_000);
    await expect(disjuntor.sondar(leitura)).rejects.toBeInstanceOf(BancoEmPausa);
    expect(leitura).toHaveBeenCalledTimes(1);
    expect(disjuntor.emPausa()).toBe(true);
  });

  it("sondagem que acerta fecha o disjuntor para todas as leituras", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora });
    await expect(disjuntor.ler(() => Promise.reject(erroCom("ECONNREFUSED")))).rejects.toBeTruthy();
    expect(disjuntor.emPausa()).toBe(true);

    await expect(disjuntor.sondar(() => Promise.resolve("post"))).resolves.toBe("post");
    expect(disjuntor.emPausa()).toBe(false);
    // A home e o indice, que usam `ler`, voltam ao banco na hora.
    await expect(disjuntor.ler(() => Promise.resolve("home"))).resolves.toBe("home");

    // E uma falha nova abre outra janela, com direito a sua propria sondagem.
    await expect(disjuntor.ler(() => Promise.reject(erroCom("ECONNREFUSED")))).rejects.toBeTruthy();
    const leitura = vi.fn().mockResolvedValue(2);
    await expect(disjuntor.sondar(leitura)).resolves.toBe(2);
    expect(leitura).toHaveBeenCalledTimes(1);
  });

  it("banco travado: leitura que nunca volta estoura o prazo, abre a pausa e as seguintes nem esperam", async () => {
    const r = relogio();
    const disjuntor = criarDisjuntor({ pausaMs: () => 15_000, agora: r.agora, prazoMs: 30 });
    const travada = vi.fn(() => new Promise<never>(() => {}));
    await expect(disjuntor.ler(travada)).rejects.toBeInstanceOf(PrazoEsgotado);
    // Sem segunda tentativa: esperar o prazo de novo so dobraria a fila.
    expect(travada).toHaveBeenCalledTimes(1);
    expect(disjuntor.emPausa()).toBe(true);
    await expect(disjuntor.ler(travada)).rejects.toBeInstanceOf(BancoEmPausa);

    // A sondagem da pausa tambem tem prazo.
    await expect(disjuntor.sondar(travada)).rejects.toBeInstanceOf(PrazoEsgotado);
    expect(travada).toHaveBeenCalledTimes(2);
  });

  it("comPrazo devolve o valor que chega a tempo", async () => {
    await expect(comPrazo(Promise.resolve(7), 1_000)).resolves.toBe(7);
    await expect(comPrazo(new Promise<never>(() => {}), 10)).rejects.toBeInstanceOf(PrazoEsgotado);
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
