import "server-only";

import {
  diasDoIntervalo,
  diaValido,
  type Dimensao,
  type Intervalo,
  type LinhaDoDia,
  type ResultadoDaColeta,
} from "./numeros-tipos";

/**
 * Leitura das visitas na API de Web Analytics da Vercel.
 *
 * Quem chama este modulo e so a rota de cron. O token da Vercel nao tem versao
 * so-leitura — ele consegue publicar e apagar o projeto —, entao nenhuma rota
 * que uma pessoa logada acione pode toca-lo, e nenhum valor vindo de
 * requisicao entra nos parametros: as consultas sao um conjunto fixo, montado
 * aqui. Sem `filter`, a API ja devolve so producao.
 *
 * Uma dimensao por chamada. A API aceita ate duas em `by`, mas a documentacao
 * nao diz como serializar a segunda, e com `limit` de no maximo 100 o corte
 * cairia sobre o intervalo inteiro em vez de sobre cada dia. Uma chamada por
 * dia por dimensao custa ~20 chamadas por noite e nao depende de adivinhacao.
 *
 * Falha nunca vira excecao para quem chama: vira `erro` no resultado, com o
 * que chegou inteiro preservado.
 */

const ENDERECO = "https://api.vercel.com/v1/query/web-analytics/visits/aggregate";
const LIMITE = 100;
const TEMPO_POR_CHAMADA_MS = 10_000;
const CHAMADAS_SIMULTANEAS = 4;
/**
 * Um 429 que libera em ate isto e esperado uma vez; alem disso a coleta para
 * e a noite seguinte refaz. Esperar em laco prenderia a funcao ate o limite de
 * tempo e cobraria por isso.
 */
const ESPERA_MAXIMA_MS = 5_000;

export type ConfigDaVercel = { token: string; projeto: string; time: string | null };

/** So confere presenca. null = fonte nao configurada, o que nao e erro. */
export function configDaVercel(env: NodeJS.ProcessEnv = process.env): ConfigDaVercel | null {
  const token = env.VERCEL_API_TOKEN?.trim();
  const projeto = env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projeto) return null;
  return { token, projeto, time: env.VERCEL_TEAM_ID?.trim() || null };
}

export type Agrupamento = "day" | "requestPath" | "referrerHostname" | "country" | "deviceType";

const DIMENSAO: Record<Exclude<Agrupamento, "day">, Dimensao> = {
  requestPath: "rota",
  referrerHostname: "origem",
  country: "pais",
  deviceType: "aparelho",
};

export function enderecoDaConsulta(cfg: ConfigDaVercel, by: Agrupamento, intervalo: Intervalo): string {
  const url = new URL(ENDERECO);
  url.searchParams.set("projectId", cfg.projeto);
  // Token de time ou de projeto dispensa o teamId; mandar mesmo assim e inofensivo.
  if (cfg.time) url.searchParams.set("teamId", cfg.time);
  url.searchParams.set("since", intervalo.inicio);
  url.searchParams.set("until", intervalo.fim);
  url.searchParams.set("by", by);
  url.searchParams.set("limit", String(LIMITE));
  return url.toString();
}

export type ItemAgregado = { chave: string; visitas: number; pessoas: number };

function inteiro(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? Math.round(valor) : 0;
}

/**
 * Le `data[]` da resposta. null quando a forma nao e a documentada — melhor
 * registrar erro do que gravar zero onde havia visita.
 *
 * A linha de tempo traz `timestamp` ISO em UTC; a de dimensao traz a chave com
 * o nome da propria dimensao (`requestPath`, `country`...). O excedente do
 * `limit` volta agrupado como "Others", que nao e pagina nem site e fica fora.
 */
export function lerAgregado(json: unknown, by: Agrupamento): ItemAgregado[] | null {
  const dados = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(dados)) return null;

  const itens: ItemAgregado[] = [];
  for (const bruto of dados) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const item = bruto as Record<string, unknown>;
    let chave: string;
    if (by === "day") {
      if (typeof item.timestamp !== "string") continue;
      chave = item.timestamp.slice(0, 10);
      if (!diaValido(chave)) continue;
    } else {
      const valor = item[by];
      chave = typeof valor === "string" ? valor : "";
      if (/^others?$/i.test(chave)) continue;
    }
    itens.push({ chave, visitas: inteiro(item.pageviews), pessoas: inteiro(item.visitors) });
  }
  return itens;
}

function linha(dia: string, dimensao: Dimensao, item: ItemAgregado): LinhaDoDia {
  return {
    fonte: "vercel",
    dia,
    dimensao,
    chave: dimensao === "total" ? "" : item.chave,
    visitas: item.visitas,
    pessoas: item.pessoas,
    cliques: 0,
    aparicoes: 0,
    posicao: null,
  };
}

/**
 * O total de cada dia do intervalo.
 *
 * Dia sem linha na resposta vira zero — a chamada deu certo, entao ausencia ali
 * e ausencia de visita, e sem a linha o "numeros ate" da tela recuaria para o
 * ultimo dia com gente. Mas so a partir do momento em que ja se sabe que a
 * medicao existia: o primeiro dia com visita na resposta, ou o primeiro dia ja
 * guardado. Antes disso a Vercel tambem responde vazio (a medicao nao estava
 * ligada, ou o dia saiu da janela de 12 meses), e gravar zero ali poria no
 * arquivo uma queda de trafego que nunca aconteceu — a comparacao com o periodo
 * anterior diria "muito mais gente" so porque antes nao se media.
 */
export function totaisDoIntervalo(
  itens: ItemAgregado[],
  intervalo: Intervalo,
  guardadoDesde: string | null = null,
): LinhaDoDia[] {
  const porDia = new Map(itens.map((i) => [i.chave, i]));
  const primeiroComVisita = diasDoIntervalo(intervalo).find((dia) => porDia.has(dia)) ?? null;
  const candidatos = [primeiroComVisita, guardadoDesde].filter((d): d is string => d !== null);
  if (candidatos.length === 0) return [];
  const zerosDesde = candidatos.sort()[0];
  return diasDoIntervalo(intervalo)
    .filter((dia) => dia >= zerosDesde)
    .map((dia) => linha(dia, "total", porDia.get(dia) ?? { chave: "", visitas: 0, pessoas: 0 }));
}

class FalhaDaVercel extends Error {
  constructor(
    mensagem: string,
    /** Recusa que se repete em toda chamada (chave, projeto): parar. */
    readonly definitiva: boolean,
    /** Instante (ms) em que um 429 libera. */
    readonly liberaEm: number | null = null,
  ) {
    super(mensagem);
  }
}

export type OpcoesDaColeta = {
  /** Primeiro dia com total ja guardado desta fonte, ou null (ver `totaisDoIntervalo`). */
  guardadoDesde?: string | null;
  buscar?: typeof fetch;
  /** Instante (ms) a partir do qual nenhuma chamada nova comeca. */
  prazo?: number;
  agora?: () => number;
  esperar?: (ms: number) => Promise<void>;
};

async function consultar(
  cfg: ConfigDaVercel,
  by: Agrupamento,
  intervalo: Intervalo,
  buscar: typeof fetch,
): Promise<ItemAgregado[]> {
  let resposta: Response;
  try {
    resposta = await buscar(enderecoDaConsulta(cfg, by, intervalo), {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(TEMPO_POR_CHAMADA_MS),
      cache: "no-store",
    });
  } catch (erro) {
    const nome = (erro as Error)?.name;
    throw new FalhaDaVercel(
      nome === "TimeoutError" ? "a Vercel demorou demais para responder" : "sem conexão com a Vercel",
      false,
    );
  }

  if (resposta.status === 429) {
    const corpo = (await resposta.json().catch(() => null)) as {
      error?: { limit?: { resetMs?: unknown } };
    } | null;
    const resetMs = corpo?.error?.limit?.resetMs;
    throw new FalhaDaVercel(
      "a Vercel limitou as consultas (429)",
      true,
      typeof resetMs === "number" ? resetMs : null,
    );
  }
  if (!resposta.ok) {
    // 401, 403 e 404 dizem respeito a chave ou ao projeto, e se repetiriam em
    // todas as outras chamadas da noite.
    const definitiva = [400, 401, 402, 403, 404, 410].includes(resposta.status);
    throw new FalhaDaVercel(`a Vercel respondeu ${resposta.status} em ${by}`, definitiva);
  }

  const itens = lerAgregado(await resposta.json().catch(() => null), by);
  if (!itens) throw new FalhaDaVercel(`resposta da Vercel em formato inesperado em ${by}`, false);
  return itens;
}

type Tarefa = { by: Agrupamento; intervalo: Intervalo };

/** Coleta o intervalo inteiro: o total por dia e as quatro dimensoes de cada dia. */
export async function coletarVercel(
  cfg: ConfigDaVercel,
  intervalo: Intervalo,
  opcoes: OpcoesDaColeta = {},
): Promise<ResultadoDaColeta> {
  const buscar = opcoes.buscar ?? fetch;
  const agora = opcoes.agora ?? Date.now;
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const prazo = opcoes.prazo ?? Number.POSITIVE_INFINITY;

  const dias = diasDoIntervalo(intervalo);
  const tarefas: Tarefa[] = [
    { by: "day", intervalo },
    ...dias.flatMap((dia) =>
      (Object.keys(DIMENSAO) as Exclude<Agrupamento, "day">[]).map((by) => ({
        by,
        intervalo: { inicio: dia, fim: dia },
      })),
    ),
  ];

  const linhas: LinhaDoDia[] = [];
  const erros: string[] = [];
  const diasComFalha = new Set<string>();
  let totalChegou = false;
  let parar = false;
  let jaEsperou = false;
  let proxima = 0;

  async function executar(tarefa: Tarefa): Promise<void> {
    try {
      const itens = await consultar(cfg, tarefa.by, tarefa.intervalo, buscar);
      if (tarefa.by === "day") {
        linhas.push(...totaisDoIntervalo(itens, tarefa.intervalo, opcoes.guardadoDesde ?? null));
        totalChegou = true;
      } else {
        const dimensao = DIMENSAO[tarefa.by];
        linhas.push(...itens.map((item) => linha(tarefa.intervalo.inicio, dimensao, item)));
      }
    } catch (erro) {
      const falha = erro instanceof FalhaDaVercel ? erro : new FalhaDaVercel("falha inesperada", false);
      const espera = falha.liberaEm === null ? null : falha.liberaEm - agora();
      if (espera !== null && espera <= ESPERA_MAXIMA_MS && !jaEsperou && agora() + espera < prazo) {
        jaEsperou = true;
        await esperar(Math.max(0, espera));
        return executar(tarefa);
      }
      erros.push(falha.message);
      diasComFalha.add(tarefa.intervalo.inicio);
      if (tarefa.by === "day") dias.forEach((d) => diasComFalha.add(d));
      if (falha.definitiva) parar = true;
    }
  }

  async function trabalhador(): Promise<void> {
    while (!parar && proxima < tarefas.length) {
      if (agora() >= prazo) {
        erros.push("o tempo da função acabou antes do fim da coleta");
        parar = true;
        break;
      }
      const tarefa = tarefas[proxima];
      proxima += 1;
      await executar(tarefa);
    }
  }

  await Promise.all(Array.from({ length: CHAMADAS_SIMULTANEAS }, trabalhador));

  // Tarefa que nem comecou conta como falha do dia dela.
  for (const tarefa of tarefas.slice(proxima)) {
    if (tarefa.by === "day") dias.forEach((d) => diasComFalha.add(d));
    else diasComFalha.add(tarefa.intervalo.inicio);
  }

  const completos = totalChegou ? dias.filter((d) => !diasComFalha.has(d)) : [];
  const unicos = [...new Set(erros)];
  return {
    linhas,
    ate: completos.at(-1) ?? null,
    erro: unicos.length ? `${unicos[0]}${unicos.length > 1 ? ` (e mais ${unicos.length - 1} tipo de falha)` : ""}` : null,
  };
}
