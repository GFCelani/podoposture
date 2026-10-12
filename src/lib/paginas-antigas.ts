import { ETAPAS_DO_ATENDIMENTO } from "./atendimento";
import { elementos } from "./blocos";
import { chaveDaPagina, type ConteudoDoSite } from "./conteudo-tipos";
import { imagensDoHtml } from "./fluxo";
import type { Foto } from "./ilustracao-da-pagina";
import { dividirEmSecoes } from "./secoes";

/**
 * Pagina antiga e pagina nova.
 *
 * Antigas sao as que existiam antes do layout unico de 2026-10-12: as 18 de
 * pages.json (menos a home e o indice do blog) e Como e o meu atendimento.
 * Elas moram no banco e se editam pelo painel como qualquer outra, mas cada
 * uma continua no renderizador que tinha (components/pagina-interna.tsx):
 *
 *   - a grade de 12 colunas com lateral numerada, sumario e faixas por
 *     bloco (secoes-de-conteudo.tsx), a maioria;
 *   - a grade de duas colunas de Palmilhas (corpo-em-fluxo.tsx);
 *   - a composicao propria do atendimento (como-e-o-meu-atendimento.tsx);
 *   - a secao de contato, em Contato.
 *
 * Toda pagina criada pelo painel e' nova e usa o layout unico
 * (corpo-da-pagina-nova.tsx). A marca e' o endereco: o das antigas esta
 * reservado no banco desde a importacao (livro paginas_importadas), entao
 * pagina nova nunca o recebe, nem depois de uma antiga ser apagada.
 *
 * Sem servidor nem banco aqui: o editor do painel usa este modulo para a
 * previa mostrar o mesmo renderizador do site.
 */

export const SLUG_DO_ATENDIMENTO = "como-e-o-meu-atendimento";
export const SLUG_DAS_PALMILHAS = "palmilhas-personalizadas";

/** Conferida contra pages.json em paginas-antigas.test.ts. */
export const PAGINAS_ANTIGAS: ReadonlySet<string> = new Set(
  [
    "acupuntura",
    "acupuntura-clínica",
    "baropodometria",
    "contato",
    "currículo-profissional",
    "dor-lombar-crônica",
    "flexo-distração",
    "método-posture+",
    "neuromodulação",
    "osteopatia",
    SLUG_DAS_PALMILHAS,
    "posturologia",
    "quem-somos",
    "responsável-técnica",
    "rpg",
    "tratamento-da-dor",
    "tratamento-da-dtm",
    "tratamento-do-zumbido",
    SLUG_DO_ATENDIMENTO,
  ].map((s) => s.normalize("NFC")),
);

export type ModeloDePagina = "antigo" | "novo";

export function modeloDaPagina(slug: string): ModeloDePagina {
  return PAGINAS_ANTIGAS.has(slug.normalize("NFC")) ? "antigo" : "novo";
}

/** Paginas de apresentacao: a grade antiga vai sem numerais nelas. */
const INSTITUCIONAIS = new Set(
  ["quem-somos", "responsável-técnica", "currículo-profissional", "contato"].map((s) => s.normalize("NFC")),
);

export function ehInstitucional(slug: string): boolean {
  return INSTITUCIONAIS.has(slug.normalize("NFC"));
}

/* ------------------------------------------------------------------ fotos */

/** Figura inteira, ou paragrafo que so tem imagem (a forma do Markdown). */
const FIGURA = /<figure\b[^>]*>[\s\S]*?<\/figure>|<p>\s*(?:<img\b[^>]*>\s*)+<\/p>/gi;

/**
 * O corpo do banco de volta na forma que o renderizador antigo recebia: o
 * HTML sem as fotos, e as fotos como `apoio`, presas ao titulo depois do
 * qual estao. E' o inverso de `corpoComFotos` (pagina-do-acervo.ts): a
 * importacao poe as figuras logo depois do titulo da ancora, e aqui elas
 * saem pelo mesmo texto, entao o HTML volta byte a byte ao de antes.
 *
 * O renderizador antigo mostra as fotos de apoio juntas, num lugar so (ao
 * lado do trecho da primeira); foto posta em outro trecho pelo painel vai
 * para junto delas.
 *
 * A ancora: sem ancora escolhida, a importacao pos as fotos depois do
 * primeiro titulo, e o renderizador antigo as punha noutro lugar (na
 * primeira banda em areia). Por isso, quando as fotos sao as mesmas que o
 * registro de fotos da pagina guarda (`conhecidas`), vale a ancora dele, ""
 * inclusive; foto trocada pelo editor ancora no titulo antes dela.
 */
export function separarFotos(
  html: string,
  conhecidas?: { srcs: readonly string[]; ancora: string },
): { html: string; apoio: Foto[] } {
  const achadas = [...html.matchAll(FIGURA)];
  if (achadas.length === 0) return { html, apoio: [] };

  const apoio = achadas.flatMap((m) => imagensDoHtml(m[0]));
  const limpo = html.replace(FIGURA, "");
  if (apoio.length === 0) return { html: limpo, apoio };

  const mesmas =
    conhecidas &&
    conhecidas.srcs.length === apoio.length &&
    conhecidas.srcs.every((src, i) => src === apoio[i].src);
  if (mesmas) {
    if (conhecidas.ancora) apoio[0] = { ...apoio[0], secao: conhecidas.ancora };
    return { html: limpo, apoio };
  }

  // A ancora: o titulo de secao que vem antes da primeira figura.
  const doc = dividirEmSecoes(html);
  const nivel = doc.nivel;
  let secao: string | undefined;
  if (nivel) {
    const antes = html.slice(0, achadas[0].index);
    const quantos = [...antes.matchAll(new RegExp(`<${nivel}[\\s>]`, "g"))].length;
    secao = quantos > 0 ? doc.secoes[quantos - 1]?.id : undefined;
  }
  apoio[0] = secao ? { ...apoio[0], secao } : apoio[0];
  return { html: limpo, apoio };
}

/** O registro das fotos de apoio de uma pagina antiga: os enderecos e a ancora. */
export type FotosDoRegistro = { srcs: string[]; ancora: string };

/**
 * As fotos de apoio que o registro de fotos da pagina guarda (o do painel
 * de antes das paginas irem para o banco), com a ancora: e' o que diz onde
 * o renderizador antigo as punha (ver `separarFotos`).
 */
export function fotosConhecidas(slug: string, conteudo: ConteudoDoSite): FotosDoRegistro | undefined {
  const chave = chaveDaPagina(slug);
  const registro = chave ? conteudo[chave] : null;
  if (!registro) return undefined;
  return { srcs: registro.apoio.map((f) => f.imagem.src), ancora: registro.ancoraDoApoio };
}

/* ------------------------------------------------------------ atendimento */

export type EtapaLida = { id: string; tituloHtml: string; corpoHtml: string; fotos: Foto[] };

export type AtendimentoLido = {
  /** Paragrafos antes da primeira etapa (o primeiro vira o lead). */
  introducao: string[];
  etapas: EtapaLida[];
  fecho: {
    separador: string;
    /** Paragrafos do fecho: o primeiro em destaque. */
    paragrafos: string[];
    citacao: string;
    assinatura: { nome: string; especialidades: string } | null;
  } | null;
};

const ID_POR_TITULO = new Map(ETAPAS_DO_ATENDIMENTO.map((e) => [e.titulo, e.id]));

const textoDe = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

/** Miolo de um elemento (sem a tag de fora). */
const miolo = (html: string) => html.replace(/^<[^>]+>/, "").replace(/<\/[a-z0-9]+>\s*$/i, "");

/**
 * O corpo de Como e o meu atendimento nas pecas da composicao propria dela:
 * introducao, etapas (titulo, texto, foto) e o fecho depois do fio (o
 * separador, os paragrafos, a citacao e a assinatura). E' a forma em que
 * paginaDoAtendimento (pagina-do-acervo.ts) gravou o texto, e a que o
 * Markdown do editor devolve.
 */
export function lerAtendimento(html: string): AtendimentoLido {
  const [antesDoFio, ...depois] = html.split(/<hr\b[^>]*>/i);
  const doc = dividirEmSecoes(antesDoFio);

  const introducao = elementos(doc.abertura)
    .filter((e) => e.tag === "p" && !/<img\b/i.test(e.html))
    .map((e) => miolo(e.html));

  const etapas: EtapaLida[] = doc.secoes.map((s) => {
    const m = /^<(h[23])[^>]*>([\s\S]*?)<\/\1>/.exec(s.html);
    const corpo = m ? s.html.slice(m[0].length) : s.html;
    const { html: corpoHtml, apoio } = separarFotos(corpo);
    const tituloHtml = m ? m[2] : s.titulo;
    return {
      id: ID_POR_TITULO.get(textoDe(tituloHtml)) ?? s.id,
      tituloHtml,
      corpoHtml,
      fotos: apoio.map((f) => {
        const copia = { ...f };
        delete copia.secao;
        return copia;
      }),
    };
  });

  let fecho: AtendimentoLido["fecho"] = null;
  if (depois.length > 0) {
    const els = elementos(depois.join("<hr>"));
    let separador = "";
    if (els[0]?.tag === "p" && !/[\p{L}\p{N}]/u.test(els[0].texto)) separador = miolo(els.shift()!.html);
    const paragrafos: string[] = [];
    let citacao = "";
    let assinatura: { nome: string; especialidades: string } | null = null;
    for (const e of els) {
      if (e.tag === "blockquote") citacao = miolo(e.html).replace(/^\s*<p>|<\/p>\s*$/g, "");
      else if (e.tag === "p" && citacao) {
        const partes = miolo(e.html).split(/<br\s*\/?>/i);
        assinatura = { nome: textoDe(partes[0]), especialidades: textoDe(partes.slice(1).join(" ")) };
      } else if (e.tag === "p") paragrafos.push(miolo(e.html));
    }
    fecho = { separador, paragrafos, citacao, assinatura };
  }

  return { introducao, etapas, fecho };
}
