import "server-only";

import { createSign } from "node:crypto";

import {
  diaValido,
  type Dimensao,
  type Intervalo,
  type LinhaDoDia,
  type ResultadoDaColeta,
} from "./numeros-tipos";

/**
 * Leitura das buscas no Google Search Console.
 *
 * Sem `googleapis`: a biblioteca oficial sao dezenas de megabytes numa funcao
 * serverless para fazer tres coisas — assinar um JWT, trocar por token e
 * mandar um POST. As tres cabem aqui com `node:crypto`.
 *
 * Como na Vercel, so a rota de cron chega a este modulo, e o endereco e o corpo
 * das consultas sao montados no codigo, sem nada vindo de requisicao.
 */

const ESCOPO = "https://www.googleapis.com/auth/webmasters.readonly";
export const ENDERECO_DO_TOKEN = "https://oauth2.googleapis.com/token";
const LINHAS_POR_PAGINA = 25_000;
/** Teto de paginas por consulta; 200 mil linhas e muito mais do que o site gera. */
const MAX_PAGINAS = 8;
const TEMPO_POR_CHAMADA_MS = 15_000;
/** Renova o token um minuto antes de vencer, para ele nao expirar no meio da coleta. */
const FOLGA_DO_TOKEN_MS = 60_000;

export type ContaDeServico = { email: string; chave: string };

/** Presenca das variaveis. O conteudo so e lido na coleta, onde erro vira registro. */
export type ConfigDaBusca = { contaBruta: string; site: string };

export function configDaBusca(env: NodeJS.ProcessEnv = process.env): ConfigDaBusca | null {
  const contaBruta = env.GSC_SERVICE_ACCOUNT?.trim();
  const site = env.GSC_SITE_URL?.trim();
  if (!contaBruta || !site) return null;
  return { contaBruta, site: propriedadeDoSite(site) };
}

const DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/**
 * A propriedade no formato que a API do Search Console espera.
 *
 * Quem configura cola o que tiver a mao, e a API so reconhece duas formas:
 * `sc-domain:dominio` (propriedade de dominio) ou a URL com barra final
 * (propriedade de prefixo). Um endereco sem a barra, ou so o dominio, dava 403
 * ou 404 na coleta e parecia falta de permissao.
 * - `sc-domain:...` fica, com o dominio em minuscula;
 * - `https://podoposture.com.br` vira `https://podoposture.com.br/`;
 * - `podoposture.com.br` vira `sc-domain:podoposture.com.br`.
 * O que nao for nenhum dos tres segue como veio, e a coleta registra a recusa.
 */
export function propriedadeDoSite(bruto: string): string {
  const valor = bruto.trim();
  if (/^sc-domain:/i.test(valor)) return `sc-domain:${valor.slice("sc-domain:".length).trim().toLowerCase()}`;
  if (/^https?:\/\//i.test(valor)) {
    try {
      const url = new URL(valor);
      const caminho = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
      return `${url.protocol}//${url.host}${caminho}`;
    } catch {
      return valor;
    }
  }
  const dominio = valor.toLowerCase().replace(/\/+$/, "");
  return DOMINIO.test(dominio) ? `sc-domain:${dominio}` : valor;
}

/**
 * O JSON da conta de servico, como o Google entrega.
 *
 * A chave privada costuma chegar com os `\n` escapados quando o JSON e colado
 * numa variavel de ambiente; sem desfazer isso, a assinatura falha com um erro
 * de formato de chave que nao diz nada.
 */
export function lerContaDeServico(bruto: string): ContaDeServico | null {
  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    return null;
  }
  const { client_email: email, private_key: chave } = (json ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || !email.includes("@") || typeof chave !== "string") return null;
  const normalizada = chave.replace(/\\n/g, "\n");
  return normalizada.includes("PRIVATE KEY") ? { email, chave: normalizada } : null;
}

function base64url(texto: string): string {
  return Buffer.from(texto).toString("base64url");
}

/**
 * JWT de conta de servico, RS256.
 *
 * Sem `sub`: a conta de servico entra na propriedade como usuaria propria, e
 * nao se passando por alguem do dominio. `exp` no maximo uma hora depois de
 * `iat`, que e o teto do Google.
 */
export function montarJwt(conta: ContaDeServico, agoraEmSegundos: number): string {
  const cabecalho = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = base64url(
    JSON.stringify({
      iss: conta.email,
      scope: ESCOPO,
      aud: ENDERECO_DO_TOKEN,
      iat: agoraEmSegundos,
      exp: agoraEmSegundos + 3600,
    }),
  );
  const assinatura = createSign("RSA-SHA256").update(`${cabecalho}.${corpo}`).sign(conta.chave);
  return `${cabecalho}.${corpo}.${assinatura.toString("base64url")}`;
}

/**
 * Token guardado em memoria do modulo ate vencer.
 *
 * Numa instancia que fica quente entre dois lotes do historico, isso poupa
 * uma troca por lote. Em instancia nova ele simplesmente nao existe.
 */
let tokenGuardado: { email: string; valor: string; venceEm: number } | null = null;

/** So para teste: comecar sem token guardado. */
export function esquecerToken(): void {
  tokenGuardado = null;
}

class FalhaDaBusca extends Error {
  constructor(mensagem: string, readonly definitiva: boolean) {
    super(mensagem);
  }
}

async function chamar(buscar: typeof fetch, endereco: string, init: RequestInit): Promise<Response> {
  try {
    return await buscar(endereco, { ...init, signal: AbortSignal.timeout(TEMPO_POR_CHAMADA_MS), cache: "no-store" });
  } catch (erro) {
    throw new FalhaDaBusca(
      (erro as Error)?.name === "TimeoutError" ? "o Google demorou demais para responder" : "sem conexão com o Google",
      false,
    );
  }
}

async function tokenDeAcesso(conta: ContaDeServico, buscar: typeof fetch, agora: () => number): Promise<string> {
  if (tokenGuardado && tokenGuardado.email === conta.email && tokenGuardado.venceEm - FOLGA_DO_TOKEN_MS > agora()) {
    return tokenGuardado.valor;
  }

  let assercao: string;
  try {
    assercao = montarJwt(conta, Math.floor(agora() / 1000));
  } catch {
    throw new FalhaDaBusca("a chave privada da conta de serviço não pôde assinar (formato inválido)", true);
  }

  const resposta = await chamar(buscar, ENDERECO_DO_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assercao,
    }).toString(),
  });
  if (!resposta.ok) {
    throw new FalhaDaBusca(`o Google recusou a conta de serviço (${resposta.status})`, true);
  }
  const corpo = (await resposta.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null;
  if (typeof corpo?.access_token !== "string") {
    throw new FalhaDaBusca("o Google não devolveu token de acesso", true);
  }
  const segundos = typeof corpo.expires_in === "number" ? corpo.expires_in : 3600;
  tokenGuardado = { email: conta.email, valor: corpo.access_token, venceEm: agora() + segundos * 1000 };
  return corpo.access_token;
}

export function enderecoDaConsultaDaBusca(site: string): string {
  return `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
}

type DimensaoDaBusca = Extract<Dimensao, "total" | "consulta" | "rota">;

const DIMENSOES_DO_GOOGLE: Record<DimensaoDaBusca, string[]> = {
  total: ["date"],
  consulta: ["date", "query"],
  rota: ["date", "page"],
};

function caminhoDaPagina(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Le `rows[]` da resposta. Sem `rows` e resultado vazio (o Google omite a
 * chave quando nao ha dado); forma diferente disso e null.
 *
 * Paginas viram caminho: a propriedade de dominio devolve a mesma pagina com
 * `http`, `https` e `www` como linhas separadas, e elas se somam aqui — com a
 * posicao media ponderada pelas aparicoes, que e como o Google a calcula.
 */
export function lerLinhasDaBusca(json: unknown, dimensao: DimensaoDaBusca): LinhaDoDia[] | null {
  if (typeof json !== "object" || json === null) return null;
  const linhas = (json as { rows?: unknown }).rows;
  if (linhas === undefined) return [];
  if (!Array.isArray(linhas)) return null;

  const somas = new Map<string, LinhaDoDia & { pesoDaPosicao: number }>();
  for (const bruto of linhas) {
    const item = bruto as { keys?: unknown; clicks?: unknown; impressions?: unknown; position?: unknown };
    if (!Array.isArray(item?.keys) || typeof item.keys[0] !== "string" || !diaValido(item.keys[0])) continue;
    const dia = item.keys[0];
    let chave = "";
    if (dimensao !== "total") {
      if (typeof item.keys[1] !== "string") continue;
      chave = dimensao === "rota" ? caminhoDaPagina(item.keys[1]) : item.keys[1];
    }
    const cliques = typeof item.clicks === "number" && item.clicks > 0 ? Math.round(item.clicks) : 0;
    const aparicoes = typeof item.impressions === "number" && item.impressions > 0 ? Math.round(item.impressions) : 0;
    const posicao = typeof item.position === "number" && Number.isFinite(item.position) ? item.position : null;

    const id = `${dia} ${chave}`;
    const atual = somas.get(id) ?? {
      fonte: "busca" as const,
      dia,
      dimensao,
      chave,
      visitas: 0,
      pessoas: 0,
      cliques: 0,
      aparicoes: 0,
      posicao: null,
      pesoDaPosicao: 0,
    };
    atual.cliques += cliques;
    atual.aparicoes += aparicoes;
    if (posicao !== null && aparicoes > 0) atual.pesoDaPosicao += posicao * aparicoes;
    somas.set(id, atual);
  }

  return [...somas.values()].map(({ pesoDaPosicao, ...linha }) => ({
    ...linha,
    posicao: linha.aparicoes > 0 && pesoDaPosicao > 0 ? Math.round((pesoDaPosicao / linha.aparicoes) * 100) / 100 : null,
  }));
}

export type OpcoesDaBusca = {
  buscar?: typeof fetch;
  prazo?: number;
  agora?: () => number;
};

/**
 * Tres consultas separadas — por dia, por dia e termo, por dia e pagina — e
 * nunca termo e pagina juntos, que e a combinacao mais cara na cota do Google.
 * `dataState: final` porque dado parcial gravado hoje seria reescrito amanha
 * com outro valor, e a tela mostraria numero que muda sozinho.
 */
export async function coletarBusca(
  cfg: ConfigDaBusca,
  intervalo: Intervalo,
  opcoes: OpcoesDaBusca = {},
): Promise<ResultadoDaColeta> {
  const buscar = opcoes.buscar ?? fetch;
  const agora = opcoes.agora ?? Date.now;
  const prazo = opcoes.prazo ?? Number.POSITIVE_INFINITY;

  const conta = lerContaDeServico(cfg.contaBruta);
  if (!conta) {
    return { linhas: [], ate: null, erro: "GSC_SERVICE_ACCOUNT não é o JSON de uma conta de serviço" };
  }

  const linhas: LinhaDoDia[] = [];
  const erros: string[] = [];
  let totalChegou = false;

  for (const dimensao of Object.keys(DIMENSOES_DO_GOOGLE) as DimensaoDaBusca[]) {
    try {
      for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
        if (agora() >= prazo) throw new FalhaDaBusca("o tempo da função acabou antes do fim da coleta", true);
        const token = await tokenDeAcesso(conta, buscar, agora);
        const resposta = await chamar(buscar, enderecoDaConsultaDaBusca(cfg.site), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: intervalo.inicio,
            endDate: intervalo.fim,
            dimensions: DIMENSOES_DO_GOOGLE[dimensao],
            type: "web",
            rowLimit: LINHAS_POR_PAGINA,
            startRow: pagina * LINHAS_POR_PAGINA,
            dataState: "final",
          }),
        });
        if (!resposta.ok) {
          // 403 aqui quase sempre e endereco de propriedade errado ou conta de
          // servico sem permissao na propriedade.
          throw new FalhaDaBusca(
            `o Google respondeu ${resposta.status} ao pedir ${dimensao}`,
            [400, 401, 403, 404].includes(resposta.status),
          );
        }
        const json = await resposta.json().catch(() => null);
        const lidas = lerLinhasDaBusca(json, dimensao);
        if (!lidas) throw new FalhaDaBusca(`resposta do Google em formato inesperado em ${dimensao}`, false);
        linhas.push(...lidas);
        const recebidas = Array.isArray((json as { rows?: unknown[] })?.rows) ? (json as { rows: unknown[] }).rows.length : 0;
        if (recebidas < LINHAS_POR_PAGINA) break;
      }
      if (dimensao === "total") totalChegou = true;
    } catch (erro) {
      const falha = erro instanceof FalhaDaBusca ? erro : new FalhaDaBusca("falha inesperada", false);
      erros.push(falha.message);
      if (falha.definitiva) break;
    }
  }

  const dias = linhas.filter((l) => l.dimensao === "total").map((l) => l.dia).sort();
  return {
    linhas,
    ate: totalChegou && erros.length === 0 ? (dias.at(-1) ?? null) : null,
    erro: erros.length ? erros[0] : null,
  };
}
