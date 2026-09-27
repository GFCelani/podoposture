import { describe, expect, it } from "vitest";

import { caracteresAoLado, repartirAoLado } from "./lado-a-lado";
import { dividirEmSecoes } from "./secoes";

const p = (n: number, letra = "a") => `<p>${letra.repeat(n)}</p>`;

describe("caracteresAoLado", () => {
  it("pede mais texto para capa alta do que para capa larga", () => {
    expect(caracteresAoLado(9 / 16)).toBeGreaterThan(caracteresAoLado(1));
    expect(caracteresAoLado(1)).toBeGreaterThan(caracteresAoLado(3 / 2));
  });

  it("tem teto: a capa nunca passa da altura maxima", () => {
    expect(caracteresAoLado(0.1)).toBe(caracteresAoLado(0.5));
  });
});

describe("repartirAoLado", () => {
  it("corta a abertura entre dois paragrafos, depois de atingir a conta", () => {
    const doc = dividirEmSecoes(p(300) + p(300) + p(300) + p(300));
    const r = repartirAoLado(doc, 500);
    expect(r.aberturaAoLado).toBe(p(300) + p(300));
    expect(r.aberturaAbaixo).toBe(p(300) + p(300));
    expect(r.secoesAoLado).toBe(0);
  });

  it("nunca separa uma lista do paragrafo que a precede", () => {
    const doc = dividirEmSecoes(p(600) + "<ul><li>um</li></ul>" + p(10));
    const r = repartirAoLado(doc, 100);
    expect(r.aberturaAoLado).toBe(p(600) + "<ul><li>um</li></ul>" + p(10));
    expect(r.aberturaAbaixo).toBe("");
  });

  it("nunca separa um rotulo em negrito do que ele abre", () => {
    const doc = dividirEmSecoes(p(600) + "<p><strong>Rotulo</strong></p>" + p(50) + p(50));
    const r = repartirAoLado(doc, 100);
    // corta antes do rotulo, e nao entre ele e o paragrafo que ele abre
    expect(r.aberturaAoLado).toBe(p(600));
    expect(r.aberturaAbaixo).toBe("<p><strong>Rotulo</strong></p>" + p(50) + p(50));
  });

  it("abertura curta: leva secoes inteiras ate cobrir a conta", () => {
    const html = p(100) + "<h2>Um</h2>" + p(300) + "<h2>Dois</h2>" + p(300) + "<h2>Tres</h2>" + p(300);
    const r = repartirAoLado(dividirEmSecoes(html), 500);
    expect(r.aberturaAoLado).toBe(p(100));
    expect(r.aberturaAbaixo).toBe("");
    expect(r.secoesAoLado).toBe(2);
  });
});
