import { NextResponse } from "next/server";

import { exigirSessao } from "@/lib/guarda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A sonda de sessao do painel.
 *
 * Antes, o painel descobria se a senha ainda valia pedindo a lista de posts.
 * Com as abas isso deixou de servir: a lista de posts pode falhar por motivo
 * que nada tem a ver com a sessao (banco fora, banco nao ligado), e uma aba
 * que nao e a de textos nao deveria depender da rota de outra aba para abrir.
 * Esta rota responde uma pergunta so, e por isso nunca toca no banco.
 *
 * Responde 200 com `{ autenticado }`, e nao 401: quem abre /publicar sem sessao
 * esta no caminho NORMAL da tela de senha, e o 401 deixava uma linha vermelha
 * no console do navegador em toda visita — ruido que treina quem cuida do site
 * a ignorar o console. O 401 continua sendo a resposta de toda rota que exige
 * sessao; aqui a pergunta e outra, e a resposta e um booleano e nada mais: nem
 * o motivo da recusa, nem quando a sessao vence, nem se a senha ja foi criada.
 *
 * O 503 escapa dessa regra de proposito. Painel sem `ADMIN_SESSION_SECRET` nao
 * e "sem sessao": e servidor por configurar, e a tela precisa dizer isso em vez
 * de pedir para sempre uma senha que nunca vai valer.
 *
 * A guarda continua na primeira linha. O teste de rotas protegidas registra
 * esta rota como sonda e exige `exigirSessao()` aqui do mesmo jeito — o que ele
 * deixa de exigir e so o `return auth.resposta`.
 */
export async function GET() {
  const auth = await exigirSessao();
  if (!auth.ok && auth.resposta.status === 503) return auth.resposta;

  return NextResponse.json({ autenticado: auth.ok });
}
