import { describe, expect, it } from "vitest";

import dados from "@/content/posts.json";

import { htmlParaMarkdown } from "./html-para-markdown";
import { markdownParaHtml } from "./markdown";

/**
 * Abrir um post do GoDaddy no editor e salvar nao pode perder nada.
 *
 * O editor trabalha em Markdown; o corpo do acervo e HTML. Ao abrir, ele e
 * convertido; ao salvar com o texto mexido, o que vai ao ar e o Markdown
 * renderizado. Este teste faz a ida e a volta nos 69 posts e confere o que o
 * leitor ve: as mesmas palavras na mesma ordem, as mesmas fotos com a mesma
 * medida, os mesmos sublinhados, grifos, links, titulos, itens de lista e
 * citacoes.
 *
 * Nao confere byte a byte, e nao e para conferir: o HTML herdado tem espaco
 * dentro de <strong>, <figure> em volta de foto e quebra de linha solta dentro
 * de paragrafo, que o Markdown escreve de outro jeito sem mudar o que aparece.
 * A igualdade byte a byte vale para o post que NAO foi editado — e esse nem
 * passa por aqui (ver acervo-no-banco.test.ts).
 */

type Bruto = { slug: string; html: string };
const POSTS = dados as Bruto[];

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * O texto como o leitor le: marca de trecho (negrito, link...) some sem deixar
 * espaco — `E<strong>.</strong>J` se le "E.J" —, e marca de bloco separa.
 */
function texto(html: string): string {
  return html
    .replace(/<\/?(strong|b|em|i|u|mark|a|span)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (e, n: string) => {
      if (n[0] !== "#") return ENTIDADES[n.toLowerCase()] ?? e;
      const hexa = n[1].toLowerCase() === "x";
      return String.fromCodePoint(parseInt(n.slice(hexa ? 2 : 1), hexa ? 16 : 10));
    })
    .replace(/\s+/g, " ")
    .trim();
}

const contar = (html: string, re: RegExp) => (html.match(re) ?? []).length;

function imagens(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => {
    const attr = (nome: string) => new RegExp(`\\s${nome}="([^"]*)"`).exec(m[0])?.[1] ?? "";
    return `${attr("src")} ${attr("width")}x${attr("height")}`;
  });
}

const links = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);

/**
 * As letras e numeros que estao dentro de uma marca (negrito, italico...), em
 * ordem. Pontuacao fica de fora: e ela que pode sair da enfase (ver
 * html-para-markdown.ts, item 2). Uma palavra que perdesse o negrito aparece aqui.
 */
function letrasMarcadas(html: string, tags: string): string {
  let dentro = 0;
  let saida = "";
  const abre = new RegExp(`^<(${tags})\\b`, "i");
  const fecha = new RegExp(`^</(${tags})>`, "i");
  for (const pedaco of html.split(/(<[^>]+>)/)) {
    if (abre.test(pedaco)) dentro += 1;
    else if (fecha.test(pedaco)) dentro = Math.max(0, dentro - 1);
    else if (dentro > 0 && !pedaco.startsWith("<")) saida += texto(pedaco).replace(/[^\p{L}\p{N}]/gu, "");
  }
  return saida;
}

describe("ida e volta pelo editor, nos posts do GoDaddy", () => {
  it.each(POSTS.map((p) => [p.slug, p.html]))("%s", (_slug, html) => {
    const volta = markdownParaHtml(htmlParaMarkdown(html));

    expect(texto(volta)).toBe(texto(html));
    expect(imagens(volta)).toEqual(imagens(html));
    // Todo link original continua, na mesma ordem. O unico link a mais que
    // pode aparecer e o de um endereco que ja estava escrito como texto no
    // post (o editor torna endereco clicavel) — ver html-para-markdown.ts.
    const originais = links(html);
    const textoOriginal = texto(html);
    const extras = links(volta).filter((h) => !originais.includes(h));
    for (const h of extras) expect(textoOriginal, `link novo ${h}`).toContain(h.replace(/&amp;/g, "&"));
    expect(links(volta).filter((h) => originais.includes(h))).toEqual(originais);
    for (const [nome, tags] of [
      ["negrito", "strong|b"],
      ["italico", "em|i"],
      ["sublinhado", "u"],
      ["grifo", "mark"],
    ]) {
      expect(letrasMarcadas(volta, tags), nome).toBe(letrasMarcadas(html, tags));
    }
    for (const tag of ["u", "mark", "h2", "h3", "h4", "li", "blockquote", "ol", "ul"]) {
      expect(contar(volta, new RegExp(`<${tag}[\\s>]`, "g")), `<${tag}>`).toBe(
        contar(html, new RegExp(`<${tag}[\\s>]`, "g")),
      );
    }
  });

  it("converte sempre igual: e o que diz se ela mexeu no texto", () => {
    for (const p of POSTS) expect(htmlParaMarkdown(p.html)).toBe(htmlParaMarkdown(p.html));
  });
});

describe("imagem do acervo no Markdown", () => {
  it("vira <img> com a medida do titulo", () => {
    expect(markdownParaHtml('![](/img/blog/foto-1.webp "1024x768")')).toContain(
      '<img src="/img/blog/foto-1.webp" alt="" width="1024" height="768" loading="lazy" decoding="async">',
    );
  });

  it("sem medida, nao vira imagem", () => {
    expect(markdownParaHtml("![foto](/img/blog/foto-1.webp)")).not.toContain("<img");
  });

  it.each([
    "/img/blog/../segredo.webp",
    "/img/blog/sub/pasta.webp",
    '/img/blog/a.webp"onerror="x',
    "/img/blog/Foto.webp",
    "https://terceiro.com/img/blog/a.webp",
  ])("recusa %s", (src) => {
    expect(markdownParaHtml(`![x](${src} "10x10")`)).not.toContain("<img");
  });

  it("sublinhado e grifo", () => {
    expect(markdownParaHtml("um ++aviso++ e um ==grifo==")).toBe(
      "<p>um <u>aviso</u> e um <mark>grifo</mark></p>\n",
    );
  });
});
