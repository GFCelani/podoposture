import MarkdownIt from "markdown-it";
import ins from "markdown-it-ins";
import mark from "markdown-it-mark";

import { lerNomeDoArquivo } from "./imagem-webp";

/**
 * Markdown -> HTML, sem caminho para injecao.
 *
 * A decisao que sustenta a seguranca do blog inteiro esta na linha
 * `html: false`. Com ela, **nada** que a pessoa escreva vira marcacao: um
 * `<script>` digitado no corpo do post sai da conversao como texto escapado, e
 * um link `javascript:` nao chega a virar link. O conteudo nao e filtrado
 * depois de virar HTML — ele nunca chega a ser HTML perigoso.
 *
 * Isso e diferente, e melhor, do que guardar HTML e passar um sanitizador em
 * cima: sanitizador e uma lista do que remover, e listas tem buracos.
 *
 * Importa em dobro aqui: depois de `SecoesDeConteudo` dividir o corpo em
 * secoes e blocos, o `Html` de `src/components/blocos.tsx` injeta cada trecho
 * com `dangerouslySetInnerHTML` e nao sanitiza nada em runtime. Isso era seguro
 * enquanto a unica fonte era o extrator Python, que constroi o HTML a partir de
 * uma arvore fechada. O painel abre uma segunda fonte — e e esta funcao que
 * mantem a promessa de pe.
 */
const md = new MarkdownIt({
  html: false, // <- a linha que importa
  linkify: true,
  breaks: true,
  typographer: false,
});

/**
 * `++texto++` e sublinhado, `==texto==` e marca-texto.
 *
 * Entraram com o acervo do GoDaddy: 19 trechos sublinhados e um grifado, que
 * sumiriam na primeira vez que ela editasse um desses textos. O sublinhado sai
 * como `<u>`, a mesma marca que o GoDaddy usava (o plugin escreveria `<ins>`).
 * Continua sem HTML cru: sao duas sintaxes a mais, nao uma porta.
 */
md.use(ins).use(mark);
md.renderer.rules.ins_open = () => "<u>";
md.renderer.rules.ins_close = () => "</u>";

/**
 * Link externo abre em nova aba e nao entrega a pagina de origem ao destino.
 *
 * `noopener` impede que a pagina aberta manipule esta pela referencia
 * `window.opener`; `noreferrer` evita vazar de onde a pessoa veio.
 */
const abrirLink =
  md.renderer.rules.link_open ??
  ((tokens, indice, opcoes, _env, self) => self.renderToken(tokens, indice, opcoes));

md.renderer.rules.link_open = (tokens, i, opcoes, env, self) => {
  const href = String(tokens[i].attrGet("href") ?? "");
  if (/^https?:\/\//i.test(href)) {
    tokens[i].attrSet("target", "_blank");
    tokens[i].attrSet("rel", "noopener noreferrer");
  }
  return abrirLink(tokens, i, opcoes, env, self);
};

/**
 * Imagem: so as nossas, e sempre com medida.
 *
 * Duas coisas acontecem aqui, e as duas sao deliberadas.
 *
 * 1. **Medida no HTML.** Os 68 posts migrados chegaram a CLS 0 porque um script
 *    de build abriu cada arquivo e escreveu `width`/`height` no `<img>`. Post
 *    novo nasce depois do build. A saida foi por a medida no proprio nome do
 *    arquivo (`<resumo>-1200x800.webp`), entao ela viaja com o endereco e esta
 *    disponivel aqui, sem consultar o banco e sem `sharp`.
 *
 * 2. **So imagem hospedada aqui.** Um `![](https://terceiro/pixel.gif)` faria a
 *    pagina de uma clinica buscar um arquivo num servidor alheio a cada visita
 *    — ou seja, entregaria o IP de quem le sobre a propria dor a um terceiro.
 *    Endereco que nao seja `/img/post/` nao vira imagem; vira o texto
 *    alternativo, escapado.
 */
// Só os dois primeiros parâmetros importam aqui; a regra monta a tag à mão.
md.renderer.rules.image = (tokens, i) => {
  const token = tokens[i];
  const src = String(token.attrGet("src") ?? "");
  const alt = token.content ?? "";
  const escapar = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const tag = (largura: number | string, altura: number | string) =>
    `<img src="${escapar(src)}" alt="${escapar(alt)}"` +
    ` width="${largura}" height="${altura}"` +
    ` loading="lazy" decoding="async">`;

  // Foto do acervo do GoDaddy, arquivo estatico do proprio site. A medida nao
  // esta no nome (o build antigo a escreveu no <img>), entao ela viaja no
  // titulo da imagem: `![](/img/blog/x.webp "1024x768")`, que a conversao do
  // HTML escreve sozinha (html-para-markdown.ts). O nome e conferido por uma
  // regra estrita — letra minuscula, numero, ponto, hifen —, sem barra e sem
  // aspas: nada de `../` nem de sair do atributo. Sem medida, nao vira imagem.
  if (FOTO_DO_ACERVO.test(src)) {
    const medida = /^(\d{1,5})x(\d{1,5})$/.exec(String(token.attrGet("title") ?? ""));
    return medida ? tag(medida[1], medida[2]) : escapar(alt);
  }

  const prefixo = "/img/post/";
  if (!src.startsWith(prefixo)) return escapar(alt);

  const medida = lerNomeDoArquivo(src.slice(prefixo.length));
  if (!medida) return escapar(alt);

  return tag(medida.largura, medida.altura);
};

/** O endereco de uma foto do acervo em /img/blog/. Ver a regra de imagem acima. */
export const FOTO_DO_ACERVO = /^\/img\/blog\/[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png)$/;

/** Converte o corpo do post em HTML pronto para a pagina. */
export function markdownParaHtml(texto: string): string {
  return md.render(texto ?? "");
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Desfaz o escape do HTML. O markdown-it escreve `&`, `<`, `>` e `"` como
 * entidade; apagar as entidades tirava esses sinais do resumo que vai ao
 * Google ("O "efeito rebote" & a dor < 3 meses" saia sem aspas, sem & e sem <).
 */
function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira, nome: string) => {
    if (nome[0] === "#") {
      const codigo = nome[1].toLowerCase() === "x" ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
      return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : " ";
    }
    return ENTIDADES[nome.toLowerCase()] ?? " ";
  });
}

/** Texto puro do Markdown — para resumo automatico e contagem de palavras. */
export function markdownParaTexto(texto: string): string {
  // As marcas saem ANTES de desfazer o escape: um "<" que ela escreveu nao
  // pode ser confundido com o comeco de uma marca e levar o texto junto.
  return decodificarEntidades(md.render(texto ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function contarPalavras(corpo: string): number {
  const t = markdownParaTexto(corpo);
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Resumo tirado do proprio texto, quando quem escreveu nao dita um.
 * Corta na fronteira de palavra para nao terminar no meio de uma.
 */
export function resumoAutomatico(corpo: string, limite = 180): string {
  const t = markdownParaTexto(corpo);
  if (t.length <= limite) return t;
  const corte = t.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > 40 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}
