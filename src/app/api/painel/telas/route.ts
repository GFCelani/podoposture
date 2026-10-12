import { NextResponse } from "next/server";

import { exigirSessao } from "@/lib/guarda";
import { bancoConfigurado } from "@/lib/painel-db";
import { listarTelas } from "@/lib/telas-db";
import { inferirZoom, lerUserAgent } from "@/lib/telas-do-painel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * As telas de quem entrou no painel (lib/telas-do-painel.ts), as mais
 * recentes primeiro, com o zoom e a escala do sistema inferidos e o
 * navegador lido do user agent. Para quem cuida do site saber o tamanho
 * real da janela da cliente; aparece recolhido no fim de Visitas e buscas.
 */
export async function GET() {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;
  if (!bancoConfigurado()) return NextResponse.json({ telas: [], semBanco: true });
  try {
    const telas = (await listarTelas(50)).map((t) => ({
      ...t,
      ...lerUserAgent(t.userAgent),
      ...inferirZoom(t, t.userAgent),
    }));
    return NextResponse.json({ telas, semBanco: false });
  } catch (erro) {
    console.error("[painel] falha ao ler as telas:", erro);
    return NextResponse.json({ erro: "Não foi possível ler as telas." }, { status: 502 });
  }
}
