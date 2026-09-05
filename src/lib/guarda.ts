import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerBilhete, NOME_COOKIE, segredoConfigurado, type Sessao } from "./sessao";
import { SITE_URL } from "./site";

/**
 * A porta unica do painel.
 *
 * Toda rota que escreve comeca chamando `exigirSessao`. E de proposito que
 * exista uma funcao so: espalhar a checagem por cada rota e como se perde uma
 * delas. Ha um exemplo vivo disso — um site irmao ficou com `POST`, `PUT` e
 * `DELETE` abertos para a internet inteira enquanto a tela mostrava um cadeado,
 * porque a senha era conferida so no navegador.
 *
 * Duas coisas sao verificadas, nao uma:
 *  1. o bilhete de sessao e valido e nao venceu;
 *  2. o pedido nasceu deste site, e nao de uma pagina de outra origem.
 */

export type Autorizacao =
  | { ok: true; sessao: Sessao }
  | { ok: false; resposta: NextResponse };

function recusar(motivo: string, status: number): { ok: false; resposta: NextResponse } {
  return {
    ok: false,
    // A resposta nao diz qual das checagens falhou. Detalhar ajudaria so quem
    // esta tentando descobrir como entrar.
    resposta: NextResponse.json({ erro: motivo }, { status }),
  };
}

/**
 * Segunda barreira contra pedido forjado de outro site.
 *
 * O cookie ja e `SameSite=Strict`, o que impede o navegador de manda-lo num
 * pedido vindo de fora. Isto aqui e a checagem redundante para o caso de um
 * navegador antigo, ou de um dia em que alguem afrouxe o cookie sem perceber.
 *
 * `Sec-Fetch-Site` e o sinal preferido: o navegador o escreve e a pagina nao
 * consegue muda-lo. `Origin` e o reserva.
 */
export async function pedidoVeioDaqui(): Promise<boolean> {
  const h = await headers();

  const local = h.get("sec-fetch-site");
  if (local) return local === "same-origin" || local === "none";

  const origem = h.get("origin");
  if (!origem) {
    // Sem `Origin` e sem `Sec-Fetch-Site` nao da para afirmar a procedencia.
    // Recusar e a escolha segura; navegador atual sempre manda ao menos um.
    return false;
  }

  const anfitriao = h.get("host");
  try {
    const url = new URL(origem);
    if (anfitriao && url.host === anfitriao) return true;
    return url.origin === SITE_URL;
  } catch {
    return false;
  }
}

/**
 * Devolve a sessao valida, ou a resposta pronta de recusa.
 *
 * Uso obrigatorio na PRIMEIRA linha de toda rota de escrita:
 *
 * ```ts
 * const auth = await exigirSessao();
 * if (!auth.ok) return auth.resposta;
 * ```
 */
export async function exigirSessao(): Promise<Autorizacao> {
  const segredo = segredoConfigurado();
  if (!segredo) {
    // Falha fechada: sem segredo de assinatura, ninguem entra. O contrario —
    // liberar quando falta configuracao — e como painel vira porta aberta.
    console.error("[painel] ADMIN_SESSION_SECRET ausente ou curto demais");
    return recusar("Painel indisponivel.", 503);
  }

  if (!(await pedidoVeioDaqui())) {
    return recusar("Pedido recusado.", 403);
  }

  const bilhete = (await cookies()).get(NOME_COOKIE)?.value;
  const sessao = lerBilhete(bilhete, segredo);
  if (!sessao) return recusar("Faca login para continuar.", 401);

  return { ok: true, sessao };
}

/** Versao sem resposta pronta, para paginas decidirem o que renderizar. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const segredo = segredoConfigurado();
  if (!segredo) return null;
  const bilhete = (await cookies()).get(NOME_COOKIE)?.value;
  return lerBilhete(bilhete, segredo);
}
