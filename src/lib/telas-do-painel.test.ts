import { describe, expect, it } from "vitest";

import { criarBilhete, idDoBilhete } from "./sessao";
import {
  NAO_MEDIDO,
  inferirZoom,
  lerMedida,
  lerUserAgent,
  textoDaSituacao,
  textoDaVersao,
  textoDoNumero,
  textoDoPalpite,
  textoDoPar,
  type MedidaDaTela,
} from "./telas-do-painel";

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

const vazia = {
  janelaL: null,
  janelaA: null,
  externaL: null,
  externaA: null,
  devicePixelRatio: null,
  telaL: null,
  telaA: null,
  telaUtilL: null,
  telaUtilA: null,
};

describe("lerMedida", () => {
  it("completa: aceita a medida do navegador e arredonda", () => {
    expect(lerMedida({ ...base, janelaL: 1536.4, devicePixelRatio: 1.250004 })).toEqual({ medida: base, situacao: "completa" });
  });

  it("parcial: o campo que nao e numero plausivel fica vazio, os outros ficam", () => {
    const casos: [string, unknown][] = [
      ["janelaL", "1536"],
      ["devicePixelRatio", Infinity],
      ["janelaA", -1],
      ["telaL", 1e9],
      ["janelaL", 0],
      ["devicePixelRatio", 0],
      ["externaA", undefined],
    ];
    for (const [campo, valor] of casos) {
      const { medida, situacao } = lerMedida({ ...base, [campo]: valor });
      expect(situacao, campo).toBe("parcial");
      expect(medida, campo).toEqual({ ...base, [campo]: null });
    }
    // Zero vale fora da janela e da densidade (ex.: tela util sem barra).
    expect(lerMedida({ ...base, telaUtilA: 0 })).toEqual({ medida: { ...base, telaUtilA: 0 }, situacao: "completa" });
  });

  it("ausente: sem medida, ou nenhum campo aproveitavel", () => {
    for (const bruto of [undefined, null, "1536x730", [1536, 730], 42, {}, { janelaL: "x", janelaA: -5 }]) {
      expect(lerMedida(bruto)).toEqual({ medida: vazia, situacao: "ausente" });
    }
  });
});

describe("textos das celulas", () => {
  it("campo vazio aparece como 'nao medido', nunca como x solto ou branco", () => {
    expect(textoDoPar(1536, 730)).toBe("1536×730");
    expect(textoDoPar(null, 730)).toBe(NAO_MEDIDO);
    expect(textoDoPar(1536, null)).toBe(NAO_MEDIDO);
    expect(textoDoNumero(1.25)).toBe("1.25");
    expect(textoDoNumero(null)).toBe(NAO_MEDIDO);
    expect(textoDoNumero(0)).toBe("0");
  });

  it("zoom: palpite, '?' fora do Chrome, 'nao medido' sem a medida", () => {
    expect(textoDoPalpite(125, true)).toBe("125%");
    expect(textoDoPalpite(null, true)).toBe("?");
    expect(textoDoPalpite(null, false)).toBe(NAO_MEDIDO);
  });

  it("situacao e versao", () => {
    expect(textoDaSituacao("completa")).toBe("completa");
    expect(textoDaSituacao("parcial")).toBe("parcial");
    expect(textoDaSituacao("ausente")).toBe("não enviada (painel antigo)");
    expect(textoDaVersao("2de2103abcde")).toBe("2de2103abcde");
    expect(textoDaVersao("")).toBe("anterior ao registro");
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

  it("medida parcial: sem janela, sem palpite; sem DPR, zoom sem escala", () => {
    expect(inferirZoom({ ...base, janelaL: null }, CHROME_WIN)).toMatchObject({ zoom: null, escalaDoSistema: null, razao: 0 });
    expect(inferirZoom({ ...base, devicePixelRatio: null }, CHROME_WIN)).toMatchObject({ zoom: 100, escalaDoSistema: null });
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
