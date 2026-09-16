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

/**
 * Quanto uma leitura publica pode esperar o banco. O `connect_timeout` so vale
 * para abrir a conexao: com o banco travado (conexao aceita, nenhuma resposta)
 * a consulta esperava para sempre, o indice do blog passava de 90 s e, como a
 * leitura nunca falhava, a pausa nunca abria. Uma leitura normal leva dezenas de
 * milissegundos.
 */
export const PRAZO_DA_LEITURA_MS = 5_000;

/** O `connect_timeout` da conexao do site (painel-db.ts), em segundos. */
export const TEMPO_PARA_ABRIR_CONEXAO_S = 10;

/** O `idle_timeout` da conexao do site: parada por isto, ela e fechada. */
export const OCIOSIDADE_DA_CONEXAO_S = 20;

/**
 * O prazo quando a leitura pode precisar abrir a conexao antes: a primeira da
 * instancia, a primeira depois de a conexao ter ficado ociosa e fechado, toda
 * leitura do build e toda tentativa que vem depois de uma falha — inclusive a
 * segunda tentativa de uma conexao que caiu, que por definicao abre outra.
 *
 * Acima do `connect_timeout` de proposito. Com os 5 s valendo tambem aqui, um
 * banco que levava 6 s para acordar fazia a leitura estourar sem nunca ter tido
 * a chance de conectar: a pausa abria, o build tirava as paginas com o conteudo
 * padrao, e a prova do cron das 6h falhava toda manha de banco frio.
 *
 * Quem paga esta espera: a primeira visita da instancia e, com o banco fora, a
 * primeira leitura de cada janela de pausa — uma por janela, nao uma por visita,
 * porque durante a pausa as outras nem chegam ao banco. Com a pausa de 15 s em
 * execucao, isso da uma espera de ate 12 s a cada 15 s de banco travado, e nao
 * uma so no comeco.
 */
export const PRAZO_ABRINDO_CONEXAO_MS = TEMPO_PARA_ABRIR_CONEXAO_S * 1000 + 2_000;

/** Lancado quando a leitura passa do prazo. Conta como falha e abre a pausa. */
export class PrazoEsgotado extends Error {
  constructor(ms: number) {
    super(`o banco nao respondeu em ${ms} ms`);
    this.name = "PrazoEsgotado";
  }
}

/**
 * A promessa, ou `PrazoEsgotado` se ela nao terminar em `ms`. Nao cancela o
 * trabalho de baixo (o driver nao tem como); so devolve o controle a quem chamou.
 */
export function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const esgotou = new Promise<never>((_, rejeitar) => {
    temporizador = setTimeout(() => rejeitar(new PrazoEsgotado(ms)), Math.max(0, ms));
    // Nao segura o processo vivo so por causa do relogio.
    (temporizador as { unref?: () => void }).unref?.();
  });
  // A promessa perdida nao pode virar rejeicao sem tratamento depois do prazo.
  promessa.catch(() => {});
  return Promise.race([promessa, esgotou]).finally(() => clearTimeout(temporizador));
}

export type Disjuntor = {
  /** Roda a leitura: uma segunda tentativa se a conexao caiu, e pausa depois de falhar. */
  ler<T>(leitura: () => Promise<T>): Promise<T>;
  /**
   * Como `ler`, mas na pausa deixa passar UMA tentativa direta por janela de
   * pausa. Acertou: o disjuntor fecha para todo mundo. Errou: a pausa recomeca,
   * ja sondada. As outras chamadas da mesma janela recebem `BancoEmPausa`.
   */
  sondar<T>(leitura: () => Promise<T>): Promise<T>;
  emPausa(): boolean;
};

export function criarDisjuntor(opcoes: {
  pausaMs: () => number;
  agora?: () => number;
  /** Prazo de cada tentativa com a conexao ja aberta; padrao PRAZO_DA_LEITURA_MS. */
  prazoMs?: number;
  /** Prazo quando a conexao pode estar fechada; padrao PRAZO_ABRINDO_CONEXAO_MS. */
  prazoAbrindoMs?: number;
  /**
   * Depois de quanto tempo sem leitura certa a conexao conta como fechada.
   * Padrao: metade do `idle_timeout`, para nao apostar no limite — as escritas
   * do painel e do cron tambem mantem a conexao viva, e o disjuntor nao as ve.
   */
  ociosoMs?: number;
  /** Quando toda leitura usa o prazo longo (o build, com uma conexao por worker). */
  sempreAbrindo?: () => boolean;
}): Disjuntor {
  const agora = opcoes.agora ?? Date.now;
  const prazoMs = opcoes.prazoMs ?? PRAZO_DA_LEITURA_MS;
  const prazoAbrindoMs = opcoes.prazoAbrindoMs ?? PRAZO_ABRINDO_CONEXAO_MS;
  const ociosoMs = opcoes.ociosoMs ?? (OCIOSIDADE_DA_CONEXAO_S * 1000) / 2;
  // Quando uma leitura deu certo pela ultima vez: diz se a conexao ainda deve
  // estar aberta. O relogio nao tem como separar abrir conexao de consulta
  // presa, entao o prazo longo fica so onde abrir e possivel.
  let acertouEm: number | null = null;
  // Toda tentativa passa por aqui: leitura que nao volta vira falha comum.
  const tentar = async <T>(leitura: () => Promise<T>): Promise<T> => {
    const abrindo = opcoes.sempreAbrindo?.() === true || acertouEm === null || agora() - acertouEm >= ociosoMs;
    let promessa: Promise<T>;
    try {
      promessa = leitura();
    } catch (erro) {
      promessa = Promise.reject(erro);
    }
    try {
      const valor = await comPrazo(promessa, abrindo ? prazoAbrindoMs : prazoMs);
      acertouEm = agora();
      return valor;
    } catch (erro) {
      // Depois de uma falha nao da para supor conexao aberta: a proxima
      // tentativa, a comecar pela segunda desta mesma leitura, que so existe
      // porque a conexao guardada caiu — pode ter de abrir outra, e com o prazo
      // curto um banco que leva 6 s para acordar estourava antes de conectar.
      acertouEm = null;
      throw erro;
    }
  };
  let falhouEm: number | null = null;
  // O `falhouEm` da pausa que ja teve sua tentativa direta. Guardar o instante,
  // e nao um booleano, faz a marca valer so para aquela janela: uma falha nova
  // abre outra janela, com outro instante.
  let sondadaEm: number | null = null;

  const emPausa = () => falhouEm !== null && agora() - falhouEm < opcoes.pausaMs();
  const fechar = () => {
    falhouEm = null;
    sondadaEm = null;
  };

  async function ler<T>(leitura: () => Promise<T>): Promise<T> {
    if (emPausa()) throw new BancoEmPausa();
    try {
      const valor = await tentar(leitura);
      fechar();
      return valor;
    } catch (primeiro) {
      if (!conexaoCaida(primeiro)) {
        falhouEm = agora();
        throw primeiro;
      }
      try {
        const valor = await tentar(leitura);
        fechar();
        return valor;
      } catch (segundo) {
        falhouEm = agora();
        throw segundo;
      }
    }
  }

  return {
    emPausa,
    ler,
    // Existe pela pagina do post do painel, que precisa tentar mesmo na pausa
    // (ver posts-do-site.ts). Sem o limite, cada visita a esse endereco furava
    // o disjuntor e esperava o connect_timeout, e as visitas voltavam a fazer
    // fila na conexao unica — justamente o que a pausa existe para impedir.
    async sondar<T>(leitura: () => Promise<T>): Promise<T> {
      if (!emPausa()) return ler(leitura);
      if (sondadaEm === falhouEm) throw new BancoEmPausa();
      // Marcada ANTES de esperar: as visitas que chegam enquanto a sondagem
      // espera o banco nao entram na fila atras dela.
      sondadaEm = falhouEm;
      try {
        const valor = await tentar(leitura);
        // O banco voltou: home e indice do blog saem da pausa junto.
        fechar();
        return valor;
      } catch (erro) {
        falhouEm = agora();
        sondadaEm = falhouEm;
        throw erro;
      }
    },
  };
}
