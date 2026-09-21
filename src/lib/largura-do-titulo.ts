/**
 * Quanto uma linha do titulo do topo ocupa na tela, em largura de verdade.
 *
 * Contar caracteres nao basta e isso ja foi medido no navegador: quatro linhas
 * de 22 caracteres largos ("MMMM…", "MWG…") passam no teto de 22 e invadem o
 * campo das figuras em 131 px a 1024, 274 a 1280 e 235 a 1440. Um "M" e quatro
 * vezes mais largo que um "l" — 1035 contra 282 —, entao o teto por caractere
 * so acerta para o texto medio.
 *
 * COMO A TABELA FOI MEDIDA. Com a Newsreader que o proprio site serve, no site
 * rodando: Playwright abre a home, espera `document.fonts.ready`, copia a
 * familia e o peso computados do `h1` do topo e mede cada caractere a 64px com
 * `font-optical-sizing: auto` — o corte de DISPLAY, que e o que aparece no
 * titulo (ver layout.tsx, eixo opsz). Kerning e ligaduras desligados, porque a
 * conta aqui soma caractere a caractere. Cada largura e a media de 20
 * repeticoes, para diluir o arredondamento de subpixel. O script esta em
 * scratchpad/medir-no-site.mjs.
 *
 * Os numeros estao em milesimos de em, e nao em pixels, para a tabela nao
 * depender do corpo: o titulo cai de 64 para 32px conforme a faixa da janela, e
 * a proporcao entre as letras e a mesma em todas.
 *
 * A REFERENCIA e a linha "Integração terapêutica", a mais larga do titulo de
 * hoje, com folga de 4% (ver `medidaNaTela` no descritor do hero). Ela cabe: e o
 * que esta no ar e o que `--hero-texto-dir` mediu em globals.css. A folga de 4%
 * e o respiro entre a borda do texto e o comeco do campo das figuras.
 *
 * CONFERENCIA. Somando esta tabela, as quatro linhas do titulo padrao dao 618,9
 * / 526,5 / 415,3 / 476,6 px a 64px, contra 615,3 / 517,7 / 413,3 / 478,7
 * anotados em hero.tsx — 1,7% para mais no pior caso, 0,4% para menos no melhor.
 * A diferenca e o kerning, que o site aplica e esta conta nao. Ela erra para
 * mais justamente na linha mais larga, que e a que importa: a regra recusa um
 * fio antes de a linha invadir as figuras, e nao depois.
 *
 * Modulo puro, sem React e sem banco: a rota valida com ele no servidor e o
 * editor avisa com ele no navegador, com o MESMO limite. Foi essa divergencia
 * que deixou o aviso amarelo do editor ser ignorado e a linha ir ao ar.
 */

/** Largura de cada caractere em milesimos de em. Ver o cabecalho: medida, nao escolhida. */
const LARGURAS: Readonly<Record<string, number>> = {
  "0": 613, "1": 613, "2": 613, "3": 613, "4": 613, "5": 613, "6": 613, "7": 613, "8": 613, "9": 613,
  " ": 226, "!": 267, '"': 360, "#": 613, $: 613, "%": 807, "&": 758, "'": 191, "(": 278, ")": 278,
  "*": 399, "+": 564, ",": 243, "-": 332, ".": 240, "/": 392, ":": 271, ";": 279, "<": 564, "=": 564,
  ">": 564, "?": 480, "@": 900,
  A: 741, B: 678, C: 712, D: 783, E: 681, F: 622, G: 772, H: 838, I: 364, J: 426, K: 776, L: 632,
  M: 1035, N: 779, O: 802, P: 651, Q: 803, R: 712, S: 574, T: 726, U: 792, V: 723, W: 1034, X: 745,
  Y: 713, Z: 664,
  "[": 298, "\\": 392, "]": 299, "^": 564, _: 410, "`": 500,
  a: 514, b: 586, c: 475, d: 598, e: 495, f: 372, g: 518, h: 597, i: 289, j: 267, k: 580, l: 282,
  m: 888, n: 605, o: 567, p: 599, q: 584, r: 423, s: 422, t: 379, u: 583, v: 569, w: 800, x: 560,
  y: 560, z: 479,
  "{": 296, "|": 224, "}": 296, "~": 564,
  "¡": 252, "¢": 613, "£": 613, "¤": 467, "¥": 613, "¦": 224, "§": 582, "¨": 500, "©": 852, "ª": 454,
  "«": 463, "¬": 564, "­": 0, "®": 540, "¯": 500, "°": 372, "±": 564, "²": 356, "³": 331,
  "´": 500, µ: 627, "¶": 604, "·": 256, "¸": 500, "¹": 276, º: 470, "»": 490, "¼": 750, "½": 790,
  "¾": 744, "¿": 476,
  À: 741, Á: 741, Â: 741, Ã: 741, Ä: 741, Å: 741, Æ: 1053, Ç: 712, È: 681, É: 681, Ê: 681, Ë: 681,
  Ì: 364, Í: 364, Î: 364, Ï: 364, Ð: 785, Ñ: 779, Ò: 802, Ó: 802, Ô: 802, Õ: 802, Ö: 802, "×": 564,
  Ø: 816, Ù: 792, Ú: 792, Û: 792, Ü: 792, Ý: 713, Þ: 666, ß: 650,
  à: 514, á: 514, â: 514, ã: 514, ä: 514, å: 514, æ: 768, ç: 475, è: 495, é: 495, ê: 495, ë: 495,
  ì: 289, í: 289, î: 289, ï: 289, ð: 582, ñ: 605, ò: 567, ó: 567, ô: 567, õ: 567, ö: 567, "÷": 564,
  ø: 582, ù: 583, ú: 583, û: 583, ü: 583, ý: 560, þ: 583, ÿ: 560,
  Œ: 1109, œ: 879, Š: 587, š: 410, Ÿ: 762, Ž: 644, ž: 468,
  "–": 490, "—": 655, "‘": 237, "’": 240, "‚": 238, "“": 428, "”": 431, "„": 429, "†": 527,
  "‡": 527, "•": 397, "…": 694, "‰": 1055, "‹": 281, "›": 304, "€": 613,
};

/**
 * Caractere fora da tabela conta como o mais largo medido (o "M").
 *
 * A tabela cobre o que se digita em portugues — ASCII, os acentuados do Latin-1
 * e a pontuacao que o Word e o WhatsApp colam. O que sobra e raro, e na duvida a
 * regra recusa em vez de deixar passar: um titulo recusado se conserta na hora,
 * um titulo largo so aparece depois de publicado, na home.
 */
const LARGURA_DESCONHECIDA = 1035;

/**
 * O tracking do titulo, em milesimos de em por caractere.
 *
 * `tracking-[-0.025em]` no h1 do hero: o navegador aplica o espacamento depois
 * de cada caractere, entao ele encolhe a linha na proporcao do numero de
 * caracteres, e nao da largura delas.
 */
const TRACKING_POR_CARACTERE = -25;

/** A largura da linha em milesimos de em, tracking incluido. Nunca negativa. */
export function larguraDaLinha(texto: string): number {
  const letras = Array.from(texto);
  const soma = letras.reduce((total, letra) => total + (LARGURAS[letra] ?? LARGURA_DESCONHECIDA), 0);
  return Math.max(0, soma + TRACKING_POR_CARACTERE * letras.length);
}

/**
 * A linha cabe no espaco ao lado das figuras?
 *
 * `referencia` e a linha mais larga que comprovadamente cabe, e `folga` o quanto
 * ela ainda pode crescer. As duas moram no descritor da secao (`medidaNaTela`),
 * junto do resto do contrato do campo.
 */
export function linhaCabeNoTopo(texto: string, referencia: string, folga: number): boolean {
  return larguraDaLinha(texto) <= larguraDaLinha(referencia) * folga;
}

/**
 * Quanto do espaco ao lado das figuras a linha ocupa: 1 e o espaco inteiro.
 *
 * Serve so para mostrar ("ocupa 80% do espaco"). Se cabe ou nao continua sendo
 * `linhaCabeNoTopo`, e quem mostra o numero decide cabe/nao cabe por ela — uma
 * divisao em ponto flutuante nao pode ser o que separa o contador do servidor.
 */
export function ocupacaoNoTopo(texto: string, referencia: string, folga: number): number {
  return larguraDaLinha(texto) / (larguraDaLinha(referencia) * folga);
}
