import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { pedidoVeioDaqui } from "@/lib/guarda";
import {
  esquecerTentativas,
  ipDaRequisicao,
  registrarTentativa,
} from "@/lib/limite-de-tentativas";
import { registrarAuditoria } from "@/lib/painel-db";
import { conferirSenha, hashConfigurado } from "@/lib/senha";
import { criarBilhete, ehLocalhost, opcoesDoCookie, segredoConfigurado } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A porta do painel.
 *
 * A ordem das checagens e do mais barato para o mais caro, e isso e defesa, nao
 * estilo: conferir a senha custa algumas centenas de milissegundos de `scrypt`,
 * e quem esta atacando adoraria que cada tentativa dele consumisse isso do
 * servidor. Procedencia e limite de tentativas vem antes justamente para que a
 * maioria das tentativas nunca chegue ao calculo.
 */

/** O corpo aqui e `{"senha":"..."}`. Nao existe motivo para passar de 4 KB. */
const TAMANHO_MAXIMO = 4 * 1024;

/**
 * Quantos calculos de senha podem correr ao mesmo tempo.
 *
 * `scrypt` come memoria e uma thread do pool do Node. Sem este teto, uma
 * rajada de tentativas erradas satura o pool e o site inteiro — inclusive as
 * paginas publicas — para de responder. Duas tentativas simultaneas e o
 * suficiente para uma pessoa entrando; a terceira espera.
 */
const MAXIMO_EM_VOO = 2;
let emVoo = 0;

export async function POST(req: Request) {
  const cabecalhos = await headers();

  // 1. veio deste site? (barato, e barra pedido forjado de outra origem)
  if (!(await pedidoVeioDaqui())) {
    return NextResponse.json({ erro: "Pedido recusado." }, { status: 403 });
  }

  // 2. limite de tentativas (ainda antes de ler o corpo)
  const origem = ipDaRequisicao(cabecalhos);
  const veredicto = await registrarTentativa(origem);
  if (!veredicto.permitido) {
    const minutos = Math.ceil(veredicto.esperarSegundos / 60);
    // Nao registra auditoria aqui: gravar uma linha por tentativa bloqueada
    // daria a quem ataca um jeito barato de encher a tabela.
    return NextResponse.json(
      { erro: `Tentativas demais. Espere ${minutos} min e tente de novo.` },
      { status: 429, headers: { "Retry-After": String(veredicto.esperarSegundos) } },
    );
  }

  // 3. corpo, com teto em bytes reais
  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 413 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(leitura.texto);
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  const senha = typeof (bruto as { senha?: unknown }).senha === "string"
    ? (bruto as { senha: string }).senha
    : "";

  // 4. o painel esta configurado? falha FECHADA
  const guardado = hashConfigurado();
  const segredo = segredoConfigurado();
  if (!guardado || !segredo) {
    console.error("[painel] ADMIN_PASSWORD_HASH ou ADMIN_SESSION_SECRET ausente");
    return NextResponse.json({ erro: "Painel ainda não configurado." }, { status: 503 });
  }

  // 5. teto de calculos simultaneos
  if (emVoo >= MAXIMO_EM_VOO) {
    return NextResponse.json(
      { erro: "Muitas tentativas ao mesmo tempo. Tente de novo em instantes." },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }

  let confere = false;
  emVoo += 1;
  try {
    confere = senha.length > 0 && (await conferirSenha(senha, guardado));
  } finally {
    emVoo -= 1;
  }

  if (!confere) {
    await registrarAuditoria("login-falhou", null, origem);
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const armazem = await cookies();
  armazem.set({
    ...opcoesDoCookie(ehLocalhost(cabecalhos.get("host"))),
    value: criarBilhete(segredo),
  });
  await registrarAuditoria("login-ok", null, origem);
  // Senha certa nao conta no limite. `limparTentativas` nunca lanca, entao um
  // banco lento aqui atrasa a resposta mas nao desfaz o login que ja deu certo.
  await esquecerTentativas(origem);

  return NextResponse.json({ ok: true });
}
