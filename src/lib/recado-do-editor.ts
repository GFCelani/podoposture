/**
 * O recado que o editor deixa para a lista de textos.
 *
 * O editor e a lista nunca estao na tela ao mesmo tempo: o painel troca um pelo
 * outro, e quem sai e desmontado. Duas coisas precisam atravessar essa troca:
 *
 * 1. `reabrir` — a sessao caiu com um texto aberto. Depois da senha, a lista
 *    reabre o mesmo texto e o editor recupera o rascunho do navegador. Sem isto
 *    ela caia na lista e precisava lembrar sozinha qual texto estava escrevendo,
 *    justo quando acabou de ler que "nada se perdeu".
 * 2. `salvo` — a confirmacao de publicar ou guardar. Quem sabe o que aconteceu
 *    e o editor; quem esta na tela quando a resposta chega e a lista. Sem o
 *    recado, publicar terminava num clique mudo.
 *
 * Mora no `sessionStorage`, e nao no `localStorage`: morre com a aba, entao um
 * recado esquecido nunca reabre um texto dias depois, em outra janela. E quem
 * le apaga, para o mesmo recado nao valer duas vezes.
 */

export const CHAVE_DO_RECADO = "podoposture_recado_do_editor";

export type RecadoDoEditor =
  | { tipo: "reabrir"; id: string | null }
  | { tipo: "salvo"; mensagem: string };

export type Armazem = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const ID_DE_POST = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAXIMO_DA_MENSAGEM = 200;

/**
 * Le o recado guardado. Qualquer coisa fora do formato vira `null`: o valor
 * vive no navegador, e um id torto aqui viraria um pedido a uma rota que so
 * aceita UUID.
 */
export function lerRecado(valor: string | null): RecadoDoEditor | null {
  if (!valor) return null;
  let bruto: unknown;
  try {
    bruto = JSON.parse(valor);
  } catch {
    return null;
  }
  if (typeof bruto !== "object" || bruto === null) return null;
  const { tipo, id, mensagem } = bruto as Record<string, unknown>;

  if (tipo === "reabrir") {
    if (id === null) return { tipo, id: null };
    return typeof id === "string" && ID_DE_POST.test(id) ? { tipo, id } : null;
  }
  if (tipo === "salvo") {
    return typeof mensagem === "string" && mensagem && mensagem.length <= MAXIMO_DA_MENSAGEM
      ? { tipo, mensagem }
      : null;
  }
  return null;
}

/** O `sessionStorage` da aba, ou `null` onde ele nao existe ou esta bloqueado. */
export function armazemDaAba(): Armazem | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Navegador com armazenamento bloqueado lanca ja no acesso a propriedade.
    return null;
  }
}

export function deixarRecado(armazem: Armazem | null, recado: RecadoDoEditor): void {
  try {
    armazem?.setItem(CHAVE_DO_RECADO, JSON.stringify(recado));
  } catch {
    // Sem armazenamento o recado se perde, e so ele: o texto continua no
    // rascunho do navegador e a lista abre normalmente.
  }
}

/** Le e apaga. */
export function tomarRecado(armazem: Armazem | null): RecadoDoEditor | null {
  if (!armazem) return null;
  try {
    const valor = armazem.getItem(CHAVE_DO_RECADO);
    armazem.removeItem(CHAVE_DO_RECADO);
    return lerRecado(valor);
  } catch {
    return null;
  }
}
