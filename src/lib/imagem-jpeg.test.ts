import { describe, expect, it } from "vitest";

import { dimensoesDoJpeg } from "./imagem-jpeg";

/**
 * Os JPEG sao montados a mao, segmento a segmento, a partir da norma (ITU
 * T.81, anexo B). Mesmo motivo do teste de WebP: o que se testa e a leitura da
 * fila de segmentos, entao o teste produz os segmentos sem biblioteca nenhuma.
 */

/** Marcador + tamanho (que conta os proprios 2 bytes) + corpo. */
function segmento(marcador: number, corpo: number[]): number[] {
  const tamanho = corpo.length + 2;
  return [0xff, marcador, tamanho >> 8, tamanho & 0xff, ...corpo];
}

/** Inicio de quadro: precisao, altura, largura e 3 bytes por componente. */
function quadro(marcador: number, largura: number, altura: number, componentes = 3, precisao = 8) {
  const corpo = [precisao, altura >> 8, altura & 0xff, largura >> 8, largura & 0xff, componentes];
  for (let c = 0; c < componentes; c += 1) corpo.push(c + 1, 0x11, 0);
  return segmento(marcador, corpo);
}

const JFIF = segmento(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const TABELA_DE_QUANTIZACAO = segmento(0xdb, [0, ...new Array(64).fill(1)]);
const TABELA_DE_HUFFMAN = segmento(0xc4, [0, ...new Array(16).fill(0)]);
const INICIO_DO_DADO = segmento(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0]);

/** SOI + segmentos + um pouco de dado comprimido + EOI. */
function jpeg(segmentos: number[][]): Uint8Array {
  return Uint8Array.from([0xff, 0xd8, ...segmentos.flat(), 0x12, 0x34, 0x56, 0xff, 0xd9]);
}

function foto(largura: number, altura: number, marcador = 0xc0, componentes = 3): Uint8Array {
  return jpeg([
    JFIF,
    TABELA_DE_QUANTIZACAO,
    quadro(marcador, largura, altura, componentes),
    TABELA_DE_HUFFMAN,
    INICIO_DO_DADO,
  ]);
}

describe("dimensoesDoJpeg", () => {
  it("le JPEG baseline — o que o canvas do Safari gera", () => {
    expect(dimensoesDoJpeg(foto(1600, 1067))).toEqual({ largura: 1600, altura: 1067 });
  });

  it("le JPEG progressivo", () => {
    expect(dimensoesDoJpeg(foto(1200, 800, 0xc2))).toEqual({ largura: 1200, altura: 800 });
  });

  it("le JPEG em tons de cinza", () => {
    expect(dimensoesDoJpeg(foto(640, 480, 0xc0, 1))).toEqual({ largura: 640, altura: 480 });
  });

  it("aceita bytes FF de preenchimento antes de um marcador", () => {
    const bytes = jpeg([
      JFIF,
      [0xff, 0xff, ...quadro(0xc0, 300, 200)],
      TABELA_DE_HUFFMAN,
      INICIO_DO_DADO,
    ]);
    expect(dimensoesDoJpeg(bytes)).toEqual({ largura: 300, altura: 200 });
  });

  it("aceita ate o teto e recusa um pixel acima", () => {
    expect(dimensoesDoJpeg(foto(8192, 1))).toEqual({ largura: 8192, altura: 1 });
    expect(dimensoesDoJpeg(foto(1, 8192))).toEqual({ largura: 1, altura: 8192 });
    expect(dimensoesDoJpeg(foto(8193, 1))).toBeNull();
    expect(dimensoesDoJpeg(foto(1, 8193))).toBeNull();
  });

  it.each([
    ["vazio", new Uint8Array(0)],
    ["curto demais", Uint8Array.from([0xff, 0xd8, 0xff])],
    ["nao comeca com SOI", (() => { const b = foto(10, 10); b[1] = 0xd9; return b; })()],
    ["cortado antes do EOI", foto(10, 10).slice(0, -1)],
    ["sem quadro antes do dado", jpeg([JFIF, TABELA_DE_HUFFMAN, INICIO_DO_DADO])],
    ["sem inicio de dado", jpeg([JFIF, quadro(0xc0, 10, 10)])],
    ["sem perdas (SOF3)", foto(10, 10, 0xc3)],
    ["sequencial estendido (SOF1)", foto(10, 10, 0xc1)],
    ["aritmetico (SOF9)", foto(10, 10, 0xc9)],
    ["CMYK, 4 componentes", foto(10, 10, 0xc0, 4)],
    ["precisao de 12 bits", jpeg([segmento(0xc0, [12, 0, 10, 0, 10, 1, 1, 0x11, 0]), INICIO_DO_DADO])],
    ["altura zero", foto(10, 0)],
    ["largura zero", foto(0, 10)],
    ["tamanho do quadro nao fecha com os componentes", jpeg([segmento(0xc0, [8, 0, 10, 0, 10, 3, 1, 0x11, 0]), INICIO_DO_DADO])],
    ["dois quadros", jpeg([quadro(0xc0, 10, 10), quadro(0xc0, 20, 20), INICIO_DO_DADO])],
    ["segmento maior que o arquivo", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x7f, 0xff, 0xff, 0xd9])],
    ["tamanho de segmento menor que 2", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0xff, 0xd9])],
    ["byte solto onde deveria haver marcador", jpeg([JFIF, [0x00], quadro(0xc0, 10, 10), INICIO_DO_DADO])],
    ["SOI repetido", jpeg([[0xff, 0xd8], quadro(0xc0, 10, 10), INICIO_DO_DADO])],
    ["assinatura de PNG", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xd9])],
  ])("recusa: %s", (_nome, bytes) => {
    expect(dimensoesDoJpeg(bytes)).toBeNull();
  });

  it("nunca lanca, seja qual for o lixo", () => {
    for (const tamanho of [0, 1, 2, 3, 4, 5, 9, 17, 64]) {
      const cheio = new Uint8Array(tamanho).fill(0xff);
      expect(() => dimensoesDoJpeg(cheio)).not.toThrow();
      const comSoi = Uint8Array.from([0xff, 0xd8, ...new Array(tamanho).fill(0xff), 0xff, 0xd9]);
      expect(() => dimensoesDoJpeg(comSoi)).not.toThrow();
    }
    // Um JPEG valido cortado em cada ponto possivel.
    const inteiro = foto(640, 480);
    for (let corte = 0; corte < inteiro.length; corte += 1) {
      expect(() => dimensoesDoJpeg(inteiro.slice(0, corte))).not.toThrow();
    }
  });
});
