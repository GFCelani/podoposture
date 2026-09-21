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
import { criarVagasDeLeitura } from "@/lib/vagas-de-leitura";

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
 * Prazo para o corpo inteiro chegar.
 *
 * Quatro quilobytes numa conexao viva chegam em milissegundos; cinco segundos e
 * folga para o 4G ruim do consultorio. O prazo existe porque a leitura nao tem
 * fim garantido: quem abre a conexao e manda um byte de vez em quando segura o
 * pedido pelo tempo que quiser.
 */
const PRAZO_DO_CORPO_MS = 5_000;

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
 *
 * E ocupada DEPOIS de ler o corpo, pelo motivo oposto. Dentro da vaga, a
 * leitura a prendia pelo tempo que ela levasse (ate o prazo acima): duas
 * conexoes lentas, de graca e sem senha nenhuma, bastavam para a dona da
 * clinica levar 429 ao clicar em Entrar. Ler antes nao afrouxa o limite de
 * tentativas — quem le o corpo ainda nao contou tentativa nem chegou ao
 * `scrypt`.
 *
 * Mas a leitura fora da vaga nao pode ficar sem teto nenhum: cada leitura
 * pendurada segura um buffer de ate 4 KB e um temporizador por ate 5 s, e mil
 * conexoes lentas somavam mil de cada. Por isso a leitura tem vagas proprias
 * (`vagasDeLeitura`), por origem e com teto total, e `MAXIMO_EM_VOO`, apertado,
 * fica em volta do limite de tentativas e do `scrypt`.
 */
const MAXIMO_EM_VOO = 2;
let emVoo = 0;

/**
 * A vaga acima do teto para quem ja acertou a senha nesta instancia.
 *
 * A reserva das vagas de leitura cobria so a leitura do corpo: logo adiante o
 * teto de pedidos simultaneos e global, entao duas conexoes de terceiro ainda
 * faziam a dona levar 429 — a mesma mensagem, no passo seguinte. Uma vaga a
 * mais, so para origem lembrada, devolve a ela o clique em Entrar.
 *
 * A reserva e de UMA vaga, e nao uma por origem lembrada: ela so vale para a
 * origem que ainda nao tem pedido em voo, entao o teto de `scrypt` simultaneo
 * sobe de 2 para 3 por mais gente que tenha entrado aqui. O limite de tentativas
 * por origem continua valendo por baixo, e uma origem lembrada que insista gasta
 * as proprias tentativas como qualquer outra.
 */
const VAGA_RESERVADA = 1;

/** Quantos pedidos de cada origem estao no `scrypt` agora. Some quando zera. */
const emVooPorOrigem = new Map<string, number>();

function contarEmVoo(origem: string | null, quanto: 1 | -1): void {
  if (origem === null) return;
  const restantes = (emVooPorOrigem.get(origem) ?? 0) + quanto;
  if (restantes <= 0) emVooPorOrigem.delete(origem);
  else emVooPorOrigem.set(origem, restantes);
}

/**
 * Leituras de corpo simultaneas. Um teto global unico de 50 deixava um script
 * ocupar todas as vagas e recusar a dona; agora so a origem que passa do
 * proprio teto e recusada, e com o total cheio a leitura corre com prazo curto
 * em vez de recusar. Acima do teto absoluto le so quem ja entrou nesta
 * instancia, dentro de uma reserva de 8 x 4 leituras — assim a memoria das
 * leituras penduradas continua limitada (432 no pior caso) sem que o trafego de
 * terceiro consiga recusar a dona. Ver lib/vagas-de-leitura.ts.
 */
const vagasDeLeitura = criarVagasDeLeitura({
  maximoPorOrigem: 4,
  maximoTotal: 200,
  maximoAbsoluto: 400,
  origensLembradas: 8,
});

/** Prazo da leitura quando as vagas estao cheias: 4 KB de quem esta entrando chegam bem antes. */
const PRAZO_CURTO_DO_CORPO_MS = 1_000;

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

  // 2. o corpo, com teto em bytes reais e prazo — fora da vaga do scrypt, mas
  // dentro das vagas de leitura (ver acima)
  const origemDaLeitura = ipDaRequisicao(cabecalhos);
  const modo = vagasDeLeitura.ocupar(origemDaLeitura);
  if (modo === "recusado") {
    return NextResponse.json(
      { erro: "Muitas tentativas ao mesmo tempo. Tente de novo em instantes." },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }
  let leitura: Awaited<ReturnType<typeof lerCorpoLimitado>>;
  try {
    leitura = await lerCorpoLimitado(
      req,
      TAMANHO_MAXIMO,
      modo === "curto" ? PRAZO_CURTO_DO_CORPO_MS : PRAZO_DO_CORPO_MS,
    );
  } finally {
    vagasDeLeitura.liberar(origemDaLeitura);
  }
  if (!leitura.ok && leitura.motivo === "interrompida") {
    // O corpo nao chegou a tempo: conexao lenta (o 4G do consultorio) ou prazo
    // curto com o servidor cheio. "Requisição inválida. Recarregue" mandava
    // recarregar uma pagina que estava certa, e o erro se repetia igual.
    // 503, e nao 408: navegador que recebe 408 pode reenviar o pedido sozinho.
    return NextResponse.json(
      { erro: "A conexão está lenta e a senha não chegou a tempo. Tente de novo em instantes." },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }
  if (!leitura.ok) {
    return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 413 });
  }

  // 3. teto de pedidos simultaneos, em memoria e sem contar tentativa
  const naReserva =
    origemDaLeitura !== null &&
    vagasDeLeitura.lembra(origemDaLeitura) &&
    (emVooPorOrigem.get(origemDaLeitura) ?? 0) === 0;
  if (emVoo >= MAXIMO_EM_VOO + (naReserva ? VAGA_RESERVADA : 0)) {
    return NextResponse.json(
      { erro: "Muitas tentativas ao mesmo tempo. Tente de novo em instantes." },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }

  emVoo += 1;
  contarEmVoo(origemDaLeitura, 1);
  try {
    return await entrar(leitura.texto, cabecalhos);
  } finally {
    emVoo -= 1;
    contarEmVoo(origemDaLeitura, -1);
  }
}

async function entrar(corpo: string, cabecalhos: Headers): Promise<NextResponse> {
  // 4. limite de tentativas (ainda antes de qualquer calculo caro)
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

  // 5. o corpo, agora como JSON
  let bruto: unknown;
  try {
    bruto = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 400 });
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 400 });
  }
  const senha = typeof (bruto as { senha?: unknown }).senha === "string"
    ? (bruto as { senha: string }).senha
    : "";

  // 6. o painel esta configurado? falha FECHADA
  const guardado = hashConfigurado();
  const segredo = segredoConfigurado();
  if (!guardado || !segredo) {
    console.error("[painel] ADMIN_PASSWORD_HASH ou ADMIN_SESSION_SECRET ausente");
    return NextResponse.json(
      { erro: "O painel ainda não foi configurado neste servidor. Avise quem cuida do site." },
      { status: 503 },
    );
  }

  // 7. a senha
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
  // Acertou a senha: daqui para frente esta origem tem vaga reservada nesta
  // instancia nos dois lugares em que o flood de terceiro a recusava — a leitura
  // do corpo (`vagasDeLeitura`) e o teto de pedidos simultaneos (VAGA_RESERVADA).
  // Enquanto ela nao tiver entrado nenhuma vez aqui, o flood ainda a recusa: a
  // memoria e por instancia.
  vagasDeLeitura.lembrarOrigem(origem);
  // Senha certa nao conta no limite. `limparTentativas` nunca lanca, entao um
  // banco lento aqui atrasa a resposta mas nao desfaz o login que ja deu certo.
  await esquecerTentativas(origem);

  return NextResponse.json({ ok: true });
}
