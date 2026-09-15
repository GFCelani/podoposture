import { invalidarCacheSeOBancoResponde } from "./cron";
import { PrazoEsgotado, comPrazo } from "./disjuntor";
import type { Fonte, Intervalo, LinhaDoDia, ResultadoDaColeta, SituacaoDaColeta } from "./numeros-tipos";

/**
 * O roteiro da coleta diaria, com o relogio de cada etapa.
 *
 * Mora aqui, e nao na rota, para ser testado sem subir Next nem banco: tudo que
 * fala com fora (Vercel, Google, banco, cache do site) entra por `passos`.
 *
 * A ordem e a regra que importa. A limpeza do cache do site e a ULTIMA coisa,
 * depois de gravar, podar e avisar, e so acontece se nada disso estourou o prazo
 * nem falhou no banco, e se uma leitura publica feita ali mesmo responder. Antes
 * ela era pedida no comeco: no Next 16 o pedido so e aplicado quando a rota
 * responde, entao um banco que travava depois da prova recebia a limpeza do
 * mesmo jeito, e as 88 paginas se refaziam lendo esse banco e guardavam o texto
 * padrao por um dia (ver lib/cron.ts).
 *
 * Cada etapa tem prazo proprio, contado de tras para frente a partir do limite
 * total. Assim o fim (podas, aviso, prova) nao fica com a sobra do que a coleta
 * deixou, e um corte no meio diz o que de fato demorou.
 */

/**
 * O que a noite reserva, depois da coleta, para podar, avisar e provar a leitura.
 * O lote do historico nao faz nenhum dos tres e usa o tempo todo para coletar.
 */
export const RESERVA_PARA_O_FIM_MS = 20_000;

/**
 * Da ultima chamada nova ate o fim da etapa de coleta. Uma chamada que comeca
 * no ultimo instante ainda pode levar 15 s (o teto por chamada do Google), e a
 * gravacao vem depois dela.
 */
export const FOLGA_PARA_GRAVAR_MS = 17_000;

/** Ate quanto antes do limite as podas podem correr: o resto e do aviso e da prova. */
const FIM_DAS_PODAS_ANTES_DO_LIMITE_MS = 11_000;

/** Ate quanto antes do limite o aviso pode correr: o resto e da prova de leitura. */
const FIM_DO_AVISO_ANTES_DO_LIMITE_MS = 6_000;

/** A mensagem de toda falha de gravacao, e o que diferencia ela de falha da Vercel ou do Google. */
export const FALHA_AO_GRAVAR = "falha ao gravar no banco";

const TEMPO_DAS_CHAMADAS_ACABOU = "o tempo da função acabou antes do fim da coleta";

export type Resumo = {
  fonte: Fonte;
  situacao: SituacaoDaColeta;
  intervalo: Intervalo;
  linhas: number;
  ate: string | null;
  erro: string | null;
};

export type RegistroDaColeta = {
  fonte: Fonte;
  situacao: SituacaoDaColeta;
  historico: boolean;
  ate: string | null;
  linhas: number;
  erro: string | null;
};

/**
 * O que a execucao conseguiu fazer. `cacheInvalidado` e `podaFalhou` ficam null
 * quando nao foram tentados (lote de historico, ou prazo esgotado antes).
 */
export type Feito = {
  cacheInvalidado: boolean | null;
  podaFalhou: boolean | null;
  resumos: Resumo[];
  /** O banco nao respondeu a tempo em alguma etapa. */
  prazoEsgotado: boolean;
  /** Alguma fonte nao conseguiu gravar (banco recusou, caiu ou nao respondeu). */
  gravacaoFalhou: boolean;
};

export type PassosDoCron = {
  /** Primeiro dia ja guardado da fonte (so a Vercel usa). */
  primeiroDiaGuardado: (fonte: Fonte) => Promise<string | null>;
  /** O coletor da fonte, ou null quando a credencial nao existe. Nao lanca. */
  coletar: (
    fonte: Fonte,
    intervalo: Intervalo,
    opcoes: { prazo: number; guardadoDesde: string | null },
  ) => Promise<ResultadoDaColeta | null>;
  gravarLinhas: (linhas: LinhaDoDia[]) => Promise<number>;
  registrarColeta: (registro: RegistroDaColeta) => Promise<void>;
  podarNumeros: () => Promise<void>;
  podarDadosDoPainel: () => Promise<void>;
  /** `prazo` e o instante (ms) em que o aviso precisa ter terminado. */
  avisarSeFalhouDuasNoites: (resumos: Resumo[], prazo: number) => Promise<void>;
  provarLeitura: () => Promise<unknown>;
  invalidar: () => void;
  anotarQuePulou: (motivo: string) => Promise<void>;
};

/** Codigos de banco que recusou a conexao ou nem foi achado, e nao de banco travado. */
const CONEXAO_RECUSADA = new Set(["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"]);

function conexaoRecusada(erro: unknown): boolean {
  const codigo = (erro as { code?: unknown } | null)?.code;
  return typeof codigo === "string" && CONEXAO_RECUSADA.has(codigo);
}

/** Por quanto tempo uma recusa ainda explica uma gravacao que nao volta. */
const RECUSA_RECENTE_MS = 5 * 60 * 1000;

/**
 * O que a instancia lembra do banco entre uma execucao e outra.
 *
 * Existe por causa do driver: depois de uma conexao recusada, cada tentativa
 * nova espera um intervalo crescente (medido: 0,2 s, 2 s, 5 s, ate uns 20 s)
 * antes de falhar. Na primeira execucao a recusa volta na hora; numa segunda
 * na mesma instancia a gravacao fica esperando esse intervalo e estoura o
 * prazo, e sem esta memoria saia "prazo esgotado", como se o banco estivesse
 * travado e nao fora do ar.
 */
export type MemoriaDoBanco = { recusouEm: number | null };

export async function executarColeta(entrada: {
  inicio: number;
  /** Quanto a execucao inteira pode durar, ja descontado o tempo de responder. */
  limiteMs: number;
  historico: boolean;
  vercel: Intervalo | null;
  busca: Intervalo | null;
  passos: PassosDoCron;
  agora?: () => number;
  /** Guardada pela rota entre execucoes da mesma instancia (ver `MemoriaDoBanco`). */
  memoria?: MemoriaDoBanco;
}): Promise<Feito> {
  const { passos, historico } = entrada;
  const agora = entrada.agora ?? Date.now;
  const limite = entrada.inicio + entrada.limiteMs;
  const fimDaColeta = limite - (historico ? 0 : RESERVA_PARA_O_FIM_MS);
  const prazoDasChamadas = fimDaColeta - FOLGA_PARA_GRAVAR_MS;
  const restaAte = (instante: number) => instante - agora();

  const feito: Feito = { cacheInvalidado: null, podaFalhou: null, resumos: [], prazoEsgotado: false, gravacaoFalhou: false };

  // Em que parte cada fonte esta. Quando a etapa estoura, e isto que diz se quem
  // demorou foi o banco ou a Vercel e o Google — o log e o `prazoEsgotado`
  // dependem disso.
  const emCurso = new Map<Fonte, "banco" | "chamadas">();
  // Depois do corte, o trabalho que ficou pendurado nao escreve mais nada: uma
  // gravacao atrasada entraria na fila da conexao unica atras das podas e da
  // prova, e um registro atrasado contaria a mesma noite duas vezes.
  let cortado = false;

  async function noBanco<T>(fonte: Fonte, passo: () => Promise<T>): Promise<T> {
    if (cortado) throw new PrazoEsgotado(0);
    emCurso.set(fonte, "banco");
    return passo();
  }

  async function processar(fonte: Fonte, intervalo: Intervalo | null): Promise<void> {
    if (!intervalo) return;
    let resumo: Resumo;
    try {
      const guardadoDesde = fonte === "vercel" ? await noBanco(fonte, () => passos.primeiroDiaGuardado(fonte)) : null;
      emCurso.set(fonte, "chamadas");
      const resultado = await passos.coletar(fonte, intervalo, { prazo: prazoDasChamadas, guardadoDesde });
      if (!resultado) {
        await noBanco(fonte, () =>
          passos.registrarColeta({ fonte, situacao: "nao-configurada", historico, ate: null, linhas: 0, erro: null }),
        );
        resumo = { fonte, situacao: "nao-configurada", intervalo, linhas: 0, ate: null, erro: null };
      } else {
        // Grava o que chegou mesmo com erro: dia que veio inteiro nao precisa
        // esperar a proxima noite por causa de outro dia que falhou.
        const linhas = await noBanco(fonte, () => passos.gravarLinhas(resultado.linhas));
        // O banco aceitou: uma recusa antiga nao explica mais um corte daqui para frente.
        if (entrada.memoria) entrada.memoria.recusouEm = null;
        const situacao: SituacaoDaColeta = resultado.erro ? "erro" : "ok";
        await noBanco(fonte, () =>
          passos.registrarColeta({ fonte, situacao, historico, ate: resultado.ate, linhas, erro: resultado.erro }),
        );
        if (resultado.erro) console.error(`[cron] ${fonte}: ${resultado.erro}`);
        resumo = { fonte, situacao, intervalo, linhas, ate: resultado.ate, erro: resultado.erro };
      }
    } catch (erro) {
      // Anotada mesmo depois do corte: a recusa que chega atrasada e o que
      // explica o corte da proxima execucao nesta instancia.
      if (conexaoRecusada(erro) && entrada.memoria) entrada.memoria.recusouEm = agora();
      if (cortado) return;
      console.error(`[cron] falha ao gravar ${fonte}:`, erro);
      feito.gravacaoFalhou = true;
      await passos
        .registrarColeta({ fonte, situacao: "erro", historico, ate: null, linhas: 0, erro: FALHA_AO_GRAVAR })
        .catch(() => {});
      resumo = { fonte, situacao: "erro", intervalo, linhas: 0, ate: null, erro: FALHA_AO_GRAVAR };
    }
    emCurso.delete(fonte);
    // Cada fonte anota o proprio resumo quando termina, para a resposta de prazo
    // esgotado ainda contar a que chegou ao fim.
    if (!cortado) feito.resumos.push(resumo);
  }

  try {
    await comPrazo(Promise.all([processar("vercel", entrada.vercel), processar("busca", entrada.busca)]), restaAte(fimDaColeta));
  } catch (erro) {
    if (!(erro instanceof PrazoEsgotado)) throw erro;
    cortado = true;
    const pendentes = [...emCurso.entries()];
    emCurso.clear();
    if (pendentes.some(([, onde]) => onde === "banco")) {
      feito.gravacaoFalhou = true;
      const recusou = entrada.memoria?.recusouEm;
      if (recusou != null && agora() - recusou < RECUSA_RECENTE_MS) {
        // O banco nao esta travado: esta recusando conexao, e o driver espera
        // um intervalo crescente antes de tentar de novo. Mesmo tratamento do
        // banco fora abaixo, sem dizer que o prazo acabou.
        console.error("[cron] podas, aviso e limpeza do cache pulados: o banco esta recusando conexao");
        feito.podaFalhou = historico ? null : true;
        feito.cacheInvalidado = historico ? null : false;
        return feito;
      }
      feito.prazoEsgotado = true;
      console.error("[cron] a execucao passou do prazo: o banco nao respondeu a tempo");
      return feito;
    }
    // Quem demorou foi a Vercel ou o Google. O banco nao esta implicado, e a
    // noite segue: as podas e a prova ainda dizem se ele responde.
    console.error("[cron] as chamadas a Vercel ou ao Google passaram do prazo da coleta");
    for (const [fonte] of pendentes) {
      const intervalo = fonte === "vercel" ? entrada.vercel : entrada.busca;
      if (!intervalo) continue;
      feito.resumos.push({ fonte, situacao: "erro", intervalo, linhas: 0, ate: null, erro: TEMPO_DAS_CHAMADAS_ACABOU });
      // Registrada aqui porque o trabalho cortado nao registra mais nada, e sem
      // o registro a noite perdida nao entra na conta do aviso de duas noites.
      await comPrazo(
        passos.registrarColeta({ fonte, situacao: "erro", historico, ate: null, linhas: 0, erro: TEMPO_DAS_CHAMADAS_ACABOU }),
        restaAte(limite - FIM_DAS_PODAS_ANTES_DO_LIMITE_MS),
      ).catch(() => {});
    }
  }

  if (historico) return feito;

  // Toda fonte falhou ao gravar: o banco esta fora. Podar, ler o historico de
  // falhas e provar a leitura so esperariam, cada um, o intervalo crescente com
  // que o driver tenta reconectar — era isso que levava a execucao aos 57 s.
  const bancoFora = feito.resumos.length > 0 && feito.resumos.every((r) => r.erro === FALHA_AO_GRAVAR);
  if (bancoFora) {
    console.error("[cron] podas, aviso e limpeza do cache pulados: nenhuma fonte conseguiu gravar no banco");
    feito.podaFalhou = true;
    feito.cacheInvalidado = false;
    return feito;
  }

  const fimDasPodas = limite - FIM_DAS_PODAS_ANTES_DO_LIMITE_MS;
  try {
    await comPrazo(
      passos.podarNumeros().catch((erro) => console.error("[cron] falha ao podar numeros:", erro)),
      restaAte(fimDasPodas),
    );
    // O prazo do IP de quem tenta entrar e o teto do registro de acoes sao
    // promessa escrita na pagina de privacidade. As podas de dentro do painel
    // dependem de alguem usa-lo; esta roda todo dia, com ou sem trafego.
    // O resultado vai para a resposta e para o status: falhando calada toda
    // noite, os IPs ficavam guardados por dias contra o texto da /privacidade.
    feito.podaFalhou = await comPrazo(
      passos.podarDadosDoPainel().then(
        () => false,
        (erro) => {
          console.error("[cron] falha ao podar os dados do painel:", erro);
          return true;
        },
      ),
      restaAte(fimDasPodas),
    );
  } catch (erro) {
    if (!(erro instanceof PrazoEsgotado)) throw erro;
    // Poda e so banco: se ela nao volta, o banco nao responde, e a prova de
    // leitura so entraria na fila atras dela.
    feito.prazoEsgotado = true;
    feito.podaFalhou = true;
    console.error("[cron] a poda passou do prazo: o banco nao respondeu a tempo");
    return feito;
  }

  const fimDoAviso = limite - FIM_DO_AVISO_ANTES_DO_LIMITE_MS;
  await comPrazo(passos.avisarSeFalhouDuasNoites(feito.resumos, fimDoAviso), restaAte(fimDoAviso)).catch((erro) => {
    // O aviso le o banco e chama o Telegram; qualquer um dos dois pode ter
    // demorado. Se foi o banco, a prova logo abaixo tambem nao passa.
    console.error("[cron] o aviso por Telegram nao terminou:", (erro as Error)?.name);
  });

  if (feito.gravacaoFalhou) {
    // Uma fonte gravou e a outra nao: o banco falhou nesta mesma execucao, e
    // limpar o cache agora e apostar que ele voltou.
    console.error("[cron] cache nao invalidado: uma gravacao no banco falhou nesta execucao");
    feito.cacheInvalidado = false;
    return feito;
  }

  // A prova e feita aqui, no fim, e o pedido de limpeza e a ultima coisa antes
  // de responder: nao sobra etapa de banco entre a leitura que passou e o
  // momento em que o Next aplica a limpeza.
  feito.cacheInvalidado = await invalidarCacheSeOBancoResponde({
    provarLeitura: () => comPrazo(passos.provarLeitura(), restaAte(limite)),
    invalidar: passos.invalidar,
    anotarQuePulou: (motivo) => comPrazo(passos.anotarQuePulou(motivo), restaAte(limite)),
  });
  return feito;
}
