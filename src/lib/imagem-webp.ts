/**
 * Le largura e altura de um WebP direto dos bytes, sem nenhuma dependencia.
 *
 * Por que isto existe: as 68 paginas de blog migradas so chegaram a CLS 0
 * porque `scripts/dimensionar-imagens-do-blog.mjs` abre cada arquivo com
 * `sharp` e escreve `width`/`height` no `<img>`. Aquilo e passo de build. Uma
 * imagem enviada pelo painel nasce depois do build, entao ou o servidor sabe
 * medir, ou o layout volta a pular quando a imagem carrega.
 *
 * Medir aqui, e nao acreditar no que o navegador enviou junto, e o ponto: as
 * dimensoes viram parte do endereco publico do arquivo, e endereco que o
 * visitante ve nao pode sair de um campo que o cliente preenche.
 *
 * `sharp` resolveria, mas custa uma dependencia nativa pesada numa funcao
 * serverless para ler 30 bytes de cabecalho. O formato e publico e estavel:
 * https://developers.google.com/speed/webp/docs/riff_container
 */

export type Dimensoes = { largura: number; altura: number };

/** Um WebP maior que isto e erro de quem enviou, nao foto de blog. */
const LADO_MAXIMO = 8192;

function quatroCaracteres(bytes: Uint8Array, inicio: number): string {
  return String.fromCharCode(
    bytes[inicio],
    bytes[inicio + 1],
    bytes[inicio + 2],
    bytes[inicio + 3],
  );
}

function lerUInt16LE(bytes: Uint8Array, i: number): number {
  return bytes[i] | (bytes[i + 1] << 8);
}

function lerUInt24LE(bytes: Uint8Array, i: number): number {
  return bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
}

/**
 * Devolve as dimensoes, ou `null` se os bytes nao forem um WebP legivel.
 *
 * Nunca lanca: arquivo truncado, formato desconhecido ou lixo viram `null`, que
 * a rota traduz em "esse arquivo nao serve" — nada disso pode virar 500.
 */
export function dimensoesDoWebp(bytes: Uint8Array): Dimensoes | null {
  // Cabecalho RIFF (12) + fourcc do bloco (4) + tamanho (4) + o menor corpo util
  if (bytes.length < 30) return null;
  if (quatroCaracteres(bytes, 0) !== "RIFF") return null;
  if (quatroCaracteres(bytes, 8) !== "WEBP") return null;

  // O tamanho declarado no cabecalho RIFF tem de descrever o arquivo inteiro.
  // Sem esta conferencia, `RIFF....WEBPVP8X` + 18 bytes de medida + qualquer
  // coisa ate o teto era aceito e guardado: armazenamento arbitrario para quem
  // ja tem a senha. Nenhum WebP de verdade falha aqui.
  const declarado =
    (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
  if (declarado !== bytes.length - 8) return null;

  const bloco = quatroCaracteres(bytes, 12);
  let largura = 0;
  let altura = 0;

  if (bloco === "VP8 ") {
    // Com perdas. Depois do cabecalho de quadro (3 bytes) vem a marca
    // 0x9D 0x01 0x2A, e so entao as duas medidas, de 14 bits cada.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    largura = lerUInt16LE(bytes, 26) & 0x3fff;
    altura = lerUInt16LE(bytes, 28) & 0x3fff;
  } else if (bloco === "VP8L") {
    // Sem perdas. Um byte de assinatura e um campo de 32 bits com as duas
    // medidas menos um, empacotadas em 14 bits cada.
    if (bytes[20] !== 0x2f) return null;
    const empacotado =
      (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
    largura = (empacotado & 0x3fff) + 1;
    altura = ((empacotado >>> 14) & 0x3fff) + 1;
  } else if (bloco === "VP8X") {
    // Estendido (animacao, alfa, metadados). As medidas da tela vem em 24 bits,
    // tambem menos um.
    largura = lerUInt24LE(bytes, 24) + 1;
    altura = lerUInt24LE(bytes, 27) + 1;
  } else {
    return null;
  }

  if (!Number.isInteger(largura) || !Number.isInteger(altura)) return null;
  if (largura < 1 || altura < 1) return null;
  if (largura > LADO_MAXIMO || altura > LADO_MAXIMO) return null;

  return { largura, altura };
}

/**
 * Nome publico do arquivo: `<resumo>-<largura>x<altura>.webp`.
 *
 * As medidas viajam no nome de proposito. Quem renderiza o Markdown le o
 * sufixo e escreve `width`/`height` no `<img>` sem consultar o banco — e o que
 * mantem o CLS em zero sem custar uma consulta por imagem na pagina.
 *
 * O resumo e o sha256 do conteudo, entao o endereco muda quando o arquivo muda.
 * E o que torna verdadeiro o `Cache-Control: immutable` da rota que serve.
 */
export function nomeDoArquivo(resumo: string, d: Dimensoes): string {
  return `${resumo}-${d.largura}x${d.altura}.webp`;
}

const NOME = /^([0-9a-f]{64})-(\d{1,4})x(\d{1,4})\.webp$/;

/** Desmonta o nome publico. `null` se nao for um nome que nos emitimos. */
export function lerNomeDoArquivo(
  nome: string,
): { resumo: string; largura: number; altura: number } | null {
  const m = NOME.exec(nome);
  if (!m) return null;
  const largura = Number(m[2]);
  const altura = Number(m[3]);
  if (largura < 1 || altura < 1 || largura > LADO_MAXIMO || altura > LADO_MAXIMO) return null;
  return { resumo: m[1], largura, altura };
}
