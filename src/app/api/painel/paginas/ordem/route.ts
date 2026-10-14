import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { lerPedidoDeOrdem } from "@/lib/ordem-das-paginas";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";
import { reordenarGrupo } from "@/lib/paginas-db";

import { revalidarPaginas } from "../revalidar";

/**
 * A ordem das paginas num grupo do menu (setas da aba "Paginas do site").
 * O corpo e' `{ grupo, ids }`, a lista inteira do grupo na ordem nova; a
 * regra de recusa mora em ordem-das-paginas.ts e paginas-db.ts.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 200 ids de 36 caracteres e o grupo cabem com folga. */
const TAMANHO_MAXIMO = 16 * 1024;

const DESATUALIZADA =
  "A lista de páginas mudou em outra janela (uma página foi criada, apagada ou trocou de grupo). Ela foi atualizada: confira e mova de novo.";

export async function PUT(req: Request) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;
  if (!bancoConfigurado()) {
    return NextResponse.json({ erro: "O banco de dados ainda não está configurado neste servidor." }, { status: 503 });
  }
  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  let bruto: unknown;
  try {
    bruto = JSON.parse(leitura.texto);
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  const pedido = lerPedidoDeOrdem(bruto);
  if (!pedido) return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  try {
    const feito = await reordenarGrupo(pedido.grupo, pedido.ids);
    if (!feito.ok) return NextResponse.json({ erro: DESATUALIZADA }, { status: 409 });
    await registrarAuditoria("paginas-reordenadas", pedido.grupo, ipDaRequisicao(await headers()));
    // So o menu (que esta no layout) muda; nenhuma pagina muda de endereco.
    revalidarPaginas(null);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[painel] falha ao reordenar paginas:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar a nova ordem." }, { status: 502 });
  }
}
