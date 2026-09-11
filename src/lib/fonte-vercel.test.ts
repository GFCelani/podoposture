import { describe, expect, it, vi } from "vitest";

// `server-only` lanca fora do empacotador do Next; nos testes ele nao guarda nada.
vi.mock("server-only", () => ({}));

import {
  coletarVercel,
  configDaVercel,
  enderecoDaConsulta,
  lerAgregado,
  totaisDoIntervalo,
  type ConfigDaVercel,
} from "./fonte-vercel";

const CFG: ConfigDaVercel = { token: "token-de-teste", projeto: "prj_teste", time: null };
const TRES_DIAS = { inicio: "2026-09-01", fim: "2026-09-03" };

/** Inicio do dia UTC em milissegundos, como a consulta manda. */
const ms = (dia: string) => String(Date.parse(`${dia}T00:00:00.000Z`));
/** O dia UTC de um `since` em milissegundos. */
const diaDe = (since: string | null) => new Date(Number(since)).toISOString().slice(0, 10);

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

type Pedido = { url: URL; init: RequestInit };

/** Uma Vercel falsa que responde no formato da documentacao. */
function vercelFalsa(responder?: (url: URL, n: number) => Response | Promise<Response> | null) {
  const pedidos: Pedido[] = [];
  const buscar = (async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(entrada));
    pedidos.push({ url, init: init ?? {} });
    const especial = responder?.(url, pedidos.length);
    if (especial) return especial;
    const by = url.searchParams.get("by")!;
    if (by === "day") {
      return json({
        version: 1,
        query: { groupBy: ["day"] },
        data: [{ timestamp: `${diaDe(url.searchParams.get("since"))}T00:00:00.000Z`, pageviews: 10, visitors: 7 }],
      });
    }
    return json({ version: 1, data: [{ [by]: by === "requestPath" ? "/home/f/texto" : "valor", pageviews: 3, visitors: 2 }] });
  }) as typeof fetch;
  return { buscar, pedidos };
}

describe("configDaVercel", () => {
  it("exige token e projeto; time e opcional", () => {
    expect(configDaVercel({ VERCEL_API_TOKEN: " t ", VERCEL_PROJECT_ID: "p" } as unknown as NodeJS.ProcessEnv)).toEqual({
      token: "t",
      projeto: "p",
      time: null,
    });
    expect(configDaVercel({ VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "p", VERCEL_TEAM_ID: "team_x" } as unknown as NodeJS.ProcessEnv)?.time).toBe(
      "team_x",
    );
    expect(configDaVercel({ VERCEL_API_TOKEN: "t" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(configDaVercel({ VERCEL_PROJECT_ID: "p", VERCEL_API_TOKEN: "  " } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe("enderecoDaConsulta", () => {
  it("monta so com parametros fixos, uma dimensao, limite 100", () => {
    const url = new URL(enderecoDaConsulta(CFG, "requestPath", { inicio: "2026-09-01", fim: "2026-09-01" }));
    expect(`${url.origin}${url.pathname}`).toBe("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
    // Milissegundos do inicio ao fim do dia em UTC: data solta deixava o fuso a
    // criterio da API. 1788220800000 = 2026-09-01T00:00:00Z.
    expect(Object.fromEntries(url.searchParams)).toEqual({
      projectId: "prj_teste",
      since: "1788220800000",
      until: "1788307199999",
      by: "requestPath",
      limit: "100",
    });
    expect(new Date(1788220800000).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(new Date(1788307199999).toISOString()).toBe("2026-09-01T23:59:59.999Z");
    expect(url.searchParams.has("filter")).toBe(false);
    expect(new URL(enderecoDaConsulta({ ...CFG, time: "team_x" }, "day", TRES_DIAS)).searchParams.get("teamId")).toBe("team_x");
  });
});

describe("lerAgregado", () => {
  it("le a linha de tempo do exemplo da documentacao", () => {
    const resposta = {
      version: 1,
      query: { since: "2024-10-01", until: "2024-10-07", groupBy: ["day"] },
      data: [
        { timestamp: "2024-10-01T00:00:00.000Z", pageviews: 220, visitors: 180 },
        { timestamp: "2024-10-02T00:00:00.000Z", pageviews: 198, visitors: 160 },
      ],
    };
    expect(lerAgregado(resposta, "day")).toEqual([
      { chave: "2024-10-01", visitas: 220, pessoas: 180 },
      { chave: "2024-10-02", visitas: 198, pessoas: 160 },
    ]);
  });

  it("le a dimensao pelo nome dela e descarta o grupo Others", () => {
    const resposta = {
      version: 1,
      data: [
        { country: "US", pageviews: 640, visitors: 510 },
        { country: "Others", pageviews: 3, visitors: 2 },
      ],
    };
    expect(lerAgregado(resposta, "country")).toEqual([{ chave: "US", visitas: 640, pessoas: 510 }]);
    // referencia vazia e quem digitou o endereco: fica, com chave vazia
    expect(lerAgregado({ data: [{ referrerHostname: null, pageviews: 5, visitors: 4 }] }, "referrerHostname")).toEqual([
      { chave: "", visitas: 5, pessoas: 4 },
    ]);
  });

  it("forma diferente da documentada e null, e numero estranho vira zero", () => {
    expect(lerAgregado({}, "day")).toBeNull();
    expect(lerAgregado({ data: "x" }, "day")).toBeNull();
    expect(lerAgregado(null, "day")).toBeNull();
    expect(lerAgregado({ data: [{ timestamp: "ontem", pageviews: 1, visitors: 1 }] }, "day")).toEqual([]);
    expect(lerAgregado({ data: [{ deviceType: "mobile", pageviews: -2, visitors: "3" }] }, "deviceType")).toEqual([
      { chave: "mobile", visitas: 0, pessoas: 0 },
    ]);
  });
});

describe("totaisDoIntervalo", () => {
  const cinco = { inicio: "2026-09-01", fim: "2026-09-05" };
  const dia3 = [{ chave: "2026-09-03", visitas: 10, pessoas: 7 }];

  it("zera so a partir do primeiro dia com visita quando nada foi guardado ainda", () => {
    const linhas = totaisDoIntervalo(dia3, cinco);
    expect(linhas.map((l) => [l.dia, l.pessoas])).toEqual([
      ["2026-09-03", 7],
      ["2026-09-04", 0],
      ["2026-09-05", 0],
    ]);
    expect(linhas.every((l) => l.dimensao === "total" && l.chave === "" && l.fonte === "vercel")).toBe(true);
  });

  it("com arquivo mais antigo, todo dia do intervalo ganha total, e o que nao veio sai marcado como deduzido", () => {
    const linhas = totaisDoIntervalo(dia3, cinco, "2026-08-01");
    expect(linhas).toHaveLength(5);
    expect(linhas.map((l) => [l.dia, l.soSeVazio === true])).toEqual([
      ["2026-09-01", true],
      ["2026-09-02", true],
      ["2026-09-03", false],
      ["2026-09-04", true],
      ["2026-09-05", true],
    ]);
    expect(totaisDoIntervalo([], cinco, "2026-09-04").map((l) => l.dia)).toEqual(["2026-09-04", "2026-09-05"]);
    // resposta vazia sobre arquivo antigo (dia fora da janela da Vercel): so zeros deduzidos
    expect(totaisDoIntervalo([], cinco, "2026-08-01").every((l) => l.soSeVazio)).toBe(true);
  });

  it("resposta vazia sem nada guardado nao inventa zero", () => {
    expect(totaisDoIntervalo([], cinco)).toEqual([]);
  });
});

describe("coletarVercel", () => {
  it("uma chamada de total e quatro dimensoes por dia, todas com o token", async () => {
    const { buscar, pedidos } = vercelFalsa();
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar });

    expect(pedidos).toHaveLength(1 + 3 * 4);
    const porBy = pedidos.map((p) => p.url.searchParams.get("by"));
    expect(porBy.filter((b) => b === "day")).toHaveLength(1);
    for (const by of ["requestPath", "referrerHostname", "country", "deviceType"]) {
      const doBy = pedidos.filter((p) => p.url.searchParams.get("by") === by);
      expect(doBy.map((p) => p.url.searchParams.get("since"))).toEqual([ms("2026-09-01"), ms("2026-09-02"), ms("2026-09-03")]);
      // um dia so por chamada: do inicio ao ultimo milissegundo do mesmo dia
      expect(
        doBy.every((p) => Number(p.url.searchParams.get("until")) - Number(p.url.searchParams.get("since")) === 86_399_999),
      ).toBe(true);
    }
    expect(pedidos.every((p) => (p.init.headers as Record<string, string>).Authorization === "Bearer token-de-teste")).toBe(
      true,
    );
    expect(pedidos.every((p) => p.init.signal instanceof AbortSignal)).toBe(true);

    expect(resultado.erro).toBeNull();
    expect(resultado.ate).toBe("2026-09-03");
    expect(resultado.linhas.filter((l) => l.dimensao === "total")).toHaveLength(3);
    expect(resultado.linhas.filter((l) => l.dimensao === "rota").map((l) => l.chave)).toEqual([
      "/home/f/texto",
      "/home/f/texto",
      "/home/f/texto",
    ]);
  });

  it("chave recusada (401) para a coleta em vez de repetir a recusa em toda chamada", async () => {
    const { buscar, pedidos } = vercelFalsa(() => json({ error: { code: "forbidden" } }, 401));
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar });
    expect(pedidos.length).toBeLessThan(13);
    expect(resultado.erro).toContain("401");
    expect(resultado.ate).toBeNull();
  });

  it("429 que libera logo e esperado uma vez so", async () => {
    const agora = 1_000_000;
    const esperar = vi.fn(async () => {});
    const { buscar } = vercelFalsa((_url, n) =>
      n === 1
        ? json({ error: { code: "rate_limited", message: "x", limit: { remaining: 0, resetMs: agora + 1500, total: 6 } } }, 429)
        : null,
    );
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar, agora: () => agora, esperar });
    expect(esperar).toHaveBeenCalledTimes(1);
    expect(esperar).toHaveBeenCalledWith(1500);
    expect(resultado.erro).toBeNull();
    expect(resultado.ate).toBe("2026-09-03");
  });

  it("429 que libera tarde nao prende a funcao esperando", async () => {
    const agora = 1_000_000;
    const esperar = vi.fn(async () => {});
    const { buscar } = vercelFalsa(() =>
      json({ error: { code: "rate_limited", limit: { remaining: 0, resetMs: agora + 60_000 } } }, 429),
    );
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar, agora: () => agora, esperar });
    expect(esperar).not.toHaveBeenCalled();
    expect(resultado.erro).toContain("429");
    expect(resultado.ate).toBeNull();
  });

  it("demora vira erro registrado, e o que chegou inteiro fica", async () => {
    const { buscar } = vercelFalsa((url) => {
      if (url.searchParams.get("by") === "country" && url.searchParams.get("since") === ms("2026-09-03")) {
        throw Object.assign(new Error("tempo"), { name: "TimeoutError" });
      }
      return null;
    });
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar });
    expect(resultado.erro).toBe("a Vercel demorou demais para responder");
    // o dia 3 ficou incompleto; os dois primeiros chegaram inteiros
    expect(resultado.ate).toBe("2026-09-02");
    expect(resultado.linhas.some((l) => l.dia === "2026-09-03" && l.dimensao === "rota")).toBe(true);
  });

  it("resposta fora do formato nao grava zero no lugar de visita", async () => {
    const { buscar } = vercelFalsa((url) => (url.searchParams.get("by") === "day" ? json({ resultado: [] }) : null));
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar });
    expect(resultado.erro).toContain("formato inesperado");
    expect(resultado.linhas.filter((l) => l.dimensao === "total")).toEqual([]);
    expect(resultado.ate).toBeNull();
  });

  it("com o prazo vencido nenhuma chamada comeca", async () => {
    const { buscar, pedidos } = vercelFalsa();
    const resultado = await coletarVercel(CFG, TRES_DIAS, { buscar, prazo: 10, agora: () => 20 });
    expect(pedidos).toHaveLength(0);
    expect(resultado.erro).toContain("tempo da função acabou");
    expect(resultado.ate).toBeNull();
  });
});
