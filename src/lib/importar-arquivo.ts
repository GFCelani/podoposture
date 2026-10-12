import { htmlParaMarkdown } from "./html-para-markdown";
import { lerNomeDoArquivo } from "./imagem-webp";
import { IMAGENS_DO_SITE } from "./imagens-do-site";
import { LIMITES_POST } from "./painel-tipos";

/**
 * Um arquivo .md (ou .html) virando rascunho no editor do painel, para post
 * e para pagina, com o mesmo mapeamento:
 *
 *   - o titulo e' o `title` do frontmatter, se houver, senao o primeiro h1;
 *     o h1 sai do corpo (o titulo ja e' o h1 da pagina), e outro h1 que
 *     sobrar vira h2: a pagina tem um titulo so;
 *   - o primeiro paragrafo logo depois do titulo vira o subtitulo quando
 *     cabe num (curto, uma frase de abertura, com texto depois dele);
 *     `description`/`subtitle` do frontmatter, se houver, vencem;
 *   - h2 e h3 ficam como estao: sao as secoes; blockquote e' a citacao em
 *     destaque; listas, links e negrito passam intactos;
 *   - imagem com endereco da internet fica como esta, com aviso (o site so
 *     mostra imagem hospedada nele); imagem de arquivo local, que nao existe
 *     no site, sai do texto e vira aviso. Nunca erro.
 *
 * Nada aqui publica nem grava: o resultado preenche o editor, que mostra a
 * previa e so salva quando ela clica. A seguranca e' a do editor: o corpo e'
 * Markdown, e a conversao (lib/markdown.ts) nao gera HTML do que se digita.
 *
 * Puro e sem DOM proprio: roda no navegador (o painel) e no teste.
 */

export type Importado = {
  titulo: string;
  resumo: string;
  corpo: string;
  /** O que nao entrou como estava, dito para ela, em frases curtas. */
  avisos: string[];
};

/** Teto do arquivo: o corpo cabe em 120 mil caracteres; folga para o frontmatter. */
export const TAMANHO_MAXIMO_DO_ARQUIVO = 256 * 1024;

export const EXTENSOES_ACEITAS = [".md", ".markdown", ".html", ".htm"] as const;

export type ErroDeImportacao = { erro: string };

/** O nome e o tamanho do arquivo, antes de ler: so .md e .html, e nao grande demais. */
export function conferirArquivo(nome: string, tamanho: number): ErroDeImportacao | null {
  const extensao = nome.toLowerCase().match(/\.[a-z]+$/)?.[0] ?? "";
  if (!(EXTENSOES_ACEITAS as readonly string[]).includes(extensao)) {
    return { erro: "Escolha um arquivo .md (Markdown) ou .html. Outros formatos não são aceitos." };
  }
  if (tamanho > TAMANHO_MAXIMO_DO_ARQUIVO) {
    return { erro: "O arquivo é grande demais (máximo de 256 KB). Divida o texto em dois." };
  }
  if (tamanho === 0) return { erro: "O arquivo está vazio." };
  return null;
}

/* --------------------------------------------------------------- frontmatter */

function lerFrontmatter(texto: string): { campos: Record<string, string>; resto: string } {
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(texto);
  if (!m) return { campos: {}, resto: texto };
  const campos: Record<string, string> = {};
  for (const linha of m[1].split("\n")) {
    const par = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(linha);
    if (!par) continue;
    campos[par[1].toLowerCase()] = par[2].trim().replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
  }
  return { campos, resto: texto.slice(m[0].length) };
}

/* -------------------------------------------------------------------- blocos */

/** O Markdown em blocos separados por linha em branco, sem quebrar cerca de codigo. */
function blocosDe(texto: string): string[] {
  const blocos: string[] = [];
  let atual: string[] = [];
  let naCerca = false;
  for (const linha of texto.split("\n")) {
    if (/^\s*(```|~~~)/.test(linha)) naCerca = !naCerca;
    if (!naCerca && linha.trim() === "") {
      if (atual.length) blocos.push(atual.join("\n"));
      atual = [];
    } else {
      atual.push(linha);
    }
  }
  if (atual.length) blocos.push(atual.join("\n"));
  return blocos;
}

const H1 = /^#[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const H1_SUBLINHADO = /^(.+)\n=+[ \t]*$/;

/** Paragrafo comum: nao e' titulo, lista, citacao, imagem, tabela, codigo nem fio. */
function ehParagrafo(bloco: string): boolean {
  return !/^\s*(#|[-*+][ \t]|\d+[.)][ \t]|>|!\[|\||```|~~~|<|(?:-{3,}|\*{3,}|_{3,})\s*$)/.test(bloco);
}

/** Texto do paragrafo para o subtitulo: sem marcas de enfase e sem quebra. */
function textoSimples(bloco: string): string {
  return bloco
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_|==|\+\+)(.+?)\1/g, "$2")
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

/* ------------------------------------------------------------------- imagens */

function imagemDoSite(src: string): boolean {
  if (Object.hasOwn(IMAGENS_DO_SITE, src)) return true;
  return src.startsWith("/img/post/") && lerNomeDoArquivo(src.slice("/img/post/".length)) !== null;
}

/**
 * As imagens do texto: as do site ficam; as da internet ficam, com aviso; as
 * de arquivo local saem, com aviso.
 */
function tratarImagens(corpo: string, avisos: string[]): string {
  const externas: string[] = [];
  const locais: string[] = [];
  const saida = corpo.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (inteira, _alt: string, src: string) => {
    if (imagemDoSite(src)) return inteira;
    if (/^https?:\/\//i.test(src)) {
      externas.push(src);
      return inteira;
    }
    locais.push(src);
    return "";
  });
  if (externas.length) {
    avisos.push(
      `${externas.length === 1 ? "Uma imagem aponta" : `${externas.length} imagens apontam`} para outro site (${externas
        .slice(0, 3)
        .join(", ")}${externas.length > 3 ? "…" : ""}). O endereço ficou no texto, mas o site só mostra imagem enviada pelo painel: no lugar dela aparece a descrição. Para mostrar a foto, envie pelo botão Imagem.`,
    );
  }
  if (locais.length) {
    avisos.push(
      `${locais.length === 1 ? "Uma imagem do arquivo não existe" : `${locais.length} imagens do arquivo não existem`} no site (${locais
        .slice(0, 3)
        .join(", ")}${locais.length > 3 ? "…" : ""}) e ${locais.length === 1 ? "saiu" : "saíram"} do texto. Envie cada uma pelo botão Imagem, no lugar em que ela deve ficar.`,
    );
  }
  return saida;
}

/* ------------------------------------------------------------------ mapeamento */

/** Um .md no formato do editor. */
export function importarMarkdown(bruto: string): Importado {
  const avisos: string[] = [];
  const texto = bruto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const { campos, resto } = lerFrontmatter(texto);
  const blocos = blocosDe(resto);

  // o titulo: o do frontmatter, senao o primeiro h1; o h1 sai do corpo
  let titulo = campos.title ?? campos.titulo ?? "";
  const iTitulo = blocos.findIndex((b) => H1.test(b) || H1_SUBLINHADO.test(b));
  if (iTitulo >= 0) {
    const m = H1.exec(blocos[iTitulo]) ?? H1_SUBLINHADO.exec(blocos[iTitulo]);
    if (!titulo) titulo = textoSimples(m![1]);
    blocos.splice(iTitulo, 1);
  }

  // o subtitulo: o do frontmatter, ou o paragrafo curto logo depois do titulo
  let resumo = campos.description ?? campos.subtitle ?? campos.subtitulo ?? campos.resumo ?? "";
  const iDepois = iTitulo >= 0 ? iTitulo : 0;
  const candidato = blocos[iDepois];
  if (
    !resumo &&
    iTitulo >= 0 &&
    candidato !== undefined &&
    ehParagrafo(candidato) &&
    blocos.length > iDepois + 1 &&
    textoSimples(candidato).length <= 220 &&
    !/:\s*$/.test(candidato.trim())
  ) {
    resumo = textoSimples(candidato);
    blocos.splice(iDepois, 1);
  }

  // outro h1 que sobrar vira h2: o titulo da pagina e' o unico h1
  let corpo = blocos
    .map((b) => b.replace(/^#(?!#)([ \t]+)/gm, "##$1").replace(/^(.+)\n=+[ \t]*$/m, "## $1"))
    .join("\n\n");
  corpo = tratarImagens(corpo, avisos).replace(/\n{3,}/g, "\n\n").trim();

  if (/<\/?[a-z][\w-]*(\s[^>]*)?>/i.test(corpo.replace(/```[\s\S]*?```/g, ""))) {
    avisos.push("O arquivo tem trechos em HTML, que o site mostra como texto. Confira na prévia e reescreva esses trechos.");
  }
  if (!titulo) avisos.push("O arquivo não tem título (nem um # Título, nem title no começo). Escreva o título no campo.");
  if (titulo.length > LIMITES_POST.titulo) avisos.push(`O título tem mais de ${LIMITES_POST.titulo} caracteres. Encurte antes de salvar.`);
  if (resumo.length > LIMITES_POST.resumo) avisos.push(`O subtítulo tem mais de ${LIMITES_POST.resumo} caracteres. Encurte antes de salvar.`);
  if (corpo.length > LIMITES_POST.corpo) avisos.push("O texto passou do limite de 120 mil caracteres. Divida em duas partes antes de salvar.");

  return { titulo, resumo, corpo, avisos };
}

/**
 * Um .html: o conversor que o painel ja usa para os posts antigos
 * (html-para-markdown.ts) e o mesmo mapeamento do .md. O conversor so mantem
 * imagem do proprio site; as outras somem, e o aviso diz quantas.
 */
export function importarHtml(html: string): Importado {
  const corpoDoHtml = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const semRuido = corpoDoHtml.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, "");
  const imagens = (semRuido.match(/<img\b/gi) ?? []).length;
  const md = htmlParaMarkdown(semRuido);
  const ficaram = (md.match(/!\[/g) ?? []).length;
  const importado = importarMarkdown(md);
  if (imagens > ficaram) {
    importado.avisos.unshift(
      `${imagens - ficaram === 1 ? "Uma imagem do arquivo saiu" : `${imagens - ficaram} imagens do arquivo saíram`} do texto: o site só mostra imagem enviada pelo painel. Envie pelo botão Imagem, no lugar em que ela deve ficar.`,
    );
  }
  return importado;
}

/** Pelo nome do arquivo, o mapeamento certo. */
export function importarArquivo(nome: string, conteudo: string): Importado {
  return /\.html?$/i.test(nome) ? importarHtml(conteudo) : importarMarkdown(conteudo);
}
