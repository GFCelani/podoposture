import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { DESCRITORES } from "./conteudo-tipos";
import { larguraDaLinha, linhaCabeNoTopo } from "./largura-do-titulo";

/**
 * A tabela de larguras e a regra do titulo do topo.
 *
 * O que este teste protege: contar caracteres nao diz se a linha cabe. As
 * medidas de referencia vieram do navegador, com a fonte que o site serve (ver
 * o cabecalho de largura-do-titulo.ts).
 */

const campo = DESCRITORES.hero.campos.tituloLinhas;
if (campo.tipo !== "linhas" || !campo.medidaNaTela) {
  throw new Error("o descritor do titulo perdeu a medida na tela");
}
const { referencia, folga } = campo.medidaNaTela;
const CORPO = 64;

/** A largura em pixels no corpo em que a linha foi medida. */
function emPixels(texto: string): number {
  return (larguraDaLinha(texto) / 1000) * CORPO;
}

describe("largura de uma linha do titulo", () => {
  it("le a largura de cada letra: o M e mais de tres vezes o l", () => {
    expect(larguraDaLinha("M")).toBeGreaterThan(larguraDaLinha("l") * 3);
  });

  it("bate com o que foi medido no navegador para as quatro linhas de hoje", () => {
    // hero.tsx anota 615,3 / 517,7 / 413,3 / 478,7 px a 64px. A soma erra por
    // ate 1,7%, que e o kerning que o site aplica e esta conta nao.
    const anotadas = [615.3, 517.7, 413.3, 478.7];
    CONTEUDO_PADRAO.hero.tituloLinhas.forEach((linha, i) => {
      expect(emPixels(linha), linha).toBeGreaterThan(anotadas[i] * 0.98);
      expect(emPixels(linha), linha).toBeLessThan(anotadas[i] * 1.02);
    });
  });

  it("caractere fora da tabela conta como o mais largo, para a duvida recusar", () => {
    // "漢" nao esta na tabela; vale o "M".
    expect(larguraDaLinha("漢")).toBe(larguraDaLinha("M"));
  });

  it("linha vazia nao tem largura negativa por causa do tracking", () => {
    expect(larguraDaLinha("")).toBe(0);
    expect(larguraDaLinha(" ")).toBeGreaterThanOrEqual(0);
  });
});

describe("a linha cabe ao lado das figuras?", () => {
  it("as quatro linhas do titulo de hoje cabem", () => {
    for (const linha of CONTEUDO_PADRAO.hero.tituloLinhas) {
      expect(linhaCabeNoTopo(linha, referencia, folga), linha).toBe(true);
    }
  });

  it("a propria referencia cabe, com a folga sobrando", () => {
    expect(linhaCabeNoTopo(referencia, referencia, folga)).toBe(true);
  });

  it("22 letras largas nao cabem, e 22 estreitas cabem", () => {
    // O caso medido no navegador: 22 caracteres passam no teto de caracteres e
    // invadem as figuras em 274 px a 1280.
    expect(linhaCabeNoTopo("M".repeat(22), referencia, folga)).toBe(false);
    expect(linhaCabeNoTopo("W".repeat(22), referencia, folga)).toBe(false);
    expect(linhaCabeNoTopo("MWG".repeat(7) + "M", referencia, folga)).toBe(false);
    expect(linhaCabeNoTopo("l".repeat(22), referencia, folga)).toBe(true);
  });
});
