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
 */
export async function GET() {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  return NextResponse.json({ ok: true });
}
