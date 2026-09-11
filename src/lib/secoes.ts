/**
 * Divide o HTML migrado em secoes, no servidor.
 *
 * O texto da cliente chega como um documento plano (p, h2, h3, ul, ol,
 * blockquote, figure, sem aninhamento) e era renderizado inteiro num so
 * `dangerouslySetInnerHTML`. Um bloco unico nao tem onde receber numeracao,
 * entrada por scroll ou imagem no meio: tudo o que da ritmo a uma pagina
 * precisa de fronteiras, e a unica fronteira que o texto ja traz e' o titulo.
 *
 * O corte e' no nivel de titulo que a autora de fato usou para estruturar o
 * texto: h2 quando ha dois ou mais; senao h3 quando ha dois ou mais (varias
 * paginas de servico tem um h2 de abertura e a estrutura inteira em h3);
 * senao nao ha corte. Nao se inventa divisao: um documento sem titulos volta
 * como abertura unica, e cabe a quem renderiza tratar isso (e listar no
 * relatorio). Nenhuma palavra muda; o que este modulo acrescenta e' marcacao
 * em volta: um id no titulo para ancora, e a classe `destaque` numa frase que
 * a propria autora ja escreveu inteira em negrito.
 */

export type Secao = {
  /** Ancora do titulo, ASCII, unica no documento. */
  id: string;
  /** Texto do titulo, sem tags. */
  titulo: string;
  /** O titulo e tudo ate o proximo do mesmo nivel. */
  html: string;
};

export type Documento = {
  /** O que vem antes do primeiro titulo de corte. Vazio quando o texto abre com ele. */
  abertura: string;
  secoes: Secao[];
  /** Nivel usado no corte, ou null quando o texto nao tinha estrutura. */
  nivel: "h2" | "h3" | null;
  /** Verdadeiro quando ha uma frase marcada como destaque em algum bloco. */
  temDestaque: boolean;
};

/**
 * Frase de destaque: um <p> cujo conteudo inteiro e' um <strong>, com 40 a
 * 220 caracteres, terminando em ponto. E' o gesto da autora de dar peso a uma
 * afirmacao; aqui ele vira pull quote em vez de paragrafo em negrito.
 * "<strong>Rotulo:</strong> texto" nao casa, porque o strong nao fecha o p.
 * Pergunta e exclamacao ficam de fora: no corpus sao perguntas de FAQ e
 * chamadas ("agende sua consulta"), nao sintese. So a primeira ocorrencia do
 * documento: uma por pagina, senao vira ruido.
 */
const DESTAQUE = /<p>(\s*<strong>([^<]{40,220}?\.)<\/strong>\s*)<\/p>/;
const CHAMADA = /agend|entre em contato|consulta|fale con|clique/i;

function textoDe(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** ASCII, minusculo, hifens. Mesma regra que os slugs das rotas seguem. */
function ancora(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "secao"
  );
}

function contar(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length;
}

export function dividirEmSecoes(html: string): Documento {
  const nivel: Documento["nivel"] =
    contar(html, "h2") >= 2 ? "h2" : contar(html, "h3") >= 2 ? "h3" : null;

  let temDestaque = false;
  const marcarDestaque = (trecho: string): string => {
    if (temDestaque) return trecho;
    const m = DESTAQUE.exec(trecho);
    if (!m || CHAMADA.test(m[2])) return trecho;
    temDestaque = true;
    return trecho.replace(m[0], `<p class="destaque">${m[1]}</p>`);
  };

  if (!nivel) {
    return { abertura: marcarDestaque(html), secoes: [], nivel, temDestaque };
  }

  const corte = new RegExp(`(?=<${nivel}[\\s>])`);
  const titulo = new RegExp(`^<${nivel}([^>]*)>([\\s\\S]*?)</${nivel}>`);
  const pedacos = html.split(corte).filter((p) => p.trim().length > 0);
  const usados = new Set<string>();

  let abertura = "";
  const secoes: Secao[] = [];

  for (const pedaco of pedacos) {
    const m = titulo.exec(pedaco);
    if (!m) {
      abertura += pedaco;
      continue;
    }
    const texto = textoDe(m[2]);
    let id = ancora(texto);
    for (let n = 2; usados.has(id); n++) id = `${ancora(texto)}-${n}`;
    usados.add(id);

    // o titulo do extrator nao traz atributos; se um dia trouxer id, o dele vence
    const abre = /\sid=/.test(m[1])
      ? `<${nivel}${m[1]}>`
      : `<${nivel}${m[1]} id="${id}">`;
    const corpo = pedaco.slice(m[0].length);
    secoes.push({ id, titulo: texto, html: `${abre}${m[2]}</${nivel}>${corpo}` });
  }

  abertura = marcarDestaque(abertura);
  for (const s of secoes) s.html = marcarDestaque(s.html);

  return { abertura, secoes, nivel, temDestaque };
}

/**
 * Onde a imagem da pagina entra no corpo: depois da secao que descreve como
 * o tratamento e' feito, porque e' ali que a foto da sala ou do aparelho
 * informa em vez de decorar. Sem secao assim, depois da primeira; sem secao
 * nenhuma, depois da abertura (indice -1).
 */
const ONDE_O_TEXTO_PEDE_IMAGEM =
  /como funciona|como (avaliamos|tratamos)|t[eé]cnicas|ferramentas|processo|na pr[aá]tica|recursos utilizados|prescri[cç][aã]o/i;

export function indiceParaImagem(secoes: Secao[]): number {
  if (secoes.length === 0) return -1;
  const i = secoes.findIndex((s) => ONDE_O_TEXTO_PEDE_IMAGEM.test(s.titulo));
  return i >= 0 ? i : 0;
}
