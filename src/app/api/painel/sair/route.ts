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

  // Fora da guarda de proposito: o teste de rotas protegidas exige que a
  // primeira instrucao do handler seja a checagem de procedencia, e envolve-la
  // num try esconderia essa exigencia do parser.
  try {
    const cabecalhos = await headers();
    const armazem = await cookies();
    armazem.set({
      ...opcoesDoCookie(ehLocalhost(cabecalhos.get("host"))),
      value: "",
      maxAge: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    // Sem isto, uma excecao aqui viraria 500 sem corpo, fora do formato `{erro}`
    // que as outras rotas do painel devolvem.
    //
    // A mensagem NAO manda fechar a aba: o cookie de sessao tem `maxAge` de 8h
    // (src/lib/sessao.ts), entao ele sobrevive a fechar a aba e ate o navegador.
    // Dizer o contrario faria a clinica acreditar que saiu quando nao saiu — e
    // num computador compartilhado isso e' a diferenca entre encerrar a sessao
    // e deixar o painel aberto para quem sentar depois.
    console.error("[painel] falha ao sair:", erro);
    return NextResponse.json(
      {
        erro: "Não foi possível sair agora. Tente de novo em instantes; a senha volta a ser pedida em até 8 horas.",
      },
      { status: 502 },
    );
  }
}
