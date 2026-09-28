import { LADO_MAXIMO, type Dimensoes } from "./imagem-webp";

/**
 * Le largura e altura de um PNG direto dos bytes, sem nenhuma dependencia.
 *
 * Por que isto existe: logotipo e icone precisam de fundo transparente, e o
 * Safari nao gera WebP num canvas. Para foto, a saida dele e JPEG com fundo
 * branco; para logo, isso poria um retangulo branco no rodape azul. Nesses
 * campos o painel manda PNG quando o navegador nao entrega WebP, e o servidor
 * mede PNG com o mesmo rigor dos outros dois formatos: as medidas viram parte
 * do endereco publico.
 *
 * PNG e assinatura de 8 bytes e uma fila de blocos (tamanho, tipo, dado, CRC).
 * O primeiro bloco e o IHDR, com as medidas; o ultimo e o IEND, vazio.
 * Formato: https://www.w3.org/TR/png-3/
 */

const ASSINATURA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Teto da soma dos blocos que nao sao imagem (texto, perfil de cor, tempo...).
 * O canvas do navegador escreve poucos bytes disso; sem teto, um bloco `tEXt`
 * de 3 MB passava, e o arquivo virava deposito de qualquer coisa.
 */
export const TETO_DOS_BLOCOS_EXTRAS = 64 * 1024;

/** Os blocos que desenham a imagem; o resto conta no teto acima. */
const BLOCOS_DA_IMAGEM = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);

function lerUInt32BE(bytes: Uint8Array, i: number): number {
  return ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
}

function tipoDoBloco(bytes: Uint8Array, i: number): string | null {
  let tipo = "";
  for (let k = 0; k < 4; k += 1) {
    const c = bytes[i + k];
    // So letras ASCII: e o que a norma permite no nome do bloco.
    if (!((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a))) return null;
    tipo += String.fromCharCode(c);
  }
  return tipo;
}

/** Combinacoes legais de profundidade por tipo de cor (tabela 11.1 da norma). */
const PROFUNDIDADES: Record<number, readonly number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

/**
 * Devolve as dimensoes, ou `null` se os bytes nao forem um PNG aceitavel.
 *
 * Nunca lanca. A fila inteira e percorrida, e o arquivo precisa terminar
 * exatamente no IEND: sem isso, `PNG + IHDR + qualquer coisa` ate o teto seria
 * guardado, que e armazenamento arbitrario para quem tem a senha (o mesmo
 * cuidado do tamanho declarado no RIFF do WebP); pelo mesmo motivo os blocos
 * que nao desenham a imagem somam no maximo TETO_DOS_BLOCOS_EXTRAS. O que o
 * IDAT carrega so se sabe decodificando, e ai a barreira e a de sempre: sessao
 * e teto de 3 MB. PNG animado (acTL) fica de fora: icone e logo piscando nao
 * sao o que o campo pede.
 */
export function dimensoesDoPng(bytes: Uint8Array): Dimensoes | null {
  if (bytes.length < 8 + 25 + 12) return null;
  for (let k = 0; k < ASSINATURA.length; k += 1) if (bytes[k] !== ASSINATURA[k]) return null;

  let medida: Dimensoes | null = null;
  let temDado = false;
  let extras = 0;
  let i = 8;

  while (i + 12 <= bytes.length) {
    const tamanho = lerUInt32BE(bytes, i);
    const tipo = tipoDoBloco(bytes, i + 4);
    if (tipo === null) return null;
    const fim = i + 12 + tamanho;
    if (tamanho > 0x7fffffff || fim > bytes.length) return null;
    if (!BLOCOS_DA_IMAGEM.has(tipo)) {
      extras += tamanho;
      if (extras > TETO_DOS_BLOCOS_EXTRAS) return null;
    }

    if (medida === null) {
      // O IHDR tem de ser o primeiro bloco, com 13 bytes.
      if (tipo !== "IHDR" || tamanho !== 13) return null;
      const largura = lerUInt32BE(bytes, i + 8);
      const altura = lerUInt32BE(bytes, i + 12);
      const profundidade = bytes[i + 16];
      const cor = bytes[i + 17];
      const compressao = bytes[i + 18];
      const filtro = bytes[i + 19];
      const entrelacado = bytes[i + 20];
      if (!PROFUNDIDADES[cor]?.includes(profundidade)) return null;
      if (compressao !== 0 || filtro !== 0 || (entrelacado !== 0 && entrelacado !== 1)) return null;
      if (largura < 1 || altura < 1 || largura > LADO_MAXIMO || altura > LADO_MAXIMO) return null;
      medida = { largura, altura };
    } else if (tipo === "IHDR" || tipo === "acTL") {
      return null;
    } else if (tipo === "IDAT") {
      temDado = true;
    } else if (tipo === "IEND") {
      // Fim da fila: vazio, com dado antes, e o arquivo acaba aqui.
      return tamanho === 0 && temDado && fim === bytes.length ? medida : null;
    }

    i = fim;
  }

  return null;
}
