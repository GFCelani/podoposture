import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PRAZO_ABRINDO_CONEXAO_MS } from "./disjuntor";
import {
  FALHA_AO_GRAVAR,
  FOLGA_PARA_GRAVAR_MS,
  SALVAMENTO_APOS_O_CORTE_MS,
  executarColeta,
  type PassosDoCron,
} from "./execucao-do-cron";
import type { Intervalo, LinhaDoDia, ResultadoDaColeta } from "./numeros-tipos";

const LIMITE_MS = 57_000;
const INTERVALO: Intervalo = { inicio: "2026-09-10", fim: "2026-09-14" };
const NUNCA = () => new Promise<never>(() => {});
const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function recusado() {
  return Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:55499"), { code: "ECONNREFUSED" });
}

function linhaDoDia(dia: string): LinhaDoDia {
  return { fonte: "busca", dia, dimensao: "total", chave: "", visitas: 0, pessoas: 0, cliques: 3, aparicoes: 9, posicao: 4 };
}

/** Passos que dao certo na hora, anotando a ordem em que foram chamados. */
function passosCertos(ordem: string[]): PassosDoCron {
  const resultado: ResultadoDaColeta = { linhas: [], ate: "2026-09-14", erro: null };
  return {
    primeiroDiaGuardado: async () => null,
    coletar: async (fonte) => {
      ordem.push(`coletar:${fonte}`);
      return resultado;
    },
    gravarLinhas: async () => {
      ordem.push("gravar");
      return 0;
    },
    registrarColeta: async () => {
      ordem.push("registrar");
    },
    podarNumeros: async () => {
      ordem.push("podarNumeros");
    },
    podarDadosDoPainel: async () => {
      ordem.push("podarPainel");
    },
    avisarSeFalhouDuasNoites: async () => {
      ordem.push("aviso");
    },
    provarLeitura: async () => {
      ordem.push("prova");
    },
    invalidar: () => {
      ordem.push("invalidar");
    },
    anotarQuePulou: async () => {
      ordem.push("anotar");
    },
  };
}

async function rodar(passos: PassosDoCron, historico = false) {
  const inicio = Date.now();
  const execucao = executarColeta({
    inicio,
    limiteMs: LIMITE_MS,
    historico,
    vercel: INTERVALO,
    busca: INTERVALO,
    passos,
  });
  // O instante em que terminou, e nao o do relogio depois de avancar tudo.
  let terminouEm = 0;
  void execucao.then(() => {
    terminouEm = Date.now();
  });
  await vi.advanceTimersByTimeAsync(LIMITE_MS + 5_000);
  const feito = await execucao;
  return { feito, duracao: terminouEm - inicio };
}

describe("roteiro da coleta diaria", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("tudo certo: a limpeza do cache e a ultima coisa, depois de gravar, podar e avisar", async () => {
    const ordem: string[] = [];
    const { feito } = await rodar(passosCertos(ordem));
    expect(feito).toMatchObject({ cacheInvalidado: true, podaFalhou: false, prazoEsgotado: false });
    expect(ordem.filter((p) => p === "invalidar")).toHaveLength(1);
    expect(ordem.slice(-2)).toEqual(["prova", "invalidar"]);
    expect(ordem.indexOf("prova")).toBeGreaterThan(ordem.lastIndexOf("gravar"));
    expect(ordem.indexOf("prova")).toBeGreaterThan(ordem.indexOf("podarPainel"));
  });

  it("banco que trava depois de responder a leitura: nada e invalidado", async () => {
    // O caso da rodada: a prova passava as 6h, a gravacao pendurava, a execucao
    // respondia 502 aos 57 s e o Next aplicava a limpeza pedida no comeco.
    const ordem: string[] = [];
    const passos = { ...passosCertos(ordem), gravarLinhas: NUNCA };
    const { feito, duracao } = await rodar(passos);
    expect(ordem).not.toContain("invalidar");
    expect(ordem).not.toContain("prova");
    expect(feito).toMatchObject({ prazoEsgotado: true, cacheInvalidado: null, gravacaoFalhou: true });
    expect(duracao).toBeLessThanOrEqual(LIMITE_MS);
  });

  it("poda que trava no banco: sem aviso, sem prova e sem limpeza do cache", async () => {
    const ordem: string[] = [];
    const passos = { ...passosCertos(ordem), podarDadosDoPainel: NUNCA };
    const { feito } = await rodar(passos);
    expect(ordem).not.toContain("aviso");
    expect(ordem).not.toContain("invalidar");
    expect(feito).toMatchObject({ prazoEsgotado: true, podaFalhou: true });
  });

  it("uma fonte grava e a outra falha no banco: nao invalida", async () => {
    const ordem: string[] = [];
    let gravacoes = 0;
    const passos = {
      ...passosCertos(ordem),
      gravarLinhas: async () => {
        gravacoes += 1;
        if (gravacoes === 2) throw recusado();
        return 0;
      },
    };
    const { feito } = await rodar(passos);
    expect(ordem).not.toContain("invalidar");
    expect(feito.cacheInvalidado).toBe(false);
    expect(feito.prazoEsgotado).toBe(false);
  });

  it("banco recusando conexao: responde logo, sem culpar o prazo, e nao espera podas nem aviso", async () => {
    // O driver espera um intervalo crescente antes de cada nova tentativa de
    // conexao; podar e ler o historico de falhas depois disso levava a execucao
    // aos 57 s e ela saia como "prazo esgotado".
    const ordem: string[] = [];
    const passos: PassosDoCron = {
      ...passosCertos(ordem),
      gravarLinhas: () => Promise.reject(recusado()),
      registrarColeta: () => Promise.reject(recusado()),
      podarNumeros: () => dormir(15_000),
      podarDadosDoPainel: () => dormir(15_000),
      avisarSeFalhouDuasNoites: () => dormir(15_000),
      provarLeitura: () => dormir(15_000),
    };
    const { feito, duracao } = await rodar(passos);
    expect(feito.resumos.map((r) => r.erro)).toEqual([FALHA_AO_GRAVAR, FALHA_AO_GRAVAR]);
    expect(feito).toMatchObject({ prazoEsgotado: false, podaFalhou: true, cacheInvalidado: false });
    expect(duracao).toBeLessThan(1_000);
    expect(ordem).not.toContain("invalidar");
  });

  it("segunda execucao com o banco recusando: responde como a primeira, sem repetir a espera do driver", async () => {
    // Medido na rodada: na mesma instancia a primeira volta em 0,5 s, a
    // segunda esperava ~37 s o driver reconectar — para dizer o mesmo — e a
    // terceira estourava o prazo com prazoEsgotado:true.
    const memoria = { recusouEm: null as number | null };
    const recusando: PassosDoCron = {
      ...passosCertos([]),
      gravarLinhas: () => Promise.reject(recusado()),
      registrarColeta: () => Promise.reject(recusado()),
    };
    const primeira = executarColeta({
      inicio: Date.now(),
      limiteMs: LIMITE_MS,
      historico: false,
      vercel: INTERVALO,
      busca: INTERVALO,
      passos: recusando,
      memoria,
    });
    await vi.advanceTimersByTimeAsync(10);
    expect((await primeira).prazoEsgotado).toBe(false);
    expect(memoria.recusouEm).not.toBeNull();

    const ordem: string[] = [];
    const esperandoReconectar: PassosDoCron = {
      ...passosCertos(ordem),
      // Com o banco recusando, o driver faz TODO passo esperar o intervalo
      // crescente antes de falhar — inclusive a leitura do primeiro dia.
      primeiroDiaGuardado: async () => {
        await dormir(45_000);
        throw recusado();
      },
      gravarLinhas: async () => {
        await dormir(45_000);
        throw recusado();
      },
      registrarColeta: () => Promise.reject(recusado()),
    };
    const comecou = Date.now();
    const segunda = executarColeta({
      inicio: comecou,
      limiteMs: LIMITE_MS,
      historico: false,
      vercel: INTERVALO,
      busca: INTERVALO,
      passos: esperandoReconectar,
      memoria,
    });
    let terminouEm = 0;
    void segunda.then(() => {
      terminouEm = Date.now();
    });
    await vi.advanceTimersByTimeAsync(LIMITE_MS + 5_000);
    expect(await segunda).toMatchObject({ prazoEsgotado: false, podaFalhou: true, cacheInvalidado: false });
    expect(ordem).not.toContain("invalidar");
    // O ponto: nao esperar de novo o intervalo com que o driver tenta reconectar.
    // Paga uma vez o prazo de abrir conexao, que e o que da chance ao banco que
    // voltou (ver o teste seguinte), e nao os ~37 s do driver.
    expect(terminouEm - comecou).toBeLessThan(PRAZO_ABRINDO_CONEXAO_MS + 2_000);

    // Sem recusa recente, o mesmo corte e banco travado.
    const semMemoria = await rodar({ ...passosCertos([]), gravarLinhas: NUNCA });
    expect(semMemoria.feito.prazoEsgotado).toBe(true);
  });

  it("Vercel ou Google lentos: o corte nao culpa o banco, e podas, aviso e limpeza seguem", async () => {
    const ordem: string[] = [];
    const registros: string[] = [];
    const passos: PassosDoCron = {
      ...passosCertos(ordem),
      coletar: async (fonte) => {
        if (fonte === "busca") return NUNCA();
        return { linhas: [], ate: null, erro: null };
      },
      registrarColeta: async (r) => {
        registros.push(`${r.fonte}:${r.situacao}`);
      },
    };
    const { feito } = await rodar(passos);
    expect(feito.prazoEsgotado).toBe(false);
    expect(feito.resumos.find((r) => r.fonte === "busca")?.situacao).toBe("erro");
    // A noite perdida fica registrada, para contar no aviso de duas noites.
    expect(registros).toContain("busca:erro");
    expect(ordem).toContain("podarPainel");
    expect(ordem.at(-1)).toBe("invalidar");
  });

  it("corte por prazo: a fonte que devolve o parcial na janela de salvamento ainda grava", async () => {
    // Antes o corte descartava tudo: o que a Vercel e o Google ja tinham
    // entregue morria numa promessa que nao podia mais escrever, e a noite
    // inteira se perdia por causa de uma consulta atrasada.
    const ordem: string[] = [];
    const gravadas: LinhaDoDia[] = [];
    const passos: PassosDoCron = {
      ...passosCertos(ordem),
      coletar: async (fonte, _intervalo, { prazo }) => {
        if (fonte === "vercel") return { linhas: [], ate: "2026-09-14", erro: null };
        // Devolve dois dias ja coletados depois do corte, ainda na janela de salvamento.
        await dormir(prazo - Date.now() + FOLGA_PARA_GRAVAR_MS + SALVAMENTO_APOS_O_CORTE_MS - 1_000);
        return {
          linhas: [linhaDoDia("2026-09-10"), linhaDoDia("2026-09-11")],
          ate: null,
          erro: "o tempo da função acabou antes do fim da coleta",
        };
      },
      gravarLinhas: async (linhas) => {
        ordem.push("gravar");
        gravadas.push(...linhas);
        return linhas.length;
      },
    };
    const { feito, duracao } = await rodar(passos);
    expect(gravadas.map((l) => l.dia)).toEqual(["2026-09-10", "2026-09-11"]);
    const busca = feito.resumos.find((r) => r.fonte === "busca");
    expect(busca).toMatchObject({ situacao: "erro", linhas: 2 });
    expect(feito).toMatchObject({ prazoEsgotado: false, cacheInvalidado: true });
    expect(duracao).toBeLessThanOrEqual(LIMITE_MS);
  });

  it("coleta que usa o prazo inteiro: gravar, podar, avisar e provar ainda cabem antes do limite", async () => {
    const ordem: string[] = [];
    let prazoDoAviso = 0;
    const inicio = Date.now();
    const passos: PassosDoCron = {
      ...passosCertos(ordem),
      // A ultima chamada comeca no ultimo instante e leva o teto do Google.
      coletar: async (_fonte, _intervalo, { prazo }) => {
        await dormir(prazo - Date.now() + 15_000);
        return { linhas: [], ate: null, erro: null };
      },
      gravarLinhas: async () => {
        await dormir(1_000);
        return 0;
      },
      podarNumeros: () => dormir(2_000),
      podarDadosDoPainel: () => dormir(3_000),
      avisarSeFalhouDuasNoites: async (_resumos, prazo) => {
        prazoDoAviso = prazo;
        await dormir(prazo - Date.now());
      },
    };
    const { feito, duracao } = await rodar(passos);
    expect(feito).toMatchObject({ prazoEsgotado: false, podaFalhou: false, cacheInvalidado: true });
    expect(prazoDoAviso - inicio).toBeLessThan(LIMITE_MS);
    expect(duracao).toBeLessThanOrEqual(LIMITE_MS);
  });

  it("lote do historico: nao poda, nao avisa, nao invalida, e o banco travado marca a gravacao como falha", async () => {
    const ordem: string[] = [];
    const certo = await rodar(passosCertos(ordem), true);
    expect(certo.feito).toMatchObject({ cacheInvalidado: null, podaFalhou: null, gravacaoFalhou: false });
    expect(ordem).not.toContain("podarPainel");
    expect(ordem).not.toContain("invalidar");

    const travado = await rodar({ ...passosCertos([]), gravarLinhas: NUNCA }, true);
    expect(travado.feito).toMatchObject({ prazoEsgotado: true, gravacaoFalhou: true, resumos: [] });
  });

  it("lote do historico com o banco recusando: responde rapido, acusa a gravacao e lista as fontes", async () => {
    // O backfill e chamado em sequencia: da segunda chamada em diante a recusa
    // ja esta na memoria da instancia. Antes a resposta vinha aos ~37 s, com a
    // lista de fontes vazia e status 200 — contra o que o README-painel promete.
    const memoria = { recusouEm: Date.now() };
    const inicio = Date.now();
    const execucao = executarColeta({
      inicio,
      limiteMs: LIMITE_MS,
      historico: true,
      vercel: INTERVALO,
      busca: INTERVALO,
      passos: { ...passosCertos([]), primeiroDiaGuardado: NUNCA, gravarLinhas: NUNCA, registrarColeta: NUNCA },
      memoria,
    });
    let terminouEm = 0;
    void execucao.then(() => {
      terminouEm = Date.now();
    });
    await vi.advanceTimersByTimeAsync(LIMITE_MS + 5_000);
    const feito = await execucao;
    expect(feito).toMatchObject({
      prazoEsgotado: false,
      gravacaoFalhou: true,
      cacheInvalidado: null,
      podaFalhou: null,
    });
    expect(feito.resumos.map((r) => r.erro)).toEqual([FALHA_AO_GRAVAR, FALHA_AO_GRAVAR]);
    // O primeiro passo de cada fonte paga o prazo de abrir conexao — e o preco
    // de o banco que voltou ser alcancado — e os seguintes correm no prazo curto.
    expect(terminouEm - inicio).toBeLessThan(PRAZO_ABRINDO_CONEXAO_MS + 3_000);
  });

  it("banco que recusou e voltou: a execucao seguinte na mesma instancia acorda ele e grava", async () => {
    // A regressao: com o prazo curto valendo ja no primeiro passo, nada alcancava
    // o banco enquanto a recusa estivesse na memoria. A conexao e uma so, abrir
    // ela com o banco frio das 6h levou 6 s medidos, e o passo abandonado seguia
    // ocupando a conexao — o backfill repetia o mesmo lote em 502 pelos 5 minutos
    // inteiros, com o banco de pe.
    const memoria = { recusouEm: Date.now() };
    const ordem: string[] = [];
    const certos = passosCertos(ordem);
    let acordou = false;
    const acordar = async () => {
      if (acordou) return;
      await dormir(6_000);
      acordou = true;
    };
    const passos: PassosDoCron = {
      ...certos,
      primeiroDiaGuardado: async (fonte) => {
        await acordar();
        return certos.primeiroDiaGuardado(fonte);
      },
      gravarLinhas: async (linhas) => {
        await acordar();
        return certos.gravarLinhas(linhas);
      },
      registrarColeta: async (registro) => {
        await acordar();
        return certos.registrarColeta(registro);
      },
    };
    const inicio = Date.now();
    const execucao = executarColeta({
      inicio,
      limiteMs: LIMITE_MS,
      historico: false,
      vercel: INTERVALO,
      busca: INTERVALO,
      passos,
      memoria,
    });
    await vi.advanceTimersByTimeAsync(LIMITE_MS + 5_000);
    const feito = await execucao;
    expect(feito).toMatchObject({ gravacaoFalhou: false, prazoEsgotado: false, cacheInvalidado: true });
    expect(ordem).toContain("gravar");
    // O banco respondeu: a proxima execucao nao herda mais o prazo curto.
    expect(memoria.recusouEm).toBeNull();
  });

  it("uma fonte falha e a outra encontra o banco de pe: a recusa sai da memoria e a gravacao dela nao e cortada", async () => {
    // Qualquer passo no banco que da certo apaga a recusa, e nao so a gravacao:
    // aqui quem prova que o banco responde e a leitura do primeiro dia guardado.
    const memoria = { recusouEm: null as number | null };
    const ordem: string[] = [];
    const certos = passosCertos(ordem);
    let gravacoes = 0;
    let registros = 0;
    const passos: PassosDoCron = {
      ...certos,
      // A vercel espera o banco frio acordar; a busca cai antes disso.
      primeiroDiaGuardado: async () => {
        await dormir(6_000);
        return null;
      },
      gravarLinhas: async (linhas) => {
        gravacoes += 1;
        if (gravacoes === 1) throw recusado();
        // Com o banco ja de pe, a gravacao leva mais que o prazo curto.
        await dormir(3_000);
        return certos.gravarLinhas(linhas);
      },
      registrarColeta: async (registro) => {
        registros += 1;
        if (registros === 1) throw recusado();
        return certos.registrarColeta(registro);
      },
    };
    const inicio = Date.now();
    const execucao = executarColeta({
      inicio,
      limiteMs: LIMITE_MS,
      historico: false,
      vercel: INTERVALO,
      busca: INTERVALO,
      passos,
      memoria,
    });
    await vi.advanceTimersByTimeAsync(LIMITE_MS + 5_000);
    const feito = await execucao;
    expect(feito.resumos.find((r) => r.fonte === "vercel")).toMatchObject({ situacao: "ok" });
    expect(feito.resumos.find((r) => r.fonte === "busca")?.erro).toBe(FALHA_AO_GRAVAR);
    expect(ordem).toContain("gravar");
    expect(memoria.recusouEm).toBeNull();
  });
});
