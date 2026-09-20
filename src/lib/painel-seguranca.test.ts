import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { conferirSenha, gerarHash } from "./senha";
import { criarBilhete, DURACAO_MS, ehLocalhost, lerBilhete, opcoesDoCookie } from "./sessao";

const SEGREDO = "x".repeat(48);

describe("senha", () => {
  it("aceita a senha certa e recusa a errada", async () => {
    const hash = await gerarHash("uma senha bem comprida");
    expect(await conferirSenha("uma senha bem comprida", hash)).toBe(true);
    expect(await conferirSenha("uma senha bem comprid", hash)).toBe(false);
    expect(await conferirSenha("", hash)).toBe(false);
  });

  it("o mesmo texto gera resumos diferentes — o sal e por senha", async () => {
    const a = await gerarHash("mesma senha aqui");
    const b = await gerarHash("mesma senha aqui");
    expect(a).not.toBe(b);
    expect(await conferirSenha("mesma senha aqui", a)).toBe(true);
    expect(await conferirSenha("mesma senha aqui", b)).toBe(true);
  });

  it("normaliza formas Unicode equivalentes", async () => {
    // "á" composto e "á" decomposto sao a mesma senha para quem digita
    const hash = await gerarHash("senha com acentuação");
    expect(await conferirSenha("senha com acentuação".normalize("NFD"), hash)).toBe(true);
  });

  it.each([
    ["vazio", ""],
    ["sem prefixo", "1.2.3.4.5.6"],
    ["poucos campos", "scrypt.32768.8.1.abc"],
    ["N nao numerico", "scrypt.abc.8.1.YWJj.YWJj"],
    ["N absurdo", "scrypt.99999999.8.1.YWJj.YWJj"],
    ["p absurdo", "scrypt.32768.8.999.YWJj.YWJj"],
    ["r absurdo", "scrypt.32768.999.1.YWJj.YWJj"],
    ["sal vazio", "scrypt.32768.8.1..YWJj"],
  ])("resumo corrompido nunca vira porta aberta: %s", async (_caso, guardado) => {
    expect(await conferirSenha("qualquer coisa", guardado)).toBe(false);
  });
});

describe("sessao", () => {
  it("bilhete recem-criado e valido", () => {
    const b = criarBilhete(SEGREDO);
    expect(lerBilhete(b, SEGREDO)).not.toBeNull();
  });

  it("dois bilhetes do mesmo instante saem diferentes", () => {
    const agora = 1_700_000_000_000;
    expect(criarBilhete(SEGREDO, agora)).not.toBe(criarBilhete(SEGREDO, agora));
  });

  it.each([
    ["sem bilhete", undefined],
    ["vazio", ""],
    ["sem ponto", "abcdef"],
    ["ponto no inicio", ".abc"],
    ["assinatura trocada", `${criarBilhete(SEGREDO).split(".")[0]}.assinaturaFalsa`],
  ])("recusa: %s", (_caso, bilhete) => {
    expect(lerBilhete(bilhete as string | undefined, SEGREDO)).toBeNull();
  });

  it("recusa bilhete assinado com outro segredo", () => {
    const b = criarBilhete("y".repeat(48));
    expect(lerBilhete(b, SEGREDO)).toBeNull();
  });

  it("recusa bilhete vencido", () => {
    const agora = 1_700_000_000_000;
    const b = criarBilhete(SEGREDO, agora);
    expect(lerBilhete(b, SEGREDO, agora + DURACAO_MS + 1)).toBeNull();
  });

  it("recusa bilhete que tenta valer mais do que o permitido", () => {
    // Forja um bilhete com prazo esticado, como quem tivesse o segredo antigo
    const carga = { v: "1", criadaEm: 0, expiraEm: DURACAO_MS * 10, id: "x" };
    const dados = Buffer.from(JSON.stringify(carga)).toString("base64url");
    const assinatura = createHmac("sha256", SEGREDO).update(dados).digest("base64url");
    expect(lerBilhete(`${dados}.${assinatura}`, SEGREDO, 1)).toBeNull();
  });

  it("sem segredo, nenhum bilhete vale", () => {
    expect(lerBilhete(criarBilhete(SEGREDO), null)).toBeNull();
  });
});

describe("cookie", () => {
  it("exige HTTPS fora de localhost", () => {
    expect(opcoesDoCookie(false).secure).toBe(true);
    expect(opcoesDoCookie(true).secure).toBe(false);
  });

  it("nunca e legivel por script e nunca viaja para outro site", () => {
    const o = opcoesDoCookie(false);
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("strict");
  });

  it.each([
    ["localhost:3000", true],
    ["127.0.0.1:4800", true],
    ["podoposture.com.br", false],
    ["podoposture-tau.vercel.app", false],
    ["localhost.evil.com", false],
    ["[::1]:3000", true],
    ["[2001:db8::10]", false],
    ["[2001:db8::10]:443", false],
    [null, false],
  ])("ehLocalhost(%s) = %s", (host, esperado) => {
    expect(ehLocalhost(host as string | null)).toBe(esperado);
  });
});
