import {
  ABERTURA_DO_ATENDIMENTO,
  ASSINATURA_DO_ATENDIMENTO,
  CITACAO_DO_ATENDIMENTO,
  ETAPAS_DO_ATENDIMENTO,
  FECHO_DO_ATENDIMENTO,
  FOTOS_DAS_ETAPAS,
  FOTO_DO_TOPO_DO_ATENDIMENTO,
  INTRODUCAO_DO_ATENDIMENTO,
  SEPARADOR_DO_ATENDIMENTO,
  TITULO_DO_ATENDIMENTO,
} from "./atendimento";
import { chaveDaPagina, type ConteudoDoSite } from "./conteudo-tipos";
import { ilustracaoDaPagina, type Foto } from "./ilustracao-da-pagina";
import { NAV_GROUPS } from "./nav";
import { PAGINAS_DINAMICAS, descricaoDaPagina, type Pagina } from "./pages";
import { dividirEmSecoes } from "./secoes";

/**
 * As paginas que nasceram no codigo, na forma de uma pagina do painel.
 *
 * Sao duas fontes: as 17 paginas do site antigo (pages.json, menos Contato,
 * que no lugar do texto tem o mapa e os telefones) com as fotos que o painel
 * guardava para cada uma, e "Como e o meu atendimento", escrita depois em
 * lib/atendimento.ts. A mesma conversao serve a importacao para o banco
 * (paginas-db.ts) e o site sem banco (paginas-do-site.ts), entao as duas
 * mostram a mesma pagina.
 *
 * Nada do texto muda. O corpo continua o HTML de sempre; o que entra nele sao
 * as fotos de apoio, como <figure>, logo depois do titulo ao lado do qual a
 * pagina ja as mostrava (lib/fluxo.ts). A foto ao lado do titulo da pagina
 * vira a capa, com a descricao e a legenda que tinha.
 */
export type PaginaDoAcervo = {
  slug: string;
  titulo: string;
  /** Subtitulo; vazio = a pagina usa a descricao do site (a reserva). */
  resumo: string;
  /** Grupo do menu, ou "" fora dele. */
  categoria: string;
  capa: string;
  capaAlt: string;
  capaLegenda: string;
  corpo: string;
  descricao: string;
  identificacao: string[];
  ordem: number;
};

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function figuraHtml(foto: Pick<Foto, "src" | "alt" | "largura" | "altura" | "legenda">): string {
  const legenda = foto.legenda ? `<figcaption>${escapar(foto.legenda)}</figcaption>` : "";
  return (
    `<figure><img src="${escapar(foto.src)}" alt="${escapar(foto.alt)}"` +
    ` width="${foto.largura}" height="${foto.altura}">${legenda}</figure>`
  );
}

/** Grupo e posicao no menu, pelo endereco. */
function noMenu(slug: string): { categoria: string; ordem: number } {
  const href = `/${slug}`.normalize("NFC");
  for (const grupo of NAV_GROUPS) {
    const i = grupo.items.findIndex((item) => item.href.normalize("NFC") === href);
    if (i >= 0) return { categoria: grupo.label, ordem: i };
  }
  return { categoria: "", ordem: 0 };
}

/**
 * O corpo com as fotos de apoio depois do titulo da ancora (sem ancora, ou
 * com uma que o texto nao tem, depois do primeiro titulo; sem titulo, no
 * comeco). E' onde lib/fluxo.ts as punha.
 */
export function corpoComFotos(html: string, apoio: Foto[]): string {
  if (apoio.length === 0) return html;
  const figuras = apoio.map(figuraHtml).join("");
  const doc = dividirEmSecoes(html);
  if (doc.secoes.length === 0 || !doc.nivel) return figuras + html;
  const ancora = apoio[0].secao;
  const k = Math.max(0, doc.secoes.findIndex((s) => s.id === ancora));
  // A posicao no HTML ORIGINAL, e nao o HTML que dividirEmSecoes devolve:
  // aquele ja traz o destaque marcado e os ids nos titulos, e remontar a
  // pagina com ele mudaria o paragrafo que a proxima leitura marca.
  const aberturas = [...html.matchAll(new RegExp(`<${doc.nivel}[\\s>]`, "g"))];
  const inicio = aberturas[k]?.index;
  if (inicio === undefined) return figuras + html;
  const fecha = html.indexOf(`</${doc.nivel}>`, inicio);
  if (fecha < 0) return figuras + html;
  const depois = fecha + doc.nivel.length + 3;
  return html.slice(0, depois) + figuras + html.slice(depois);
}

/** Uma pagina do site antigo, com as fotos que o painel guardava para ela. */
export function paginaDoAcervo(pagina: Pagina, conteudo: ConteudoDoSite): PaginaDoAcervo {
  const chave = chaveDaPagina(pagina.slug);
  const ilustracao = ilustracaoDaPagina(pagina.slug, chave ? conteudo[chave] : null);
  // A descricao de busca que a pagina tinha; vazia, ela usava a do site.
  const descricao = descricaoDaPagina(pagina, "");
  const resumo = pagina.abertura?.subtitulo ?? descricao;
  return {
    slug: pagina.slug.normalize("NFC"),
    titulo: pagina.titulo || pagina.tituloOriginal || pagina.slug,
    resumo,
    ...noMenu(pagina.slug),
    capa: ilustracao.foto?.src ?? "",
    capaAlt: ilustracao.foto?.alt ?? "",
    capaLegenda: ilustracao.foto?.legenda ?? "",
    corpo: corpoComFotos(pagina.html, ilustracao.apoio ?? []),
    // So guarda quando difere do subtitulo: nas outras, a descricao e' ele.
    descricao: descricao !== resumo ? descricao : "",
    identificacao: pagina.abertura?.identificacao ?? [],
    ordem: noMenu(pagina.slug).ordem,
  };
}

/** "Como e o meu atendimento", do texto da cliente em lib/atendimento.ts. */
export function paginaDoAtendimento(): PaginaDoAcervo {
  const p = (t: string) => `<p>${escapar(t)}</p>`;
  const etapas = ETAPAS_DO_ATENDIMENTO.map((etapa) => {
    const foto = FOTOS_DAS_ETAPAS[etapa.id];
    const corte = etapa.lista ? (etapa.listaDepois ?? etapa.paragrafos.length) : etapa.paragrafos.length;
    const lista = etapa.lista
      ? `<ul>${etapa.lista
          .map((r) => `<li>${r.href ? `<a href="${escapar(encodeURI(r.href))}">${escapar(r.texto)}</a>` : escapar(r.texto)}</li>`)
          .join("")}</ul>`
      : "";
    return (
      `<h2>${escapar(etapa.titulo)}</h2>` +
      (foto ? figuraHtml(foto) : "") +
      etapa.paragrafos.slice(0, corte).map(p).join("") +
      lista +
      etapa.paragrafos.slice(corte).map(p).join("")
    );
  });
  const fecho =
    "<hr>" +
    p(SEPARADOR_DO_ATENDIMENTO) +
    FECHO_DO_ATENDIMENTO.map(p).join("") +
    `<blockquote><p>${escapar(CITACAO_DO_ATENDIMENTO)}</p></blockquote>` +
    `<p><strong>${escapar(ASSINATURA_DO_ATENDIMENTO.nome)}</strong><br>${escapar(ASSINATURA_DO_ATENDIMENTO.especialidades)}</p>`;
  return {
    slug: "como-e-o-meu-atendimento",
    titulo: TITULO_DO_ATENDIMENTO,
    resumo: ABERTURA_DO_ATENDIMENTO.join(" "),
    ...noMenu("como-e-o-meu-atendimento"),
    capa: FOTO_DO_TOPO_DO_ATENDIMENTO.src,
    capaAlt: FOTO_DO_TOPO_DO_ATENDIMENTO.alt,
    capaLegenda: FOTO_DO_TOPO_DO_ATENDIMENTO.legenda,
    corpo: INTRODUCAO_DO_ATENDIMENTO.map(p).join("") + etapas.join("") + fecho,
    descricao: "",
    identificacao: [],
    ordem: noMenu("como-e-o-meu-atendimento").ordem,
  };
}

/** Endereco da pagina com texto proprio do codigo, que nao vai para o banco. */
export const SLUG_DO_CONTATO = "contato";

/**
 * Todas as paginas do codigo, na ordem do menu de hoje. `conteudo` traz as
 * fotos (as publicadas no painel, ou as originais).
 */
export function paginasDoAcervo(conteudo: ConteudoDoSite): PaginaDoAcervo[] {
  return [
    ...PAGINAS_DINAMICAS.filter((p) => p.slug !== SLUG_DO_CONTATO).map((p) => paginaDoAcervo(p, conteudo)),
    paginaDoAtendimento(),
  ];
}
