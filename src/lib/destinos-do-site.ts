import "server-only";

import { cache } from "react";

import { DESTINOS_DO_CODIGO, PAGINAS_DE_DESTINO, type DestinoConhecido } from "./conteudo-tipos";
import { paginasPublicadas } from "./paginas-do-site";
import { todosOsPosts } from "./posts-do-site";

/**
 * Para onde os botoes da pagina inicial podem levar: as paginas publicadas
 * (com Contato e o indice do blog, que moram no codigo) e os textos
 * publicados do blog. Pagina ou texto novo vira destino sem mexer no codigo.
 *
 * O nome de pagina que ja existia e' o do menu ("Tratamento da Dor"); o de
 * pagina nova, o titulo dela.
 */
const ROTULOS = new Map(PAGINAS_DE_DESTINO.map((p) => [p.slug, p.rotulo]));
const FIXOS = PAGINAS_DE_DESTINO.filter((p) => p.slug === "contato" || p.slug === "nosso-blog");

const lerDestinos = cache(async (): Promise<DestinoConhecido[]> => {
  const [paginas, posts] = await Promise.all([paginasPublicadas(), todosOsPosts()]);
  const dePaginas: DestinoConhecido[] = paginas.map((p) => ({
    tipo: "pagina",
    slug: p.slug.normalize("NFC"),
    rotulo: ROTULOS.get(p.slug.normalize("NFC")) ?? p.titulo.replace(/(?<!\.\.)\.$/, ""),
  }));
  const dePosts: DestinoConhecido[] = posts.map((p) => ({ tipo: "post", slug: p.slug.normalize("NFC"), rotulo: p.title }));
  return [...dePaginas, ...FIXOS.map((p) => ({ tipo: "pagina" as const, ...p })), ...dePosts];
});

/** Os destinos do banco. Lanca com o banco fora: quem grava precisa da lista certa. */
export function destinosDoSite(): Promise<DestinoConhecido[]> {
  return lerDestinos();
}

/**
 * Para ler o conteudo publicado: com o banco fora, a lista do codigo, que e'
 * o que a pagina ja mostrava (o conteudo cai no padrao nesse caso de todo jeito).
 */
export async function destinosParaLer(): Promise<readonly DestinoConhecido[]> {
  try {
    return await lerDestinos();
  } catch {
    return DESTINOS_DO_CODIGO;
  }
}
