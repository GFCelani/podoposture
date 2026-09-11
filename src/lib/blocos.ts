/**
 * Classifica o corpo de uma secao em blocos, pelo FORMATO do conteudo.
 *
 * O texto da cliente chega plano (p, h3, ul, ol, blockquote, figure). Um
 * bloco unico de prosa nao tem ritmo; mas o formato que a autora usou ja
 * diz o que cada trecho e': uma sequencia de h3 sem corpo e' um mapa de
 * rotulos, "<p><strong>ROTULO</strong></p>" seguido de lista e' uma lista
 * rotulada, pares h3+p curtos sao um protocolo, paragrafos com telefone no
 * fim da secao sao contato. Este modulo so reconhece esses formatos e devolve
 * os mesmos elementos agrupados; nenhuma palavra muda, nenhum elemento sai
 * da ordem. Quem decide a apresentacao de cada tipo e' components/blocos.tsx.
 *
 * Regras conservadoras de proposito: na duvida, o trecho e' prosa. Um falso
 * negativo custa um paragrafo corrido; um falso positivo poe uma lista de
 * referencias dentro de cartoes.
 */

export type Tag = "p" | "h3" | "h4" | "ul" | "ol" | "blockquote" | "figure" | "outro";

export type Elemento = {
  tag: Tag;
  html: string;
  /** Texto sem tags, espacos normalizados. */
  texto: string;
  /** Itens, quando lista. */
  itens: number;
  /** Maior item em caracteres, quando lista. */
  maiorItem: number;
  /** <p> cujo conteudo inteiro esta em <strong>: rotulo escrito pela autora. */
  soStrong: boolean;
  /** Lista em que a maioria dos itens e' link: referencias. */
  soLinks: boolean;
  temTelefone: boolean;
};

export type Bloco =
  | { tipo: "prosa"; html: string }
  | { tipo: "citacao"; html: string }
  | {
      tipo: "lista-rotulada";
      rotulo: string;
      lista: string;
      itens: number;
      /** passos: quatro ou mais itens; ficha: ate tres. */
      variante: "passos" | "ficha";
    }
  | {
      tipo: "lista";
      html: string;
      itens: number;
      ordenada: boolean;
      /** compacta: itens curtos, em colunas; cartoes: itens longos. */
      variante: "compacta" | "cartoes";
    }
  | { tipo: "azulejos"; itens: { tag: Tag; html: string }[] }
  | { tipo: "protocolo"; linhas: { titulo: string; corpo?: string }[] }
  | { tipo: "placa"; titulo?: string; texto: string[]; dado: string[] }
  | { tipo: "referencias"; html: string };

const TELEFONE = /\(\d{2}\)\s?\d{4,5}-\d{4}/;

function textoDe(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide HTML plano em elementos de primeiro nivel. */
export function elementos(html: string): Elemento[] {
  const re = /<(p|h3|h4|ul|ol|blockquote|figure)\b[^>]*>[\s\S]*?<\/\1>/g;
  const out: Elemento[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1] as Tag;
    const el = m[0];
    const texto = textoDe(el);
    const li = el.match(/<li\b[^>]*>[\s\S]*?<\/li>/g) ?? [];
    const comLink = li.filter((x) => /<a\s/.test(x)).length;
    const interno = el.replace(/^<p\b[^>]*>/, "").replace(/<\/p>$/, "").trim();
    out.push({
      tag,
      html: el,
      texto,
      itens: li.length,
      maiorItem: li.reduce((a, x) => Math.max(a, textoDe(x).length), 0),
      soStrong:
        tag === "p" &&
        /^<strong>[\s\S]*<\/strong>$/.test(interno) &&
        !/<\/strong>[\s\S]*<strong>/.test(interno) &&
        texto.length > 0,
      soLinks: li.length >= 2 && comLink / li.length >= 0.6,
      temTelefone: TELEFONE.test(texto),
    });
  }
  return out;
}

const eLista = (e: Elemento) => e.tag === "ul" || e.tag === "ol";
const eTitulo = (e: Elemento) => e.tag === "h3" || e.tag === "h4";
/** Rotulo: strong inteiro, curto, sem ponto final (nao e' frase de destaque). */
const eRotulo = (e: Elemento) => e.soStrong && e.texto.length <= 80 && !/\.$/.test(e.texto);
/** Peca de azulejo: titulo curto ou rotulo em strong. */
const eAzulejo = (e: Elemento) =>
  (eTitulo(e) && e.texto.length <= 120) || (e.soStrong && e.texto.length <= 120);
const ePCurto = (e: Elemento) => e.tag === "p" && !e.soStrong && e.texto.length <= 260;

export function classificar(corpo: string): Bloco[] {
  const els = elementos(corpo);
  const out: Bloco[] = [];
  let prosa: string[] = [];
  const fechaProsa = () => {
    if (prosa.length) out.push({ tipo: "prosa", html: prosa.join("") });
    prosa = [];
  };

  let i = 0;
  while (i < els.length) {
    const e = els[i];

    // placa de contato: um titulo (ou rotulo) seguido so de paragrafos ate o
    // fim da secao, com telefone em algum deles
    if (eTitulo(e) || eRotulo(e)) {
      const resto = els.slice(i + 1);
      if (
        resto.length >= 2 &&
        resto.every((x) => x.tag === "p") &&
        resto.some((x) => x.temTelefone)
      ) {
        fechaProsa();
        const corte = resto.findIndex((x) => x.temTelefone || /telefone|whatsapp/i.test(x.texto));
        out.push({
          tipo: "placa",
          titulo: e.html,
          texto: resto.slice(0, corte).map((x) => x.html),
          dado: resto.slice(corte).map((x) => x.html),
        });
        i = els.length;
        continue;
      }
    }

    // azulejos: quatro ou mais pecas seguidas, com pelo menos dois titulos
    if (eAzulejo(e)) {
      let j = i;
      while (j < els.length && eAzulejo(els[j])) j++;
      // o ultimo titulo pode ser o titulo do paragrafo que vem depois
      if (j < els.length && eTitulo(els[j - 1]) && els[j].tag === "p") j--;
      const run = els.slice(i, j);
      if (run.length >= 4 && run.filter(eTitulo).length >= 2) {
        fechaProsa();
        out.push({ tipo: "azulejos", itens: run.map((x) => ({ tag: x.tag, html: x.html })) });
        i = j;
        continue;
      }
    }

    // protocolo: tres ou mais pares h3 + paragrafo curto
    if (eTitulo(e) && i + 1 < els.length && ePCurto(els[i + 1])) {
      const linhas: { titulo: string; corpo?: string }[] = [];
      let j = i;
      while (j + 1 < els.length && eTitulo(els[j]) && ePCurto(els[j + 1])) {
        linhas.push({ titulo: els[j].html, corpo: els[j + 1].html });
        j += 2;
      }
      if (linhas.length >= 3) {
        // titulo solto no fim da sequencia, sem paragrafo proprio
        if (j < els.length && eTitulo(els[j]) && (j + 1 >= els.length || eTitulo(els[j + 1]))) {
          linhas.push({ titulo: els[j].html });
          j++;
        }
        fechaProsa();
        out.push({ tipo: "protocolo", linhas });
        i = j;
        continue;
      }
    }

    // rotulo em strong seguido de lista (de um item so, fica como prosa)
    if (
      eRotulo(e) &&
      i + 1 < els.length &&
      eLista(els[i + 1]) &&
      !els[i + 1].soLinks &&
      els[i + 1].itens >= 2
    ) {
      fechaProsa();
      const l = els[i + 1];
      out.push({
        tipo: "lista-rotulada",
        rotulo: e.html,
        lista: l.html,
        itens: l.itens,
        variante: l.itens >= 4 ? "passos" : "ficha",
      });
      i += 2;
      continue;
    }

    if (eLista(e)) {
      if (e.soLinks) {
        fechaProsa();
        out.push({ tipo: "referencias", html: e.html });
        i++;
        continue;
      }
      if (e.itens >= 3) {
        fechaProsa();
        out.push({
          tipo: "lista",
          html: e.html,
          itens: e.itens,
          ordenada: e.tag === "ol",
          variante: e.maiorItem <= 70 ? "compacta" : "cartoes",
        });
        i++;
        continue;
      }
    }

    if (e.tag === "blockquote" || /^<p class="destaque"/.test(e.html)) {
      fechaProsa();
      out.push({ tipo: "citacao", html: e.html });
      i++;
      continue;
    }

    prosa.push(e.html);
    i++;
  }
  fechaProsa();
  return out;
}

type Lista = Extract<Bloco, { tipo: "lista" }>;

/** Verdadeiro quando o corpo e' uma lista so (para o par de listas). */
export function eSoLista(blocos: Bloco[]): blocos is [Lista] {
  return blocos.length === 1 && blocos[0].tipo === "lista";
}

/**
 * Par de listas: duas secoes seguidas em que a primeira e' so uma lista de
 * quatro ou mais itens e a segunda abre com uma lista de ate oito. A primeira
 * vira cartoes, a segunda vira caixa ao lado; o resto da segunda continua
 * abaixo. Devolve os indices das primeiras secoes de cada par, sem
 * sobreposicao (uma secao nao participa de dois pares).
 */
export function paresDeListas(porSecao: Bloco[][]): Set<number> {
  const pares = new Set<number>();
  for (let i = 0; i + 1 < porSecao.length; i++) {
    const a = porSecao[i];
    const b = porSecao[i + 1][0];
    if (eSoLista(a) && a[0].itens >= 4 && b && b.tipo === "lista" && b.itens <= 8) {
      pares.add(i);
      i++;
    }
  }
  return pares;
}
