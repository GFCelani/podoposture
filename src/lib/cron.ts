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

/**
 * A autocura do cache do site, com a prova de que ela nao vai piorar as coisas.
 *
 * Por que invalidar todo dia: as paginas estaticas que leem o banco (a home, o
 * blog, o sitemap) mostram o conteudo padrao quando a leitura falha. Se a falha
 * cair justo numa regeneracao, esse padrao fica em cache ate a proxima
 * publicacao ou deploy, sem ninguem saber. Invalidar uma vez por dia limita o
 * estrago a um dia.
 *
 * Por que a prova ANTES: invalidar com o banco fora faz exatamente o estrago
 * que a autocura existe para evitar. As 88 paginas se refazem lendo um banco
 * que nao responde e guardam o texto padrao — o telefone antigo no site
 * inteiro por 24 horas, por causa de uma queda as 6h da manha. Entao le
 * primeiro; se a leitura publica falhar (banco fora, ou disjuntor em pausa por
 * falha recente), nada e invalidado, e o cache de ontem — que esta certo —
 * continua servindo ate a noite seguinte.
 *
 * As dependencias entram por parametro para isto ser testado sem subir Next
 * nem banco.
 */
export async function invalidarCacheSeOBancoResponde(passos: {
  /** Uma leitura publica de verdade, pelo mesmo caminho que as paginas usam. */
  provarLeitura: () => Promise<unknown>;
  invalidar: () => void;
  anotarQuePulou: (motivo: string) => Promise<void>;
}): Promise<boolean> {
  try {
    await passos.provarLeitura();
  } catch (erro) {
    const motivo = "cache nao invalidado: a leitura publica do banco falhou";
    console.error(`[cron] ${motivo}:`, erro);
    // A anotacao e cortesia: com o banco fora ela tambem falha, e o que sobra e
    // o log acima. Falhar aqui nao pode derrubar a resposta do cron.
    await passos.anotarQuePulou(motivo).catch(() => {});
    return false;
  }
  passos.invalidar();
  return true;
}
