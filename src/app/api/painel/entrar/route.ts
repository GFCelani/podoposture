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
 * servidor. Procedencia, teto de pedidos simultaneos e limite de tentativas vem
 * antes justamente para que a maioria das tentativas nunca chegue ao calculo.
 */

/** O corpo aqui e `{"senha":"..."}`. Nao existe motivo para passar de 4 KB. */
const TAMANHO_MAXIMO = 4 * 1024;

/**
 * Quantos pedidos de entrada podem correr ao mesmo tempo nesta instancia.
 *
 * `scrypt` come memoria e uma thread do pool do Node. Sem este teto, uma
 * rajada de tentativas erradas satura o pool e o site inteiro — inclusive as
 * paginas publicas — para de responder. Duas tentativas simultaneas e o
 * suficiente para uma pessoa entrando; a terceira espera.
 *
 * A vaga e ocupada ANTES de contar a tentativa, e nao so em volta do calculo:
 * a recusa por excesso de pedidos simultaneos gastava uma das 8 tentativas da
 * origem, e quem saturava as vagas fazia a dona da clinica, clicando de novo,
 * ficar trancada 15 minutos com a senha certa.
 */
const MAXIMO_EM_VOO = 2;
let emVoo = 0;

/**
 * O que a tela mostra para a senha errada: o que conferir e o que fazer quando
 * ela nao lembra. "Senha incorreta." sozinha deixava quem esqueceu sem saida.
 */
const SENHA_INCORRETA =
  "Senha incorreta. Confira as letras maiúsculas (use “Mostrar” para ver o que digitou). Se não lembra a senha, peça uma nova a quem cuida do site.";

export async function POST(req: Request) {
  const cabecalhos = await headers();

  // 1. veio deste site? (barato, e barra pedido forjado de outra origem)
  if (!(await pedidoVeioDaqui())) {
    return NextResponse.json(
      { erro: "Não foi possível confirmar de onde veio o pedido. Recarregue a página e tente de novo." },
      { status: 403 },
    );
  }

  // 2. teto de pedidos simultaneos, em memoria e sem contar tentativa
  if (emVoo >= MAXIMO_EM_VOO) {
    return NextResponse.json(
      { erro: "Muitas tentativas ao mesmo tempo. Tente de novo em instantes." },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }

  emVoo += 1;
  try {
    return await entrar(req, cabecalhos);
  } finally {
    emVoo -= 1;
  }
}

async function entrar(req: Request, cabecalhos: Headers): Promise<NextResponse> {
  // 3. limite de tentativas (ainda antes de ler o corpo)
  const origem = ipDaRequisicao(cabecalhos);
  const veredicto = await registrarTentativa(origem);
  if (!veredicto.permitido) {
    const minutos = Math.ceil(veredicto.esperarSegundos / 60);
    // Nao registra auditoria aqui: gravar uma linha por tentativa bloqueada
    // daria a quem ataca um jeito barato de encher a tabela. Pelo mesmo
    // motivo, quem ja estourou o limite nesta instancia nem chega ao banco
    // (ver registrarTentativa).
    return NextResponse.json(
      {
        erro: `Tentativas demais. Espere ${minutos} min e tente de novo. Se não lembra a senha, peça uma nova a quem cuida do site.`,
      },
      { status: 429, headers: { "Retry-After": String(veredicto.esperarSegundos) } },
    );
  }

  // 4. corpo, com teto em bytes reais
  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) {
    return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 413 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(leitura.texto);
  } catch {
    return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 400 });
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 400 });
  }
  const senha = typeof (bruto as { senha?: unknown }).senha === "string"
    ? (bruto as { senha: string }).senha
    : "";

  // 5. o painel esta configurado? falha FECHADA
  const guardado = hashConfigurado();
  const segredo = segredoConfigurado();
  if (!guardado || !segredo) {
    console.error("[painel] ADMIN_PASSWORD_HASH ou ADMIN_SESSION_SECRET ausente");
    return NextResponse.json(
      { erro: "O painel ainda não foi configurado neste servidor. Avise quem cuida do site." },
      { status: 503 },
    );
  }

  // 6. a senha
  const confere = senha.length > 0 && (await conferirSenha(senha, guardado));

  if (!confere) {
    await registrarAuditoria("login-falhou", null, origem);
    return NextResponse.json({ erro: SENHA_INCORRETA }, { status: 401 });
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
