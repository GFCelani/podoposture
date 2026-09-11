import { LADO_MAXIMO, type Dimensoes } from "./imagem-webp";

/**
 * Le largura e altura de um JPEG direto dos bytes, sem nenhuma dependencia.
 *
 * Por que isto existe: o Safari nao sabe gerar WebP num canvas. Quando o painel
 * pede `image/webp`, ele devolve um PNG sem avisar, e o servidor — que so
 * aceitava WebP — recusava. Resultado: capa e foto de post nao subiam de iPhone
 * nem de Mac. O painel agora cai para JPEG quando o navegador nao entrega WebP,
 * e o servidor precisa medir JPEG com o mesmo rigor com que mede WebP, pelo
 * mesmo motivo: as medidas viram parte do endereco publico.
 *
 * JPEG nao tem cabecalho fixo como o RIFF. E uma fila de segmentos, cada um
 * aberto por `FF xx` e, quase todos, seguido do proprio tamanho. As medidas
 * moram no segmento SOF (inicio de quadro). O leitor percorre a fila ate o
 * inicio do dado comprimido (SOS) conferindo que cada tamanho cabe no arquivo.
 * Formato: ITU T.81, anexo B — https://www.w3.org/Graphics/JPEG/itu-t81.pdf
 */

/**
 * SOF0 (baseline) e SOF2 (progressivo): os dois que canvas, celular e camera
 * geram, e os unicos que todo navegador exibe. Os outros SOF (sem perdas,
 * aritmetico, hierarquico) sao legais pela norma, mas ninguem os gera para
 * foto de site e varios navegadores nao os mostram: aceitar seria guardar uma
 * imagem que aparece quebrada na pagina publica.
 */
const QUADROS_ACEITOS = new Set([0xc0, 0xc2]);

/** C4 (tabela de Huffman), C8 (reservado) e CC (aritmetico) moram no intervalo de SOF sem ser SOF. */
function ehInicioDeQuadro(marcador: number): boolean {
  return marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
}

/**
 * Devolve as dimensoes, ou `null` se os bytes nao forem um JPEG aceitavel.
 *
 * Nunca lanca: truncado, fora de ordem ou lixo viram `null`, que a rota
 * traduz em "esse arquivo nao serve" — nada disso pode virar 500.
 *
 * O que isto NAO garante: que o dado comprimido depois do SOS seja imagem.
 * Isso so se sabe decodificando, e decodificar no servidor e exatamente o que
 * o painel evita. A barreira contra guardar coisa arbitraria continua sendo a
 * sessao e o teto de 3 MB, como ja era com o WebP.
 */
export function dimensoesDoJpeg(bytes: Uint8Array): Dimensoes | null {
  // SOI no comeco e EOI no fim. Sem o EOI o arquivo veio cortado, e o
  // navegador mostraria a foto pela metade.
  if (bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;

  let medida: Dimensoes | null = null;
  let i = 2;

  while (i < bytes.length) {
    if (bytes[i] !== 0xff) return null;

    // A norma permite bytes FF de preenchimento antes do marcador.
    let m = i + 1;
    while (m < bytes.length && bytes[m] === 0xff) m += 1;
    if (m >= bytes.length) return null;
    const marcador = bytes[m];

    // TEM e RST0..RST7 nao tem segmento: sao so os dois bytes.
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i = m + 1;
      continue;
    }

    // SOI repetido, EOI antes de a imagem comecar, ou FF 00 (que so existe
    // dentro do dado comprimido): a fila esta quebrada.
    if (marcador === 0xd8 || marcador === 0xd9 || marcador === 0x00) return null;

    if (m + 2 >= bytes.length) return null;
    // O tamanho conta os proprios dois bytes, mas nao o marcador.
    const tamanho = (bytes[m + 1] << 8) | bytes[m + 2];
    if (tamanho < 2 || m + 1 + tamanho > bytes.length) return null;

    if (ehInicioDeQuadro(marcador)) {
      if (!QUADROS_ACEITOS.has(marcador)) return null;
      // Dois quadros num arquivo so e JPEG hierarquico ou montado a mao.
      if (medida) return null;
      if (tamanho < 8) return null;

      const precisao = bytes[m + 3];
      const altura = (bytes[m + 4] << 8) | bytes[m + 5];
      const largura = (bytes[m + 6] << 8) | bytes[m + 7];
      const componentes = bytes[m + 8];

      if (precisao !== 8) return null;
      // 1 = tons de cinza, 3 = cor. 4 e CMYK, que cada navegador pinta de um
      // jeito; nenhum canvas gera.
      if (componentes !== 1 && componentes !== 3) return null;
      // Cada componente ocupa 3 bytes. Tamanho que nao fecha e segmento forjado.
      if (tamanho !== 8 + 3 * componentes) return null;
      // Altura 0 quer dizer "definida depois, no DNL": foto real nao usa, e a
      // medida que vai para o endereco nao pode ser adiada.
      if (largura < 1 || altura < 1) return null;
      if (largura > LADO_MAXIMO || altura > LADO_MAXIMO) return null;

      medida = { largura, altura };
    }

    // SOS: dali em diante e dado comprimido. Se o quadro nao apareceu antes
    // disto, nao ha medida confiavel.
    if (marcador === 0xda) return medida;

    i = m + 1 + tamanho;
  }

  return null;
}
