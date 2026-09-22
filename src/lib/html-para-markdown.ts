import TurndownService from "turndown";

import { FOTO_DO_ACERVO } from "./markdown";

/**
 * O corpo de um post do GoDaddy (HTML) na forma que o editor do painel edita
 * (Markdown).
 *
 * So entra em cena quando ela abre um desses posts no editor. A pagina nunca
 * passa por aqui: enquanto o corpo nao for editado ele continua o HTML do
 * GoDaddy, verbatim (ver `PostDoPainel.formato`).
 *
 * E um conversor proprio, e nao o da colagem do Word (EditorDePost.tsx), por
 * causa das imagens: o da colagem joga fora toda <img> — a do Word aponta para
 * o disco de quem copiou —, e aqui a imagem e do proprio site e tem que ficar.
 *
 * A ida e a volta (HTML -> Markdown -> HTML) passa pelos 69 posts no teste e
 * devolve as mesmas palavras, fotos, sublinhados, grifos, links, titulos e
 * itens de lista. Para isso o HTML herdado precisou de quatro cuidados, cada
 * um achado por esse teste:
 *
 * 1. Enfases iguais coladas (`<em>a</em><em>b</em>`, 11 no acervo) viram uma
 *    so antes da conversao; senao saia `*a**b*`, e o `**` do meio virava
 *    negrito.
 * 2. Negrito ou italico que comeca em pontuacao grudada numa letra
 *    (`formas<strong>: tremores</strong>`) nao abre em Markdown — o `**`
 *    aparecia literal na pagina. A pontuacao da ponta sai para fora da enfase.
 *    Um sinal de pontuacao em negrito perde o negrito; nenhuma palavra muda.
 * 3. `_` so e escapado na borda da palavra. Dentro dela ele nunca e enfase, e
 *    o escape vazava para dentro de URL (`?g\_st=`).
 * 4. Item de lista vazio continua existindo (ha um no acervo).
 *
 * Uma diferenca fica, e e de proposito: endereco escrito como texto
 * (`Mapa: https://maps...`) vira link clicavel, porque o editor do painel faz
 * isso com todo endereco. So acontece se ela editar o corpo do post.
 *
 * Deterministico: a rota converte ao abrir e converte de novo ao salvar. Se o
 * que volta do editor e igual ao que foi convertido, ela nao mexeu no texto, e
 * o corpo do GoDaddy fica como estava.
 */

const ALFANUMERICO = /[\p{L}\p{N}]/u;
const PONTUACAO = /[\p{P}\p{S}]/u;

/** O caractere de texto logo antes (`lado = "antes"`) ou logo depois de um no. */
function vizinho(no: Node, lado: "antes" | "depois"): string {
  let atual: Node | null = no;
  while (atual) {
    const irmao: Node | null = lado === "antes" ? atual.previousSibling : atual.nextSibling;
    if (irmao) {
      const t = irmao.textContent ?? "";
      if (t) return lado === "antes" ? t[t.length - 1] : t[0];
      atual = irmao;
      continue;
    }
    // sem irmao: sobe enquanto o pai for trecho de linha (strong dentro de em...)
    atual = atual.parentNode;
    if (!atual || !["EM", "I", "STRONG", "B", "U", "MARK", "SPAN", "A"].includes(atual.nodeName)) return "";
  }
  return "";
}

/**
 * Enfase que o Markdown consegue abrir e fechar: a pontuacao das pontas que
 * encosta numa letra do lado de fora sai da enfase (ver o item 2 do topo).
 */
function enfase(marca: string) {
  return (conteudo: string, no: Node): string => {
    if (!conteudo.trim()) return conteudo;
    let inicio = "";
    let meio = conteudo;
    let fim = "";
    // Espaco na ponta de dentro (`<strong>x, </strong>e`) sai para fora da
    // marca, entao quem encosta na marca e o espaco, nao a letra vizinha.
    const bruto = no.textContent ?? "";
    const colaAntes = !/^\s/.test(bruto) && ALFANUMERICO.test(vizinho(no, "antes"));
    const colaDepois = !/\s$/.test(bruto) && ALFANUMERICO.test(vizinho(no, "depois"));
    if (colaAntes) {
      const m = /^[\p{P}\p{S}\s]+/u.exec(meio);
      if (m && PONTUACAO.test(m[0][0])) {
        inicio = m[0];
        meio = meio.slice(m[0].length);
      }
    }
    if (colaDepois) {
      const m = /[\p{P}\p{S}\s]+$/u.exec(meio);
      if (m && PONTUACAO.test(m[0][m[0].length - 1])) {
        fim = m[0];
        meio = meio.slice(0, -m[0].length);
      }
    }
    return meio ? `${inicio}${marca}${meio}${marca}${fim}` : `${inicio}${fim}`;
  };
}

const conversor = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  // `*`, e nao `_`: italico no meio da palavra (`chamad*o*`) so abre com `*`.
  emDelimiter: "*",
  strongDelimiter: "**",
  // Item de lista vazio e o unico bloco vazio que aparece: fica como item.
  blankReplacement: (_conteudo, no) => {
    const n = no as HTMLElement;
    if (n.nodeName === "LI") return `-   ${n.nextSibling ? "\n" : ""}`;
    return (n as unknown as { isBlock?: boolean }).isBlock ? "\n\n" : "";
  },
});

// Os escapes do Turndown, com uma mudanca: `_` so na borda da palavra.
const ESCAPES: [RegExp, string][] = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/^>/g, "\\>"],
  [/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "\\_"],
  [/^(\d+)\. /g, "$1\\. "],
];
conversor.escape = (texto: string) => ESCAPES.reduce((t, [re, troca]) => t.replace(re, troca), texto);

conversor.addRule("negrito", { filter: ["strong", "b"], replacement: enfase("**") });
conversor.addRule("italico", { filter: ["em", "i"], replacement: enfase("*") });
conversor.addRule("sublinhado", { filter: ["u"], replacement: enfase("++") });
conversor.addRule("grifo", { filter: ["mark"], replacement: enfase("==") });

conversor.addRule("imagemDoSite", {
  filter: ["img"],
  replacement: (_conteudo, no) => {
    const img = no as HTMLImageElement;
    const src = img.getAttribute("src") ?? "";
    const alt = (img.getAttribute("alt") ?? "").replace(/[[\]]/g, "");
    if (FOTO_DO_ACERVO.test(src)) {
      const largura = img.getAttribute("width");
      const altura = img.getAttribute("height");
      return largura && altura ? `![${alt}](${src} "${largura}x${altura}")` : "";
    }
    if (src.startsWith("/img/post/")) return `![${alt}](${src})`;
    return "";
  },
});

conversor.addRule("figura", {
  filter: ["figure"],
  replacement: (conteudo) => `\n\n${conteudo.trim()}\n\n`,
});

/** Enfases iguais coladas viram uma so (item 1 do topo). */
function juntarEnfasesColadas(html: string): string {
  return html.replace(/<\/(em|strong|u|mark|b|i)>(\s*)<\1>/g, "$2");
}

export function htmlParaMarkdown(html: string): string {
  return conversor.turndown(juntarEnfasesColadas(html ?? "")).trim();
}
