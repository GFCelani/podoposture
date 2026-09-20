import "server-only";

import { contarERegistrarTentativa, bancoConfigurado, limparTentativas } from "./painel-db";

/**
 * Quantas vezes se pode errar a senha, e com que identidade se conta.
 *
 * Tres armadilhas moram aqui, e as tres ja foram pagas:
 *
 * 1. **Contador em memoria de modulo nao limita nada em serverless.** Cada
 *    instancia teria o proprio balde, e "8 tentativas" viraria "8 por
 *    instancia" para quem insiste. Por isso o contador que vale vive no banco.
 *    Se o banco estiver fora, cai para memoria — porque banco indisponivel nao
 *    pode trancar a dona da clinica fora do proprio painel.
 *
 * 2. **`x-forwarded-for` cru e escrito pelo cliente.** Aceita-lo dava as duas
 *    falhas ao mesmo tempo: tentativa infinita (basta variar o cabecalho a cada
 *    pedido) e a possibilidade de trancar outra pessoa de fora (basta forjar o
 *    IP dela ate estourar o limite). So vale identidade que outro escreveu: na
 *    Vercel, `x-vercel-forwarded-for`; fora dela, so com `PROXY_HOPS` dizendo
 *    quantos saltos confiaveis existem, contados da direita para a esquerda.
 *
 * 3. **Endereco IPv6 inteiro nao e uma pessoa.** Qualquer servidor alugado vem
 *    com um bloco /64 inteiro, e trocar de endereco a cada tentativa zerava o
 *    limite. O IPv6 conta pelo /64.
 */

export const JANELA_MS = 15 * 60 * 1000;
/** Com identidade confiavel. */
export const LIMITE_POR_ORIGEM = 8;
/** Sem identidade confiavel, todos caem num balde so, com teto mais alto. */
export const LIMITE_SEM_ORIGEM = 200;
export const CHAVE_SEM_ORIGEM = "sem-origem-confiavel";
/**
 * Tentativas de todas as origens juntas na janela que disparam o alerta no log.
 * So alerta, nao tranca: um teto global que recusa daria a qualquer um um jeito
 * de trancar a dona da clinica fora, bastando insistir de varios enderecos.
 */
export const ALERTA_GLOBAL = 300;

export function ipDaRequisicao(cabecalhos: Headers): string | null {
  if (process.env.VERCEL === "1") {
    const daPlataforma = cabecalhos.get("x-vercel-forwarded-for")?.trim();
    if (daPlataforma) return daPlataforma;
  }

  const saltos = Number(process.env.PROXY_HOPS ?? "");
  if (Number.isInteger(saltos) && saltos >= 1) {
    const encaminhado = cabecalhos.get("x-forwarded-for");
    if (encaminhado) {
      const partes = encaminhado.split(",").map((p) => p.trim()).filter(Boolean);
      if (partes.length < saltos) {
        // Menos entradas do que os saltos configurados: ou PROXY_HOPS esta
        // errado, ou alguem removeu cabecalho no caminho. Recusar e o certo,
        // mas em silencio isso degradaria para o balde comum, muito mais
        // frouxo, sem ninguem perceber.
        console.error(
          `[painel] PROXY_HOPS=${saltos} mas x-forwarded-for trouxe ${partes.length} entrada(s)`,
        );
        return null;
      }
      // Contado da direita: os saltos da esquerda sao os que o cliente escreveu.
      return partes[partes.length - saltos] ?? null;
    }
    const real = cabecalhos.get("x-real-ip")?.trim();
    if (real) return real;
  }

  return null;
}

/** As 8 partes de um IPv6 sem zeros a esquerda, ou null se nao for um. */
function partesDoIpv6(ip: string): string[] | null {
  const lados = ip.split("::");
  if (lados.length > 2) return null;
  const quebrar = (lado: string): string[] | null => {
    if (!lado) return [];
    const partes = lado.split(":");
    const ultima = partes.at(-1) ?? "";
    // IPv4 no fim ("::ffff:1.2.3.4" ou "64:ff9b::1.2.3.4") ocupa duas partes.
    if (ultima.includes(".")) {
      const octetos = ultima.split(".").map(Number);
      if (octetos.length !== 4 || octetos.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
      partes.splice(-1, 1, ((octetos[0] << 8) | octetos[1]).toString(16), ((octetos[2] << 8) | octetos[3]).toString(16));
    }
    return partes;
  };
  const esquerda = quebrar(lados[0]);
  const direita = lados.length === 2 ? quebrar(lados[1]) : [];
  if (!esquerda || !direita) return null;
  const faltam = 8 - esquerda.length - direita.length;
  if (lados.length === 1 ? faltam !== 0 : faltam < 1) return null;
  const todas = [...esquerda, ...Array.from({ length: lados.length === 2 ? faltam : 0 }, () => "0"), ...direita];
  if (todas.length !== 8 || !todas.every((p) => /^[0-9a-f]{1,4}$/.test(p))) return null;
  return todas.map((p) => p.replace(/^0+(?=.)/, ""));
}

/**
 * A identidade que o limite conta. IPv4 e o proprio endereco; IPv6 e o /64
 * dele; IPv4 escrito dentro de IPv6 ("::ffff:1.2.3.4") volta a ser o IPv4.
 */
export function chaveDaOrigem(origem: string): string {
  const ip = origem.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const mapeado = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (mapeado) return mapeado[1];
  if (!ip.includes(":")) return ip;
  const partes = partesDoIpv6(ip);
  return partes ? `${partes.slice(0, 4).join(":")}::/64` : ip;
}

/* Contagem em memoria: reserva quando o banco nao responde, e atalho para
   recusar quem ja estourou o limite nesta instancia sem escrever no banco. */
const marcasEmMemoria = new Map<string, number[]>();
const MAX_CHAVES = 5000;

function contarEmMemoria(chave: string, agora: number): number {
  const inicio = agora - JANELA_MS;
  const marcas = (marcasEmMemoria.get(chave) ?? []).filter((m) => m > inicio);
  marcas.push(agora);
  marcasEmMemoria.set(chave, marcas);

  if (marcasEmMemoria.size > MAX_CHAVES) {
    // Despeja por ultima atividade, nao por ordem de insercao: quem parou de
    // tentar ha mais tempo e quem menos importa manter.
    const porIdade = [...marcasEmMemoria.entries()].sort(
      (a, b) => (a[1].at(-1) ?? 0) - (b[1].at(-1) ?? 0),
    );
    for (const [k] of porIdade.slice(0, marcasEmMemoria.size - MAX_CHAVES)) {
      marcasEmMemoria.delete(k);
    }
  }
  return marcas.length;
}

let alertouEm = 0;

function alertarSeMuitas(todas: number, agora: number): void {
  if (todas <= ALERTA_GLOBAL || agora - alertouEm < JANELA_MS) return;
  alertouEm = agora;
  console.error(
    `[painel] ALERTA: ${todas} tentativas de senha nos ultimos 15 minutos, somando todas as origens. Pode ser tentativa de adivinhar a senha.`,
  );
}

export type Veredicto = {
  permitido: boolean;
  tentativas: number;
  limite: number;
  esperarSegundos: number;
};

/**
 * Registra a tentativa e diz se ela pode seguir.
 *
 * A tentativa e contada ANTES de conferir a senha, de proposito: contar so as
 * erradas deixaria o custo de uma tentativa certa fora do limite, e e o custo
 * do `scrypt` que precisa ser contido.
 *
 * Quem ja passou do limite nesta instancia e recusado sem tocar no banco: cada
 * tentativa bloqueada gravava uma linha, e insistir enchia a tabela e punha na
 * fila da conexao unica as leituras do site.
 */
export async function registrarTentativa(origem: string | null): Promise<Veredicto> {
  const chave = origem ? chaveDaOrigem(origem) : CHAVE_SEM_ORIGEM;
  const limite = origem ? LIMITE_POR_ORIGEM : LIMITE_SEM_ORIGEM;
  const agora = Date.now();

  const naMemoria = contarEmMemoria(chave, agora);
  let tentativas = naMemoria;
  if (naMemoria <= limite && bancoConfigurado()) {
    try {
      const contagem = await contarERegistrarTentativa(chave, JANELA_MS);
      tentativas = Math.max(contagem.daChave, naMemoria);
      alertarSeMuitas(contagem.todas, agora);
    } catch (erro) {
      console.error("[painel] contador de tentativas indisponivel, usando memoria:", erro);
    }
  }

  return {
    permitido: tentativas <= limite,
    tentativas,
    limite,
    esperarSegundos: Math.ceil(JANELA_MS / 1000),
  };
}

/**
 * Esquece as tentativas de quem acabou de acertar a senha.
 *
 * A tentativa e contada antes de conferir a senha (ver acima), entao sem isto
 * entrar certo tambem gastava o limite: sessao que vence, celular e computador
 * no mesmo dia, e em 15 minutos a dona da clinica ficava trancada fora com a
 * senha certa na mao.
 *
 * So com identidade confiavel. O balde comum junta todo mundo sem origem
 * conhecida; zera-lo porque ela entrou daria a quem tenta no mesmo balde um
 * contador novo de graca.
 */
export async function esquecerTentativas(origem: string | null): Promise<void> {
  if (!origem) return;
  const chave = chaveDaOrigem(origem);
  marcasEmMemoria.delete(chave);
  if (bancoConfigurado()) await limparTentativas(chave);
}

/** So para os testes. */
export function _limparMemoria(): void {
  marcasEmMemoria.clear();
  alertouEm = 0;
}
