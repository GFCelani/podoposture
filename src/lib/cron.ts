import { timingSafeEqual } from "node:crypto";

/**
 * A porta das rotas agendadas (`src/app/api/cron/**`).
 *
 * A Vercel chama a rota do cron com `Authorization: Bearer <CRON_SECRET>`. A
 * rota em si e publica: qualquer um que descubra o endereco consegue chama-la,
 * e cada chamada gasta cota das APIs de analytics e escreve no banco. O
 * segredo e a unica coisa que separa o agendador de um curioso.
 *
 * Uso obrigatorio na PRIMEIRA instrucao de todo handler de cron — o teste de
 * rotas protegidas confere:
 *
 * ```ts
 * const negado = exigirSegredoDoCron(req);
 * if (negado) return negado;
 * ```
 */

/**
 * Abaixo disto o segredo cabe numa tentativa por forca bruta, ou e um valor
 * de exemplo esquecido na configuracao.
 */
const TAMANHO_MINIMO = 16;

function recusar(): Response {
  // A resposta nao diz se falta o segredo no servidor ou se o pedido errou:
  // detalhar ajudaria so quem esta tentando entrar.
  return Response.json({ erro: "Não autorizado." }, { status: 401 });
}

/** Devolve a resposta de recusa, ou `null` quando o pedido veio do agendador. */
export function exigirSegredoDoCron(req: Request): Response | null {
  const segredo = process.env.CRON_SECRET;

  // Falha fechada: sem segredo configurado, ninguem passa. O contrario —
  // liberar quando falta configuracao — deixaria a coleta aberta justamente no
  // ambiente que ninguem terminou de configurar.
  if (!segredo || segredo.length < TAMANHO_MINIMO) {
    console.error("[cron] CRON_SECRET ausente ou curto demais");
    return recusar();
  }

  const recebido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${segredo}`);

  // Comparacao em tempo constante: `===` responde mais rapido quanto mais cedo
  // os bytes divergem, e isso, medido, ajuda a adivinhar o segredo.
  // `timingSafeEqual` lanca com tamanhos diferentes, dai a checagem antes.
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) {
    return recusar();
  }

  return null;
}
