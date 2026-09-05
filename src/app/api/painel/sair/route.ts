import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { pedidoVeioDaqui } from "@/lib/guarda";
import { ehLocalhost, opcoesDoCookie } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sair.
 *
 * Nao exige sessao valida de proposito: apagar o cookie nao pode depender de o
 * cookie estar bom. Se o bilhete venceu ou veio corrompido, a pessoa ainda
 * precisa conseguir limpar o estado do navegador e voltar para a tela de senha.
 *
 * A checagem de procedencia continua, para outro site nao deslogar alguem sem
 * querer nem de proposito.
 */
export async function POST() {
  if (!(await pedidoVeioDaqui())) {
    return NextResponse.json({ erro: "Pedido recusado." }, { status: 403 });
  }

  const cabecalhos = await headers();
  const armazem = await cookies();
  armazem.set({
    ...opcoesDoCookie(ehLocalhost(cabecalhos.get("host"))),
    value: "",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
