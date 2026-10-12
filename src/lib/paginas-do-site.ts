import "server-only";

import { cache } from "react";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { BancoEmPausa, emConstrucao } from "./disjuntor";
import type { Foto } from "./ilustracao-da-pagina";
import { lerNomeDoArquivo } from "./imagem-webp";
import { IMAGENS_DO_SITE } from "./imagens-do-site";
import { markdownParaHtml } from "./markdown";
import { montarMenu } from "./menu";
import { NAV_GROUPS, type NavGroup } from "./nav";
import { paginasDoAcervo, SLUG_DO_CONTATO, type PaginaDoAcervo } from "./pagina-do-acervo";
import { MAPA_ASCII_PAGINAS, PAGINAS_DINAMICAS, descricaoDaPagina, rotaDaPagina } from "./pages";
import { bancoConfigurado, lerComDisjuntor, sondarComDisjuntor } from "./painel-db";
import { slugValido } from "./painel-tipos";
import { buscarPaginaPublicada, listarPaginasPublicadas } from "./paginas-db";
import type { PaginaDoPainel, ResumoDaPagina } from "./paginas-tipos";

/**
 * De onde as paginas de conteudo leem. A mesma regra do blog
 * (posts-do-site.ts):
 *
 *   - com banco configurado, so do banco: as paginas do codigo foram para la
 *     no primeiro uso (paginas-db.ts) e dali em diante quem manda e' o painel;
 *   - sem banco, das paginas do codigo, convertidas pela mesma funcao da
 *     importacao (pagina-do-acervo.ts), com as fotos originais;
 *   - banco configurado e fora do ar: a pagina responde erro, nunca uma
 *     versao velha de um texto editado.
 *
 * A excecao e' o menu, lido em toda pagina do site: com o banco fora, ele cai
 * para o menu do codigo (nav.ts) em vez de derrubar o site inteiro.
 */

/** Uma pagina pronta para renderizar. */
export type PaginaDoSite = {
  slug: string;
  titulo: string;
  /** Subtitulo; vazio = a descricao do site. */
  resumo: string;
  grupo: string;
  /** A foto ao lado do titulo. */
  capa: Foto | null;
  html: string;
  /** Descricao de busca propria; vazia = o subtitulo. */
  descricao: string;
  identificacao: string[];
  /** Contato: o corpo e' o mapa e os telefones, nao texto. */
  especial?: "contato";
};

type Resumo = Pick<ResumoDaPagina, "slug" | "titulo" | "categoria" | "ordem">;

function capaDe(p: Pick<PaginaDoAcervo, "capa" | "capaAlt" | "capaLegenda">, medida?: { largura: number; altura: number }): Foto | null {
  if (!p.capa || !medida) return null;
  return { src: p.capa, alt: p.capaAlt, legenda: p.capaLegenda, largura: medida.largura, altura: medida.altura };
}

/* --------------------------------------------------------------- sem banco */

const DO_CODIGO = paginasDoAcervo(CONTEUDO_PADRAO);

function doCodigo(p: PaginaDoAcervo): PaginaDoSite {
  return {
    slug: p.slug,
    titulo: p.titulo,
    resumo: p.resumo,
    grupo: p.categoria,
    capa: capaDe(p, medidaDaCapa(p.capa)),
    html: p.corpo,
    descricao: p.descricao,
    identificacao: p.identificacao,
  };
}

/* ----------------------------------------------------------------- medida */

/** Medida da capa: a da tabela das fotos do site, ou a do nome do arquivo enviado. */
function medidaDaCapa(src: string): { largura: number; altura: number } | undefined {
  if (Object.hasOwn(IMAGENS_DO_SITE, src)) return IMAGENS_DO_SITE[src];
  if (src.startsWith("/img/post/")) return lerNomeDoArquivo(src.slice("/img/post/".length)) ?? undefined;
  return undefined;
}

function doBanco(p: PaginaDoPainel): PaginaDoSite {
  return {
    slug: p.slug,
    titulo: p.titulo,
    resumo: p.resumo,
    grupo: p.categoria,
    capa: capaDe(p, medidaDaCapa(p.capa)),
    html: p.formato === "html" ? p.corpo : markdownParaHtml(p.corpo),
    descricao: p.descricao,
    identificacao: p.identificacao,
  };
}

/* ----------------------------------------------------------------- leitura */

const publicadasDoBanco = cache(async (): Promise<ResumoDaPagina[]> => {
  try {
    return await lerComDisjuntor(listarPaginasPublicadas);
  } catch (erro) {
    if (!(erro instanceof BancoEmPausa)) console.error("[paginas] banco indisponivel ao listar as paginas:", erro);
    throw new Error("banco indisponivel ao listar as paginas", { cause: erro });
  }
});

/** As publicadas, sem o corpo: sitemap, menu, relacionados. */
export async function paginasPublicadas(): Promise<Resumo[]> {
  if (!bancoConfigurado()) return DO_CODIGO;
  return publicadasDoBanco();
}

/** A rota ASCII (ou o proprio slug) de volta ao slug real da pagina. */
function slugReal(slug: string): string {
  return (MAPA_ASCII_PAGINAS.get(slug) ?? slug).normalize("NFC");
}

const paginaDoBanco = cache(async (slug: string): Promise<PaginaDoSite | undefined> => {
  const buscar = async () => {
    const pagina = await buscarPaginaPublicada(slug);
    return pagina ? doBanco(pagina) : undefined;
  };
  try {
    return await (emConstrucao() ? lerComDisjuntor(buscar) : sondarComDisjuntor(buscar));
  } catch (erro) {
    if (!(erro instanceof BancoEmPausa)) console.error("[paginas] banco indisponivel ao buscar pagina:", erro);
    throw new Error("banco indisponivel ao buscar pagina", { cause: erro });
  }
});

/** Contato vem sempre do codigo: o corpo dele e' a secao de contato do site. */
function paginaDoContato(): PaginaDoSite | undefined {
  const bruta = PAGINAS_DINAMICAS.find((p) => p.slug === SLUG_DO_CONTATO);
  if (!bruta) return undefined;
  return {
    slug: bruta.slug,
    titulo: bruta.titulo || bruta.tituloOriginal,
    resumo: bruta.abertura?.subtitulo ?? descricaoDaPagina(bruta, ""),
    grupo: "A Clínica",
    capa: null,
    html: "",
    descricao: "",
    identificacao: [],
    especial: "contato",
  };
}

/** A pagina de um endereco (o segmento da rota, ASCII quando ha traducao). */
export async function buscarPaginaDoSite(segmento: string): Promise<PaginaDoSite | undefined> {
  const slug = slugReal(segmento);
  if (slug === SLUG_DO_CONTATO) return paginaDoContato();
  if (!bancoConfigurado()) {
    const p = DO_CODIGO.find((x) => x.slug === slug);
    return p ? doCodigo(p) : undefined;
  }
  // Endereco que nao e' do site antigo nem tem forma de slug do painel nao
  // chega ao banco: robo varrendo URL inventada nao gasta consulta.
  if (!MAPA_ASCII_PAGINAS.has(segmento) && !DO_CODIGO.some((p) => p.slug === slug) && !slugValido(slug)) {
    return undefined;
  }
  return paginaDoBanco(slug);
}

/** As rotas que o build pre-gera: as publicadas, na forma ASCII, e Contato. */
export async function paginasAGerar(): Promise<string[]> {
  const publicadas = await paginasPublicadas();
  return [...new Set([...publicadas.map((p) => rotaDaPagina(p.slug)), rotaDaPagina(SLUG_DO_CONTATO)])];
}

/* -------------------------------------------------------------------- menu */

/** O menu do site. Com o banco fora, o do codigo, para a pagina nao cair junto. */
export const menuDoSite = cache(async (): Promise<NavGroup[]> => {
  if (!bancoConfigurado()) return NAV_GROUPS;
  try {
    return montarMenu(await publicadasDoBanco());
  } catch {
    return NAV_GROUPS;
  }
});
