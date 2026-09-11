import "server-only";

import { contarERegistrarTentativa, bancoConfigurado, limparTentativas } from "./painel-db";

/**
 * Quantas vezes se pode errar a senha, e com que identidade se conta.
 *
 * Duas armadilhas moram aqui, e as duas ja foram pagas em outro projeto:
 *
 * 1. **Contador em memoria de modulo nao limita nada em serverless.** Cada
 *    instancia teria o proprio balde, e "8 tentativas" viraria "8 por
 *    instancia" para quem insiste. Por isso o contador vive no banco. Se o
 *    banco estiver fora, cai para memoria — porque banco indisponivel nao pode
 *    trancar a dona da clinica fora do proprio painel.
 *
 * 2. **`x-forwarded-for` cru e escrito pelo cliente.** Aceita-lo dava as duas
 *    falhas ao mesmo tempo: tentativa infinita (basta variar o cabecalho a cada
 *    pedido) e a possibilidade de trancar outra pessoa de fora (basta forjar o
 *    IP dela ate estourar o limite). So vale identidade que outro escreveu: na
 *    Vercel, `x-vercel-forwarded-for`; fora dela, so com `PROXY_HOPS` dizendo
 *    quantos saltos confiaveis existem, contados da direita para a esquerda.
 */

export const JANELA_MS = 15 * 60 * 1000;
/** Com identidade confiavel. */
export const LIMITE_POR_ORIGEM = 8;
/** Sem identidade confiavel, todos caem num balde so, com teto mais alto. */
export const LIMITE_SEM_ORIGEM = 200;
export const CHAVE_SEM_ORIGEM = "sem-origem-confiavel";

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

/* Reserva em memoria, so para quando o banco nao responde. */
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
 */
export async function registrarTentativa(origem: string | null): Promise<Veredicto> {
  const chave = origem ?? CHAVE_SEM_ORIGEM;
  const limite = origem ? LIMITE_POR_ORIGEM : LIMITE_SEM_ORIGEM;

  let tentativas: number;
  if (bancoConfigurado()) {
    try {
      tentativas = await contarERegistrarTentativa(chave, JANELA_MS);
    } catch (erro) {
      console.error("[painel] contador de tentativas indisponivel, usando memoria:", erro);
      tentativas = contarEmMemoria(chave, Date.now());
    }
  } else {
    tentativas = contarEmMemoria(chave, Date.now());
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
  marcasEmMemoria.delete(origem);
  if (bancoConfigurado()) await limparTentativas(origem);
}

/** So para os testes. */
export function _limparMemoria(): void {
  marcasEmMemoria.clear();
}
