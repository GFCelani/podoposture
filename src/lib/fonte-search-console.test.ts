import { createVerify, generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` lanca fora do empacotador do Next; nos testes ele nao guarda nada.
vi.mock("server-only", () => ({}));

import {
  coletarBusca,
  configDaBusca,
  ENDERECO_DO_TOKEN,
  enderecoDaConsultaDaBusca,
  esquecerToken,
  lerContaDeServico,
  lerLinhasDaBusca,
  montarJwt,
} from "./fonte-search-console";

/** Par de chaves de verdade, gerado aqui: a assinatura e conferida com a publica. */
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const EMAIL = "coletor@projeto-teste.iam.gserviceaccount.com";
const SITE = "sc-domain:podoposture.com.br";
const CONTA = JSON.stringify({ type: "service_account", client_email: EMAIL, private_key: privateKey });
/** Como o JSON costuma chegar colado numa variavel de ambiente: `\n` escapado de novo. */
const CONTA_ESCAPADA = CONTA.replace(/\\n/g, "\\\\n");
const INTERVALO = { inicio: "2026-09-01", fim: "2026-09-02" };

function decodificar(parte: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));
}

function assinaturaConfere(jwt: string): boolean {
  const [cabecalho, corpo, assinatura] = jwt.split(".");
  return createVerify("RSA-SHA256").update(`${cabecalho}.${corpo}`).verify(publicKey, Buffer.from(assinatura, "base64url"));
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

type Pedido = { url: string; init: RequestInit; corpo: Record<string, unknown> | URLSearchParams };

/** Um Google falso: token no endpoint de token, linhas no formato da documentacao. */
function googleFalso(responder?: (pedido: Pedido) => Response | null) {
  const pedidos: Pedido[] = [];
  const buscar = (async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = String(entrada);
    const bruto = String(init?.body ?? "");
    const corpo = url === ENDERECO_DO_TOKEN ? new URLSearchParams(bruto) : JSON.parse(bruto);
    const pedido = { url, init: init ?? {}, corpo };
    pedidos.push(pedido);
    const especial = responder?.(pedido);
    if (especial) return especial;
    if (url === ENDERECO_DO_TOKEN) {
      return json({ access_token: "token-de-acesso", scope: "x", token_type: "Bearer", expires_in: 3600 });
    }
    const dimensoes = (corpo as { dimensions: string[] }).dimensions;
    if (dimensoes.length === 1) {
      return json({
        rows: [
          { keys: ["2026-09-01"], clicks: 5, impressions: 50, ctr: 0.1, position: 7 },
          { keys: ["2026-09-02"], clicks: 3, impressions: 40, ctr: 0.075, position: 9 },
        ],
        responseAggregationType: "byProperty",
      });
    }
    return json({
      rows: [{ keys: ["2026-09-01", dimensoes[1] === "page" ? "https://podoposture.com.br/" : "podoposture"], clicks: 2, impressions: 20, ctr: 0.1, position: 3 }],
    });
  }) as typeof fetch;
  const consultas = () => pedidos.filter((p) => p.url !== ENDERECO_DO_TOKEN);
  const trocas = () => pedidos.filter((p) => p.url === ENDERECO_DO_TOKEN);
  return { buscar, pedidos, consultas, trocas };
}

beforeEach(() => {
  esquecerToken();
});

describe("conta de servico", () => {
  it("le o JSON como o Google entrega e tambem com a quebra de linha escapada", () => {
    for (const bruto of [CONTA, CONTA_ESCAPADA]) {
      const conta = lerContaDeServico(bruto);
      expect(conta?.email).toBe(EMAIL);
      expect(conta?.chave).toBe(privateKey);
    }
  });

  it("recusa o que nao e conta de servico", () => {
    expect(lerContaDeServico("nao e json")).toBeNull();
    expect(lerContaDeServico(JSON.stringify({ private_key: privateKey }))).toBeNull();
    expect(lerContaDeServico(JSON.stringify({ client_email: EMAIL, private_key: "abc" }))).toBeNull();
  });

  it("config so confere presenca das duas variaveis", () => {
    expect(configDaBusca({ GSC_SERVICE_ACCOUNT: CONTA, GSC_SITE_URL: ` ${SITE} ` } as unknown as NodeJS.ProcessEnv)).toEqual({
      contaBruta: CONTA,
      site: SITE,
    });
    expect(configDaBusca({ GSC_SERVICE_ACCOUNT: CONTA } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});

describe("montarJwt", () => {
  const conta = lerContaDeServico(CONTA)!;
  const IAT = 1_788_000_000;

  it("RS256 com as claims da conta de servico, sem sub, valendo uma hora", () => {
    const jwt = montarJwt(conta, IAT);
    const [cabecalho, corpo] = jwt.split(".");
    expect(decodificar(cabecalho)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodificar(corpo)).toEqual({
      iss: EMAIL,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: IAT,
      exp: IAT + 3600,
    });
    expect(jwt).not.toMatch(/[+/=]/);
  });

  it("a assinatura confere com a chave publica, e deixa de conferir se o corpo muda", () => {
    const jwt = montarJwt(conta, IAT);
    expect(assinaturaConfere(jwt)).toBe(true);
    const [cabecalho, , assinatura] = jwt.split(".");
    const outroCorpo = Buffer.from(JSON.stringify({ iss: "outra@x.com" })).toString("base64url");
    expect(assinaturaConfere(`${cabecalho}.${outroCorpo}.${assinatura}`)).toBe(false);
  });
});

describe("enderecoDaConsultaDaBusca", () => {
  it("codifica a propriedade inteira no caminho", () => {
    expect(enderecoDaConsultaDaBusca(SITE)).toBe(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Apodoposture.com.br/searchAnalytics/query",
    );
    expect(enderecoDaConsultaDaBusca("https://podoposture.com.br/")).toBe(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fpodoposture.com.br%2F/searchAnalytics/query",
    );
  });
});

describe("lerLinhasDaBusca", () => {
  it("le o exemplo da documentacao e guarda a pagina como caminho", () => {
    const resposta = {
      rows: [{ keys: ["2026-09-01", "https://podoposture.com.br/"], clicks: 12, impressions: 340, ctr: 0.035, position: 8.2 }],
      responseAggregationType: "byPage",
    };
    expect(lerLinhasDaBusca(resposta, "rota")).toEqual([
      { fonte: "busca", dia: "2026-09-01", dimensao: "rota", chave: "/", visitas: 0, pessoas: 0, cliques: 12, aparicoes: 340, posicao: 8.2 },
    ]);
  });

  it("http, https e www da mesma pagina somam, com posicao ponderada pelas aparicoes", () => {
    const resposta = {
      rows: [
        { keys: ["2026-09-01", "http://podoposture.com.br/home/f/x"], clicks: 1, impressions: 100, position: 10 },
        { keys: ["2026-09-01", "https://www.podoposture.com.br/home/f/x"], clicks: 3, impressions: 300, position: 2 },
      ],
    };
    const [linha, ...resto] = lerLinhasDaBusca(resposta, "rota")!;
    expect(resto).toEqual([]);
    expect(linha).toMatchObject({ chave: "/home/f/x", cliques: 4, aparicoes: 400, posicao: 4 });
  });

  it("sem rows e dia sem dado; forma estranha e null", () => {
    expect(lerLinhasDaBusca({ responseAggregationType: "byProperty" }, "total")).toEqual([]);
    expect(lerLinhasDaBusca({ rows: "x" }, "total")).toBeNull();
    expect(lerLinhasDaBusca(null, "total")).toBeNull();
    expect(lerLinhasDaBusca({ rows: [{ keys: ["ontem"], clicks: 1 }] }, "total")).toEqual([]);
  });
});

describe("coletarBusca", () => {
  it("troca o JWT por token e faz tres consultas separadas, finais, com 25 mil linhas por pagina", async () => {
    const google = googleFalso();
    const resultado = await coletarBusca({ contaBruta: CONTA_ESCAPADA, site: SITE }, INTERVALO, { buscar: google.buscar });

    const [troca] = google.trocas();
    expect(google.trocas()).toHaveLength(1);
    expect(troca.init.method).toBe("POST");
    expect((troca.init.headers as Record<string, string>)["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const formulario = troca.corpo as URLSearchParams;
    expect(formulario.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(assinaturaConfere(formulario.get("assertion")!)).toBe(true);

    const consultas = google.consultas();
    expect(consultas.map((c) => (c.corpo as { dimensions: string[] }).dimensions)).toEqual([
      ["date"],
      ["date", "query"],
      ["date", "page"],
    ]);
    for (const c of consultas) {
      expect(c.url).toBe(enderecoDaConsultaDaBusca(SITE));
      expect(c.init.method).toBe("POST");
      expect((c.init.headers as Record<string, string>).Authorization).toBe("Bearer token-de-acesso");
      expect(c.corpo).toMatchObject({
        startDate: "2026-09-01",
        endDate: "2026-09-02",
        rowLimit: 25_000,
        startRow: 0,
        dataState: "final",
      });
    }

    expect(resultado.erro).toBeNull();
    expect(resultado.ate).toBe("2026-09-02");
    expect(resultado.linhas.map((l) => [l.dimensao, l.chave])).toEqual([
      ["total", ""],
      ["total", ""],
      ["consulta", "podoposture"],
      ["rota", "/"],
    ]);
  });

  it("pagina por startRow quando a pagina vem cheia", async () => {
    const cheia = Array.from({ length: 25_000 }, (_, i) => ({ keys: ["2026-09-01", `busca ${i}`], clicks: 1, impressions: 1, position: 1 }));
    const google = googleFalso((p) => {
      const corpo = p.corpo as { dimensions?: string[]; startRow?: number };
      if (corpo.dimensions?.[1] !== "query") return null;
      return json({ rows: corpo.startRow === 0 ? cheia : [{ keys: ["2026-09-01", "ultima"], clicks: 1, impressions: 1 }] });
    });
    const resultado = await coletarBusca({ contaBruta: CONTA, site: SITE }, INTERVALO, { buscar: google.buscar });
    const deTermos = google.consultas().filter((c) => (c.corpo as { dimensions: string[] }).dimensions[1] === "query");
    expect(deTermos.map((c) => (c.corpo as { startRow: number }).startRow)).toEqual([0, 25_000]);
    expect(resultado.linhas.filter((l) => l.dimensao === "consulta")).toHaveLength(25_001);
  });

  it("guarda o token em memoria ate perto de vencer", async () => {
    let agora = 1_000_000;
    const google = googleFalso();
    const cfg = { contaBruta: CONTA, site: SITE };
    await coletarBusca(cfg, INTERVALO, { buscar: google.buscar, agora: () => agora });
    agora += 30 * 60_000;
    await coletarBusca(cfg, INTERVALO, { buscar: google.buscar, agora: () => agora });
    expect(google.trocas()).toHaveLength(1);
    // a menos de um minuto de vencer, troca de novo
    agora += 29.5 * 60_000;
    await coletarBusca(cfg, INTERVALO, { buscar: google.buscar, agora: () => agora });
    expect(google.trocas()).toHaveLength(2);
  });

  it("403 na consulta (propriedade errada ou sem permissao) para e registra", async () => {
    const google = googleFalso((p) => (p.url === ENDERECO_DO_TOKEN ? null : json({ error: { code: 403 } }, 403)));
    const resultado = await coletarBusca({ contaBruta: CONTA, site: SITE }, INTERVALO, { buscar: google.buscar });
    expect(google.consultas()).toHaveLength(1);
    expect(resultado.erro).toBe("o Google respondeu 403 ao pedir total");
    expect(resultado.ate).toBeNull();
  });

  it("conta recusada no token nao chega a consultar", async () => {
    const google = googleFalso((p) => (p.url === ENDERECO_DO_TOKEN ? json({ error: "invalid_grant" }, 400) : null));
    const resultado = await coletarBusca({ contaBruta: CONTA, site: SITE }, INTERVALO, { buscar: google.buscar });
    expect(google.consultas()).toHaveLength(0);
    expect(resultado.erro).toBe("o Google recusou a conta de serviço (400)");
  });

  it("variavel que nao e conta de servico vira erro sem rede", async () => {
    const google = googleFalso();
    const resultado = await coletarBusca({ contaBruta: "{}", site: SITE }, INTERVALO, { buscar: google.buscar });
    expect(google.pedidos).toHaveLength(0);
    expect(resultado).toEqual({ linhas: [], ate: null, erro: "GSC_SERVICE_ACCOUNT não é o JSON de uma conta de serviço" });
  });
});
