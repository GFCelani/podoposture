import { NextResponse } from "next/server";

import { listarSecoesSalvas } from "@/lib/conteudo-db";
import { estadosDasSecoes } from "@/lib/conteudo-do-site";
import { PAGINAS_DE_DESTINO, type RespostaDoInicio } from "@/lib/conteudo-tipos";
import { exigirSessao } from "@/lib/guarda";
import { bancoConfigurado } from "@/lib/painel-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tudo o que a aba "Página inicial" precisa numa ida so: cada secao com o
 * padrao, o publicado e o rascunho, mais a lista fechada de paginas que um
 * botao pode abrir.
 *
 * Sem banco responde 200 com `semBanco`, e nao 503: o painel ainda consegue
 * mostrar o texto de hoje e explicar por que salvar esta desligado. Quem
 * responde 503 e a escrita.
 */
export async function GET() {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  if (!bancoConfigurado()) {
    const corpo: RespostaDoInicio = {
      secoes: estadosDasSecoes(new Map()),
      destinos: PAGINAS_DE_DESTINO,
      semBanco: true,
    };
    return NextResponse.json(corpo);
  }

  try {
    const corpo: RespostaDoInicio = {
      secoes: estadosDasSecoes(await listarSecoesSalvas()),
      destinos: PAGINAS_DE_DESTINO,
      semBanco: false,
    };
    return NextResponse.json(corpo);
  } catch (erro) {
    console.error("[painel] falha ao ler o conteudo da pagina inicial:", erro);
    return NextResponse.json(
      { erro: "Não foi possível carregar os textos da página inicial. Recarregue em instantes." },
      { status: 502 },
    );
  }
}
