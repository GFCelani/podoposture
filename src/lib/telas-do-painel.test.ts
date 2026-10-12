import { describe, expect, it } from "vitest";

import { criarBilhete, idDoBilhete } from "./sessao";
import { inferirZoom, lerUserAgent, validarMedida, type MedidaDaTela } from "./telas-do-painel";

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const EDGE_WIN = `${CHROME_WIN} Edg/141.0.0.0`;
const FIREFOX_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0";

/** Full HD com o Windows em 125%, Chrome maximizado (borda de 16px na externa). */
const base: MedidaDaTela = {
  janelaL: 1536,
  janelaA: 730,
  externaL: 1552,
  externaA: 840,
  devicePixelRatio: 1.25,
  telaL: 1536,
  telaA: 864,
  telaUtilL: 1536,
  telaUtilA: 816,
};

describe("validarMedida", () => {
  it("aceita a medida do navegador e arredonda", () => {
    expect(validarMedida({ ...base, janelaL: 1536.4 })).toEqual(base);
  });

  it("recusa o que nao e numero plausivel", () => {
    expect(validarMedida(null)).toBeNull();
    expect(validarMedida({ ...base, janelaL: "1536" })).toBeNull();
    expect(validarMedida({ ...base, devicePixelRatio: Infinity })).toBeNull();
    expect(validarMedida({ ...base, janelaA: -1 })).toBeNull();
    expect(validarMedida({ ...base, telaL: 1e9 })).toBeNull();
    expect(validarMedida({ ...base, janelaL: 0 })).toBeNull();
  });
});

describe("inferirZoom", () => {
  it("Windows 125%, zoom 100%", () => {
    expect(inferirZoom(base, CHROME_WIN)).toMatchObject({ zoom: 100, escalaDoSistema: 125 });
  });

  it("Windows 125% com o Chrome em 125% (janela de 1229)", () => {
    const m = { ...base, janelaL: 1229, janelaA: 554, devicePixelRatio: 1.5625 };
    expect(inferirZoom(m, CHROME_WIN)).toMatchObject({ zoom: 125, escalaDoSistema: 125 });
  });

  it("Windows 150%, zoom 100% (janela de 1280)", () => {
    const m = { ...base, janelaL: 1280, externaL: 1296, devicePixelRatio: 1.5 };
    expect(inferirZoom(m, EDGE_WIN)).toMatchObject({ zoom: 100, escalaDoSistema: 150 });
  });

  it("Windows 125% com o Chrome em 110%", () => {
    const m = { ...base, janelaL: 1396, devicePixelRatio: 1.375 };
    expect(inferirZoom(m, CHROME_WIN)).toMatchObject({ zoom: 110, escalaDoSistema: 125 });
  });

  it("fora do Chrome e do Edge, sem palpite", () => {
    expect(inferirZoom(base, FIREFOX_WIN)).toMatchObject({ zoom: null, escalaDoSistema: null });
  });
});

describe("lerUserAgent", () => {
  it("le navegador e sistema", () => {
    expect(lerUserAgent(CHROME_WIN)).toEqual({ navegador: "Chrome 141", sistema: "Windows 10 ou 11" });
    expect(lerUserAgent(EDGE_WIN)).toEqual({ navegador: "Edge 141", sistema: "Windows 10 ou 11" });
    expect(lerUserAgent(FIREFOX_WIN)).toEqual({ navegador: "Firefox 143", sistema: "Windows 10 ou 11" });
  });
});

describe("idDoBilhete", () => {
  it("le o id do bilhete que o servidor acabou de assinar", () => {
    const bilhete = criarBilhete("x".repeat(40));
    expect(idDoBilhete(bilhete)).toMatch(/^[\w-]{12}$/);
    expect(idDoBilhete("lixo")).toBeNull();
  });
});
