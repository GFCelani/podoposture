import { describe, expect, it } from "vitest";

import paginas from "../content/pages.json";
import posts from "../content/posts.json";
import { classificar, elementos, type Bloco } from "./blocos";
import { markdownParaHtml } from "./markdown";
import { dividirEmSecoes } from "./secoes";

/**
 * O corpo vai do HTML a pagina por dividirEmSecoes, elementos e classificar, e
 * nenhum desses passos avisa quando deixa um trecho para tras: a pagina so sai
 * mais curta. Por isso a conferencia e' pelo texto inteiro e na ordem, nao por
 * algumas palavras escolhidas, que deixariam passar um titulo sumido.
 */

/** O HTML de volta a partir dos blocos, na ordem em que components/blocos.tsx os poe. */
function htmlDosBlocos(blocos: Bloco[]): string {
  return blocos
    .map((b) => {
      switch (b.tipo) {
        case "lista-rotulada":
          return b.rotulo + b.lista;
        case "azulejos":
          return b.itens.map((i) => i.html).join("");
        case "protocolo":
          return b.linhas.map((l) => l.titulo + (l.corpo ?? "")).join("");
        case "placa":
          return (b.titulo ?? "") + b.texto.join("") + b.dado.join("");
        default:
          return b.html;
      }
    })
    .join("");
}

/** O caminho de components/secoes-de-conteudo.tsx: a abertura, e cada secao sem o titulo. */
function renderizado(html: string): string {
  const doc = dividirEmSecoes(html);
  let out = "";
  if (doc.abertura) {
    const [primeiro, ...resto] = elementos(doc.abertura);
    const abreComP = primeiro?.tag === "p";
    if (abreComP) out += primeiro.html;
    out += htmlDosBlocos(classificar(abreComP ? resto.map((e) => e.html).join("") : doc.abertura));
  }
  for (const s of doc.secoes) {
    const m = s.html.match(/^<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
    out += `<h2>${m ? m[1] : s.titulo}</h2>`;
    out += htmlDosBlocos(classificar(m ? s.html.slice(m[0].length) : s.html));
  }
  return out;
}

const texto = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const CASOS: [string, string][] = [
  ["A: um so titulo de secao (o botao do editor)", "Primeiro parágrafo.\n\n## Única seção\n\nTexto da seção."],
  ["B: titulo 1 do Word e dois titulos de secao", "# Título grande\n\nTexto.\n\n## Seção 1\n\nA1\n\n## Seção 2\n\nB2"],
  [
    "C: separador, codigo, tabela e h5",
    "Texto\n\n---\n\nMais\n\n```\ncódigo aqui\n```\n\n| col a | col b |\n|---|---|\n| v1 | v2 |\n\n##### Título h5\n\nfim",
  ],
  ["D: um h2 e um h3, nenhum nivel com dois", "## Seção A\n\ntexto a\n\n### Sub\n\ntexto sub"],
  ["E: dois h3 e um h2 solto", "Abre.\n\n## Grande\n\nmeio\n\n### Um\n\nx\n\n### Dois\n\ny"],
  ["F: controle, dois titulos de secao", "Abre.\n\n## S1\n\nx\n\n## S2\n\ny"],
  ["lista aninhada", "Abre.\n\n- um\n  - um.a\n  - um.b\n- dois\n- três\n\nfim"],
  ["tabela", "Abre.\n\n| Exercício | Séries |\n|---|---|\n| Ponte | 3 |\n| Prancha | 2 |\n\nfim"],
  ["codigo", "Abre.\n\n```\nlinha 1\nlinha 2\n```\n\nfim"],
  ["separador", "Antes do separador.\n\n---\n\nDepois do separador."],
];

describe("nenhum texto do post do painel some a caminho da pagina", () => {
  it.each(CASOS)("%s", (_caso, md) => {
    const html = markdownParaHtml(md);
    expect(texto(renderizado(html))).toBe(texto(html));
  });
});

describe("nenhum texto do conteudo migrado some a caminho da pagina", () => {
  const todos = [...(posts as { slug: string; html: string }[]), ...(paginas as { slug: string; html: string }[])];

  it.each(todos.map((p) => [p.slug, p.html]))("%s", (_slug, html) => {
    expect(texto(renderizado(html))).toBe(texto(html));
  });
});

describe("elementos", () => {
  it("fecha a lista aninhada pela profundidade, nao no primeiro </ul>", () => {
    const html = "<ul><li>um<ul><li>um.a</li></ul></li><li>dois</li><li>três</li></ul><p>fim</p>";
    const els = elementos(html);
    expect(els.map((e) => e.tag)).toEqual(["ul", "p"]);
    expect(els[0].itens).toBe(3);
    expect(els.map((e) => e.html).join("")).toBe(html);
  });

  it("tag que classificar nao conhece entra como outro e vira prosa", () => {
    const html = "<h2>Título</h2><table><tr><td>v1</td></tr></table><hr><pre><code>x</code></pre><h5>h5</h5>";
    expect(elementos(html).map((e) => e.tag)).toEqual(["outro", "outro", "outro", "outro", "outro"]);
    expect(classificar(html)).toEqual([{ tipo: "prosa", html }]);
  });

  it("texto solto entre tags tambem vira elemento", () => {
    expect(elementos("antes<p>meio</p>depois").map((e) => e.texto)).toEqual(["antes", "meio", "depois"]);
  });

  it("o HTML plano do extrator sai dividido como sempre saiu", () => {
    const html =
      '<p>a</p>\n<h3>b</h3>\n<ul>\n<li>c</li>\n<li>d</li>\n</ul>\n<blockquote><p>e</p></blockquote>\n<figure><img src="/x.webp" alt=""><figcaption>f</figcaption></figure>';
    expect(elementos(html).map((e) => [e.tag, e.html])).toEqual([
      ["p", "<p>a</p>"],
      ["h3", "<h3>b</h3>"],
      ["ul", "<ul>\n<li>c</li>\n<li>d</li>\n</ul>"],
      ["blockquote", "<blockquote><p>e</p></blockquote>"],
      ["figure", '<figure><img src="/x.webp" alt=""><figcaption>f</figcaption></figure>'],
    ]);
  });
});
