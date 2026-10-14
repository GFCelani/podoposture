import { GRUPOS_DO_MENU, ehGrupoDoMenu, type GrupoDoMenu, type ResumoDaPagina } from "./paginas-tipos";

/**
 * A ordem das paginas dentro de cada grupo do menu, como a aba "Paginas do
 * site" mostra e muda (setas Subir e Descer).
 *
 * O pedido de nova ordem leva a lista INTEIRA do grupo, e nao "suba esta uma
 * casa": o servidor confere que o grupo tem exatamente essas paginas antes de
 * gravar. Se outra janela criou, apagou ou mudou de grupo uma pagina no meio
 * do caminho, o pedido e' recusado e a lista recarrega, em vez de gravar uma
 * ordem montada sobre uma lista velha.
 *
 * Puro: o navegador e o servidor carregam este arquivo.
 */

type Resumo = Pick<ResumoDaPagina, "id" | "titulo" | "categoria" | "ordem">;

export type GrupoDaLista<R extends Resumo> = {
  /** O grupo do menu, ou null para as paginas fora do menu. */
  grupo: GrupoDoMenu | null;
  paginas: R[];
};

/** Mesmo desempate do menu (menu.ts): posicao, depois titulo. */
function naOrdemDoMenu(a: Resumo, b: Resumo): number {
  return a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR");
}

/**
 * As paginas separadas pelos grupos do menu, na ordem do cabecalho, e as fora
 * do menu no fim. Grupo sem pagina nao aparece. Categoria que nao e' grupo do
 * menu (nao deveria existir: a validacao recusa) cai em "fora do menu", para
 * nenhuma pagina sumir da lista.
 */
export function agruparPorMenu<R extends Resumo>(paginas: readonly R[]): GrupoDaLista<R>[] {
  const grupos: GrupoDaLista<R>[] = GRUPOS_DO_MENU.map((grupo) => ({
    grupo,
    paginas: paginas.filter((p) => p.categoria === grupo).sort(naOrdemDoMenu),
  }));
  const fora = paginas.filter((p) => !ehGrupoDoMenu(p.categoria)).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  return [...grupos, { grupo: null, paginas: fora }].filter((g) => g.paginas.length > 0);
}

/**
 * A lista de ids com `id` uma casa acima (-1) ou abaixo (+1). null quando nao
 * ha para onde ir (ja e' a primeira ou a ultima) ou o id nao esta na lista.
 */
export function moverNaLista(ids: readonly string[], id: string, direcao: -1 | 1): string[] | null {
  const de = ids.indexOf(id);
  const para = de + direcao;
  if (de < 0 || para < 0 || para >= ids.length) return null;
  const nova = [...ids];
  [nova[de], nova[para]] = [nova[para], nova[de]];
  return nova;
}

/* ------------------------------------------------------------------ pedido */

/** Teto de paginas num grupo: muito acima do menu de hoje (9 em Tecnicas). */
export const MAXIMO_POR_GRUPO = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PedidoDeOrdem = { grupo: GrupoDoMenu; ids: string[] };

/**
 * O corpo cru do pedido, conferido: grupo do menu de verdade e ids no formato
 * certo, sem repeticao. null para qualquer coisa fora disso.
 */
export function lerPedidoDeOrdem(bruto: unknown): PedidoDeOrdem | null {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return null;
  const { grupo, ids } = bruto as Record<string, unknown>;
  if (typeof grupo !== "string" || !ehGrupoDoMenu(grupo)) return null;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAXIMO_POR_GRUPO) return null;
  if (!ids.every((id): id is string => typeof id === "string" && UUID.test(id))) return null;
  const normalizados = ids.map((id) => id.toLowerCase());
  if (new Set(normalizados).size !== normalizados.length) return null;
  return { grupo, ids: normalizados };
}

/** Os mesmos ids, em qualquer ordem: a lista que chegou e' a do grupo agora. */
export function mesmasPaginas(enviados: readonly string[], noBanco: readonly string[]): boolean {
  if (enviados.length !== noBanco.length) return false;
  const doBanco = new Set(noBanco);
  return enviados.every((id) => doBanco.has(id));
}
