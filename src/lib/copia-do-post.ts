import type { DadosDoPost } from "./painel-tipos";

/**
 * A copia do texto que ela esta escrevendo, guardada no navegador.
 *
 * Existe pela promessa do painel: nada escrito se perde se a sessao cair ou a
 * aba fechar. Mas uma copia sem data de referencia virou o problema oposto:
 * - "Cancelar" deixava a copia la, e ela voltava sozinha semanas depois, com o
 *   que tinha sido cancelado pronto para ir ao ar no proximo "Publicar";
 * - editado depois em outro aparelho, o texto abria neste navegador com a copia
 *   velha por cima da versao nova do servidor.
 *
 * Por isso a copia guarda `base`: o `atualizadoEm` do texto quando ela nasceu.
 * Se o servidor ainda esta nessa versao, recuperar e seguro; se mudou depois,
 * o editor pergunta em vez de trocar sozinho.
 */

export type CopiaDoPost = {
  dados: DadosDoPost;
  /** `atualizadoEm` do texto quando a copia nasceu; null = texto novo; undefined = copia antiga, sem a marca. */
  base: string | null | undefined;
  guardadaEm: string | null;
};

export function chaveDaCopia(id: string | null | undefined): string {
  return `podoposture_rascunho:${id ?? "novo"}`;
}

function ehDados(valor: unknown): valor is DadosDoPost {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    ["titulo", "resumo", "categoria", "capa", "corpo"].every((campo) => typeof v[campo] === "string") &&
    typeof v.publicado === "boolean"
  );
}

export function escreverCopia(dados: DadosDoPost, base: string | null, agora = new Date()): string {
  return JSON.stringify({ v: 2, dados, base, guardadaEm: agora.toISOString() });
}

/** Le a copia guardada. Formato torto vira null; a copia antiga (so os campos) ainda e lida. */
export function lerCopia(valor: string | null): CopiaDoPost | null {
  if (!valor) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(valor);
  } catch {
    return null;
  }
  if (ehDados(bruto)) return { dados: bruto, base: undefined, guardadaEm: null };
  if (typeof bruto !== "object" || bruto === null) return null;
  const { dados, base, guardadaEm } = bruto as Record<string, unknown>;
  if (!ehDados(dados)) return null;
  return {
    dados,
    base: typeof base === "string" || base === null ? base : undefined,
    guardadaEm: typeof guardadaEm === "string" ? guardadaEm : null,
  };
}

export type DecisaoDaCopia =
  | { tipo: "nenhuma" }
  | { tipo: "aplicar"; copia: CopiaDoPost }
  | { tipo: "perguntar"; copia: CopiaDoPost };

/**
 * O que fazer com a copia ao abrir o editor.
 *
 * - igual ao que veio do servidor: nada;
 * - nascida da mesma versao que o servidor tem agora: recupera sozinha;
 * - o servidor mudou depois (ou nao ha como saber, na copia antiga de um texto
 *   ja salvo): pergunta, sem trocar o que veio do servidor.
 */
export function decidirCopia(
  copia: CopiaDoPost | null,
  inicial: DadosDoPost,
  atualizadoEm: string | null,
): DecisaoDaCopia {
  if (!copia || JSON.stringify(copia.dados) === JSON.stringify(inicial)) return { tipo: "nenhuma" };
  const mesmaVersao = copia.base === undefined ? atualizadoEm === null : copia.base === atualizadoEm;
  return mesmaVersao ? { tipo: "aplicar", copia } : { tipo: "perguntar", copia };
}
