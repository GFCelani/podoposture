import { describe, expect, it } from "vitest";

import { dimensoesDoWebp, lerNomeDoArquivo, nomeDoArquivo } from "./imagem-webp";

/**
 * Os tres sabores de WebP sao montados a mao, byte a byte, a partir da
 * especificacao do contentor RIFF. E de proposito: o que esta sendo testado e a
 * leitura do cabecalho, entao o teste precisa produzir o cabecalho sem usar a
 * mesma biblioteca que leria.
 */

function base(fourcc: string, tamanho = 64): Uint8Array {
  const b = new Uint8Array(tamanho);
  const escrever = (texto: string, em: number) => {
    for (let i = 0; i < texto.length; i += 1) b[em + i] = texto.charCodeAt(i);
  };
  escrever("RIFF", 0);
  // Tamanho declarado do RIFF = arquivo menos os 8 bytes do proprio cabecalho.
  // Estava faltando aqui, e por isso estas amostras nem eram WebP validos.
  const declarado = tamanho - 8;
  b[4] = declarado & 0xff;
  b[5] = (declarado >>> 8) & 0xff;
  b[6] = (declarado >>> 16) & 0xff;
  b[7] = (declarado >>> 24) & 0xff;
  escrever("WEBP", 8);
  escrever(fourcc, 12);
  return b;
}

/** Um WebP cujo cabecalho mente sobre o tamanho do arquivo. */
function tamanhoMentiroso(): Uint8Array {
  const b = vp8(100, 100);
  b[4] = 0x10; // declara bem menos do que o arquivo tem
  return b;
}

/** Com perdas: marca 0x9D 0x01 0x2A e duas medidas de 14 bits. */
function vp8(largura: number, altura: number): Uint8Array {
  const b = base("VP8 ");
  b[23] = 0x9d;
  b[24] = 0x01;
  b[25] = 0x2a;
  b[26] = largura & 0xff;
  b[27] = (largura >> 8) & 0x3f;
  b[28] = altura & 0xff;
  b[29] = (altura >> 8) & 0x3f;
  return b;
}

/** Sem perdas: assinatura 0x2F e um campo de 32 bits com as medidas menos um. */
function vp8l(largura: number, altura: number): Uint8Array {
  const b = base("VP8L");
  b[20] = 0x2f;
  const empacotado = ((largura - 1) | ((altura - 1) << 14)) >>> 0;
  b[21] = empacotado & 0xff;
  b[22] = (empacotado >>> 8) & 0xff;
  b[23] = (empacotado >>> 16) & 0xff;
  b[24] = (empacotado >>> 24) & 0xff;
  return b;
}

/** Estendido: medidas da tela em 24 bits, tambem menos um. */
function vp8x(largura: number, altura: number): Uint8Array {
  const b = base("VP8X");
  const l = largura - 1;
  const a = altura - 1;
  b[24] = l & 0xff;
  b[25] = (l >> 8) & 0xff;
  b[26] = (l >> 16) & 0xff;
  b[27] = a & 0xff;
  b[28] = (a >> 8) & 0xff;
  b[29] = (a >> 16) & 0xff;
  return b;
}

describe("dimensoesDoWebp", () => {
  it("le WebP com perdas", () => {
    expect(dimensoesDoWebp(vp8(1200, 800))).toEqual({ largura: 1200, altura: 800 });
  });

  it("le WebP sem perdas", () => {
    expect(dimensoesDoWebp(vp8l(640, 480))).toEqual({ largura: 640, altura: 480 });
  });

  it("le WebP estendido", () => {
    expect(dimensoesDoWebp(vp8x(1920, 1080))).toEqual({ largura: 1920, altura: 1080 });
  });

  it("aceita ate o teto e recusa um pixel acima", () => {
    // O campo do formato comporta 16383, mas o teto aqui e 8192: acima disso
    // nao e foto de blog, e o painel ja reduz para 1600 antes de enviar.
    expect(dimensoesDoWebp(vp8(8192, 1))).toEqual({ largura: 8192, altura: 1 });
    expect(dimensoesDoWebp(vp8l(1, 8192))).toEqual({ largura: 1, altura: 8192 });
    expect(dimensoesDoWebp(vp8(8193, 1))).toBeNull();
    expect(dimensoesDoWebp(vp8l(1, 8193))).toBeNull();
  });

  it.each([
    ["nao e RIFF", (() => { const b = vp8(10, 10); b[0] = 0x52 + 1; return b; })()],
    ["nao e WEBP", (() => { const b = vp8(10, 10); b[8] = 0x57 + 1; return b; })()],
    ["bloco desconhecido", base("XXXX")],
    ["curto demais", new Uint8Array(12)],
    ["vazio", new Uint8Array(0)],
    ["com perdas sem a marca", (() => { const b = vp8(10, 10); b[23] = 0; return b; })()],
    ["tamanho do RIFF nao bate com o arquivo", tamanhoMentiroso()],
    ["sem perdas sem assinatura", (() => { const b = vp8l(10, 10); b[20] = 0; return b; })()],
  ])("recusa: %s", (_nome, bytes) => {
    expect(dimensoesDoWebp(bytes)).toBeNull();
  });

  it("recusa medida zero e medida absurda", () => {
    // VP8 com os 14 bits zerados: largura 0
    expect(dimensoesDoWebp(vp8(0, 100))).toBeNull();
    // VP8X pode declarar ate 2^24; acima do teto e recusado
    expect(dimensoesDoWebp(vp8x(20000, 100))).toBeNull();
  });

  it("nunca lanca, seja qual for o lixo", () => {
    for (const tamanho of [0, 1, 13, 19, 29, 31]) {
      const lixo = new Uint8Array(tamanho).fill(0xff);
      expect(() => dimensoesDoWebp(lixo)).not.toThrow();
    }
  });
});

describe("nome publico do arquivo", () => {
  const resumo = "a".repeat(64);

  it("monta e desmonta sem perder nada", () => {
    const nome = nomeDoArquivo(resumo, { largura: 1200, altura: 800 });
    expect(nome).toBe(`${resumo}-1200x800.webp`);
    expect(lerNomeDoArquivo(nome)).toEqual({ resumo, largura: 1200, altura: 800 });
  });

  it.each([
    "arquivo.webp",
    `${resumo}.webp`,
    `${resumo}-1200x800.png`,
    `${"z".repeat(64)}-1200x800.webp`, // 'z' nao e hexadecimal
    `${resumo}-0x800.webp`,
    `${resumo}-1200x99999.webp`,
    `../${resumo}-10x10.webp`,
  ])("recusa nome fora do formato: %s", (nome) => {
    expect(lerNomeDoArquivo(nome)).toBeNull();
  });
});
