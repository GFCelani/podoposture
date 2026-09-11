/**
 * Disjuntor das leituras publicas do banco.
 *
 * Duas falhas diferentes pedem respostas diferentes, e misturar as duas ja
 * custou caro aqui:
 *
 * 1. **Conexao guardada que morreu** (a instancia congelou, o banco fechou a
 *    conexao ociosa). A primeira consulta cai com ECONNRESET e a segunda, numa
 *    conexao nova, passa. Desistir na primeira fazia a pagina ir para o cache
 *    com o texto padrao — telefone antigo no site por um dia inteiro — por uma
 *    falha que uma segunda tentativa resolvia. Por isso: tenta de novo, uma vez.
 * 2. **Banco fora de verdade** (rede presa, manutencao). Cada tentativa espera
 *    o `connect_timeout` inteiro, e com uma conexao por instancia as visitas
 *    fazem fila: o indice do blog levava 10 s, 20 s, 30 s por visita. Por isso:
 *    depois de uma falha que nao passou na segunda tentativa, as leituras param
 *    de tentar por um tempo e quem chama cai direto no que tem sem banco.
 *
 * A pausa e curta em tempo de execucao, porque durante ela toda pagina que se
 * refaz cai no padrao; no build ela e longa, porque la o que importa e nao
 * esperar o timeout em cada uma das 89 paginas.
 *
 * Modulo puro, sem banco nem `server-only`, para ser testado sem subir nada.
 */

/** Codigos de conexao que morreu no caminho (node e postgres.js). */
const CONEXAO_CAIDA = new Set([
  "ECONNRESET",
  "EPIPE",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
]);

/** A falha e de uma conexao que morreu, e uma conexao nova tende a passar. */
export function conexaoCaida(erro: unknown): boolean {
  const codigo = (erro as { code?: unknown } | null)?.code;
  return typeof codigo === "string" && CONEXAO_CAIDA.has(codigo);
}

/** Lancado sem tentar o banco, durante a pausa depois de uma falha. */
export class BancoEmPausa extends Error {
  constructor() {
    super("banco em pausa depois de uma falha recente");
    this.name = "BancoEmPausa";
  }
}

/** O build de producao do Next, onde a pausa longa vale a pena. */
export function emConstrucao(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEXT_PHASE === "phase-production-build";
}

export const PAUSA_NO_BUILD_MS = 60_000;
export const PAUSA_EM_EXECUCAO_MS = 15_000;

export type Disjuntor = {
  /** Roda a leitura: uma segunda tentativa se a conexao caiu, e pausa depois de falhar. */
  ler<T>(leitura: () => Promise<T>): Promise<T>;
  emPausa(): boolean;
};

export function criarDisjuntor(opcoes: {
  pausaMs: () => number;
  agora?: () => number;
}): Disjuntor {
  const agora = opcoes.agora ?? Date.now;
  let falhouEm: number | null = null;

  const emPausa = () => falhouEm !== null && agora() - falhouEm < opcoes.pausaMs();

  return {
    emPausa,
    async ler<T>(leitura: () => Promise<T>): Promise<T> {
      if (emPausa()) throw new BancoEmPausa();
      try {
        const valor = await leitura();
        falhouEm = null;
        return valor;
      } catch (primeiro) {
        if (!conexaoCaida(primeiro)) {
          falhouEm = agora();
          throw primeiro;
        }
        try {
          const valor = await leitura();
          falhouEm = null;
          return valor;
        } catch (segundo) {
          falhouEm = agora();
          throw segundo;
        }
      }
    },
  };
}
