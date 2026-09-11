import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sessao do painel — um bilhete assinado pelo servidor.
 *
 * O que vai no cookie e `dados.assinatura`. Os dados dizem quando a sessao foi
 * criada e quando expira; a assinatura e um HMAC-SHA256 desses dados com um
 * segredo que so o servidor conhece. Mexer em um caractere dos dados invalida a
 * assinatura, entao o navegador nao consegue forjar nem estender a propria
 * sessao.
 *
 * Nao ha sessao guardada no servidor, de proposito: o bilhete se valida
 * sozinho. E o que faz isto funcionar em hospedagem sem estado, onde cada
 * requisicao pode cair numa instancia diferente.
 *
 * O contraste com o modelo que isto substitui importa: guardar
 * `sessionStorage.setItem("autenticado", "1")` no navegador nao e uma sessao —
 * e uma anotacao que o proprio visitante escreve, e que o servidor nunca ve.
 */

const NOME_COOKIE = "podoposture_painel";
/** Curto o bastante para um computador esquecido aberto nao virar porta. */
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas
const VERSAO = "1";

export type Sessao = { criadaEm: number; expiraEm: number };

/** Segredo de assinatura. Sem ele nao existe sessao possivel — falha fechada. */
export function segredoConfigurado(): string | null {
  const valor = process.env.ADMIN_SESSION_SECRET?.trim();
  // Menos de 32 caracteres nao e segredo, e senha. Recusar e melhor que fingir.
  return valor && valor.length >= 32 ? valor : null;
}

function assinar(dados: string, segredo: string): string {
  return createHmac("sha256", segredo).update(dados).digest("base64url");
}

/** Monta o bilhete assinado. */
export function criarBilhete(segredo: string, agora: number = Date.now()): string {
  const carga: Sessao & { v: string; id: string } = {
    v: VERSAO,
    criadaEm: agora,
    expiraEm: agora + DURACAO_MS,
    // Identificador aleatorio: dois bilhetes criados no mesmo milissegundo nao
    // saem identicos, o que evita que um bilhete antigo capturado seja
    // confundido com o novo.
    id: randomBytes(9).toString("base64url"),
  };
  const dados = Buffer.from(JSON.stringify(carga)).toString("base64url");
  return `${dados}.${assinar(dados, segredo)}`;
}

/**
 * Confere o bilhete. Devolve a sessao, ou `null` para qualquer defeito.
 *
 * Qualquer caminho de falha — sem segredo, formato errado, assinatura que nao
 * bate, versao desconhecida, prazo vencido — devolve `null`. Nao existe
 * "quase valido".
 */
export function lerBilhete(
  bilhete: string | undefined,
  segredo: string | null,
  agora: number = Date.now(),
): Sessao | null {
  if (!bilhete || !segredo) return null;

  const separador = bilhete.lastIndexOf(".");
  if (separador <= 0) return null;

  const dados = bilhete.slice(0, separador);
  const assinaturaRecebida = bilhete.slice(separador + 1);
  const assinaturaEsperada = assinar(dados, segredo);

  // Comparacao em tempo constante: `===` entregaria a resposta mais rapido
  // quanto mais cedo os bytes divergem, e isso, medido, ajuda a forjar.
  // `timingSafeEqual` lanca quando os tamanhos diferem, dai a checagem antes.
  const a = Buffer.from(assinaturaRecebida);
  const b = Buffer.from(assinaturaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const carga = JSON.parse(Buffer.from(dados, "base64url").toString("utf8"));
    if (carga?.v !== VERSAO) return null;
    if (typeof carga.criadaEm !== "number" || typeof carga.expiraEm !== "number") return null;
    if (carga.expiraEm <= agora) return null;
    // Um bilhete que diz valer mais que o permitido foi forjado com um segredo
    // vazado, ou e de uma versao anterior mais frouxa: recusa.
    if (carga.expiraEm - carga.criadaEm > DURACAO_MS) return null;
    return { criadaEm: carga.criadaEm, expiraEm: carga.expiraEm };
  } catch {
    return null;
  }
}

/**
 * O site esta sendo servido em localhost?
 *
 * E a unica situacao em que faz sentido servir o cookie sem exigir HTTPS.
 * Qualquer outro endereco — inclusive uma pre-visualizacao publicada — recebe o
 * cookie marcado como `secure`. O criterio e o endereco, nao o `NODE_ENV`: um
 * build de teste publicado na internet tambem precisa de HTTPS.
 */
export function ehLocalhost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Pelo leitor de URL, e nao cortando no primeiro ":": num IPv6 entre
  // colchetes o corte dava sempre "[", e qualquer endereco IPv6 contava como
  // localhost e recebia o cookie sem `secure`.
  let nome: string;
  try {
    nome = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  return nome === "localhost" || nome === "127.0.0.1" || nome === "[::1]";
}

/** Opcoes do cookie. Cada uma fecha um caminho de ataque diferente. */
export function opcoesDoCookie(emLocalhost: boolean) {
  return {
    name: NOME_COOKIE,
    // Fora do alcance de qualquer script da pagina: nem um XSS consegue ler.
    httpOnly: true,
    secure: !emLocalhost,
    // O navegador nao manda o cookie em requisicao vinda de outro site — e o
    // que barra pedido forjado de fora (CSRF).
    sameSite: "strict" as const,
    path: "/",
    maxAge: Math.floor(DURACAO_MS / 1000),
  };
}

export { NOME_COOKIE, DURACAO_MS };
