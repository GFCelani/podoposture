/**
 * Tipos e regras puras da aba "Numeros".
 *
 * Nada aqui toca banco, rede ou variavel de ambiente. O arquivo e importado
 * pelo componente do painel, que roda no navegador, e pelas rotas do servidor;
 * tudo o que decide o que a tela diz (periodo valido, janela da coleta, nome
 * de origem, titulo de texto, frase de comparacao) mora aqui para ser testado
 * sem subir nada.
 *
 * Tambem por isso nao importa `posts.ts`: aquele modulo carrega o JSON dos 68
 * textos inteiros, e puxa-lo para ca enfiaria o blog todo no pacote do
 * navegador so para ler uma constante.
 */

/* ------------------------------------------------------------------ dados */

/** `vercel` sao as visitas; `busca` e o Google Search Console. */
export type Fonte = "vercel" | "busca";

export type Dimensao = "total" | "rota" | "origem" | "consulta" | "pais" | "aparelho";

/**
 * Uma linha do arquivo diario.
 *
 * `visitas` sao paginas abertas; `pessoas` sao visitantes distintos NAQUELE
 * dia. Somar `pessoas` de varios dias conta de novo quem voltou em outro dia —
 * a Vercel so entrega visitante distinto por intervalo consultado, e o arquivo
 * guarda dia a dia. A tela diz isso com todas as letras.
 */
export type LinhaDoDia = {
  fonte: Fonte;
  /** AAAA-MM-DD. Na Vercel o dia e UTC; no Google, horario do Pacifico. */
  dia: string;
  dimensao: Dimensao;
  /** Vazia no total. */
  chave: string;
  visitas: number;
  pessoas: number;
  cliques: number;
  aparicoes: number;
  /** Posicao media no Google; so existe na fonte `busca`. */
  posicao: number | null;
  /**
   * Zero deduzido, e nao medido: o dia nao veio na resposta da fonte. So entra
   * onde o arquivo ainda nao tem linha, e nunca por cima de um numero guardado
   * — fora da janela de retencao a Vercel tambem responde vazio, e o zero
   * apagaria justamente o que o arquivo existe para guardar.
   */
  soSeVazio?: boolean;
};

/**
 * `nao-configurada` e a fonte sem credencial: pulada e registrada, mas nao e
 * falha — o site pode viver sem ela, e a tela diz o que falta.
 */
export type SituacaoDaColeta = "ok" | "erro" | "nao-configurada";

/** O que cada coletor devolve. Falha vira `erro`, nunca excecao. */
export type ResultadoDaColeta = {
  linhas: LinhaDoDia[];
  /** Ultimo dia que chegou inteiro, ou null. */
  ate: string | null;
  erro: string | null;
};

export type Intervalo = { inicio: string; fim: string };

/* ---------------------------------------------------------------- periodo */

export const PERIODOS = [7, 30, 90, 365] as const;
export type Periodo = (typeof PERIODOS)[number];
export const PERIODO_PADRAO: Periodo = 30;

/**
 * Lista fechada. Sem parametro vale o padrao; qualquer outra coisa e recusada
 * em vez de arredondada, para um valor inventado nunca virar consulta.
 */
export function lerPeriodo(bruto: string | null): Periodo | null {
  if (bruto === null || bruto === "") return PERIODO_PADRAO;
  const achado = PERIODOS.find((p) => String(p) === bruto);
  return achado ?? null;
}

export function rotuloDoPeriodo(periodo: Periodo): string {
  if (periodo === 90) return "3 meses";
  if (periodo === 365) return "12 meses";
  return `${periodo} dias`;
}

/* ------------------------------------------------------------------ datas */

const DIA_MS = 86_400_000;
const FORMATO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data de calendario real no formato AAAA-MM-DD (rejeita 2026-02-30). */
export function diaValido(texto: string): boolean {
  const partes = FORMATO_DIA.exec(texto);
  if (!partes) return false;
  const data = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return data.toISOString().slice(0, 10) === texto;
}

export function diaUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  return diaUtc(new Date(Date.parse(`${dia}T00:00:00Z`) + dias * DIA_MS));
}

/** Dias do intervalo, inclusive nas duas pontas. */
export function diasDoIntervalo({ inicio, fim }: Intervalo): string[] {
  const dias: string[] = [];
  for (let dia = inicio; dia <= fim; dia = somarDias(dia, 1)) dias.push(dia);
  return dias;
}

function mesesAntes(dia: string, meses: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  return diaUtc(new Date(Date.UTC(ano, mes - 1 - meses, d)));
}

/* ------------------------------------------------------- janela da coleta */

/**
 * Toda noite a coleta refaz os ultimos 5 dias, e nao so ontem: o Google so
 * consolida o dia depois de 2 a 3 dias, e a Vercel recebe evento atrasado.
 * Como a gravacao e upsert, refazer corrige — uma noite perdida se conserta
 * sozinha na seguinte.
 */
export const DIAS_REPROCESSADOS = 5;

/**
 * Tamanho de um lote do historico. Quatorze dias da Vercel sao 57 chamadas;
 * um lote maior nao cabe com folga nos 60 segundos da funcao.
 */
export const LOTE_DO_HISTORICO = 14;

/** O Google guarda 16 meses; pedir antes disso so gasta cota. */
export const TETO_DO_HISTORICO_MESES = 16;

/**
 * A Vercel so abre os ultimos 31 dias no plano Hobby: pedir um dia anterior
 * volta 400 ("the hobby plan only grants access to the latest 31 days") e
 * derruba o lote inteiro, inclusive a parte que o Google teria respondido.
 *
 * A memoria longa e' daqui, nao de la: o que a coleta grava em `numeros_dia`
 * fica 3 anos (`numeros-db.ts`). Por isso a janela da Vercel e' recortada
 * antes da chamada, e um lote inteiramente anterior a ela sai sem a fonte, em
 * vez de sair com erro.
 */
export const TETO_DA_VERCEL_DIAS = 31;

export type JanelaDaColeta = {
  vercel: Intervalo | null;
  busca: Intervalo | null;
  /** Onde o proximo lote do historico comeca, ou null se acabou. */
  proximoDesde: string | null;
  historico: boolean;
  /** `desde` pedia mais do que o teto e foi trazido para ele. */
  ajustadoAoTeto: boolean;
  /** O pedido alcanca dias que a Vercel ja nao guarda; o arquivo e' que responde por eles. */
  alemDaMemoriaDaVercel: boolean;
};

/**
 * O que coletar agora. Sem `desde` e a coleta da noite; com `desde` e um lote
 * do historico, que responde onde o proximo comeca.
 *
 * Os dias sao UTC, a mesma regua dos dias da Vercel. O Google para em D-2
 * porque o dia mais recente dele ainda nao e final.
 */
export function janelaDaColeta(agora: Date, desde: string | null): JanelaDaColeta | { erro: string } {
  const hoje = diaUtc(agora);
  const ontem = somarDias(hoje, -1);
  const ultimoDaBusca = somarDias(hoje, -2);
  const primeiroDaNoite = somarDias(hoje, -DIAS_REPROCESSADOS);
  const primeiroDaVercel = somarDias(hoje, -(TETO_DA_VERCEL_DIAS - 1));

  if (desde === null) {
    // O recorte nao muda a noite (5 dias cabem em 31), mas a janela da Vercel
    // passa a valer num lugar so, inclusive se DIAS_REPROCESSADOS crescer.
    const inicioDaNoite = primeiroDaNoite < primeiroDaVercel ? primeiroDaVercel : primeiroDaNoite;
    return {
      vercel: { inicio: inicioDaNoite, fim: ontem },
      busca: { inicio: primeiroDaNoite, fim: ultimoDaBusca },
      proximoDesde: null,
      historico: false,
      ajustadoAoTeto: false,
      alemDaMemoriaDaVercel: false,
    };
  }

  if (!diaValido(desde)) return { erro: "Use ?desde=AAAA-MM-DD com uma data que exista." };
  if (desde > ontem) return { erro: "A data de início precisa ser anterior a hoje." };

  const teto = mesesAntes(hoje, TETO_DO_HISTORICO_MESES);
  const inicio = desde < teto ? teto : desde;
  const fimDoLote = somarDias(inicio, LOTE_DO_HISTORICO - 1);
  const fim = fimDoLote < ontem ? fimDoLote : ontem;
  const fimDaBusca = fim < ultimoDaBusca ? fim : ultimoDaBusca;
  const inicioDaVercel = inicio < primeiroDaVercel ? primeiroDaVercel : inicio;

  return {
    vercel: inicioDaVercel <= fim ? { inicio: inicioDaVercel, fim } : null,
    busca: inicio <= fimDaBusca ? { inicio, fim: fimDaBusca } : null,
    proximoDesde: fim < ontem ? somarDias(fim, 1) : null,
    historico: true,
    ajustadoAoTeto: desde < teto,
    alemDaMemoriaDaVercel: inicio < primeiroDaVercel,
  };
}

/* ------------------------------------------------------ poda por dimensao */

/** Linhas por dimensao por dia. Sem teto a tabela cresce sem limite. */
export const TETO_POR_DIMENSAO = 50;

function chaveDaLinha(l: LinhaDoDia): string {
  return `${l.fonte}\u0000${l.dia}\u0000${l.dimensao}\u0000${l.chave}`;
}

/**
 * Tira repeticao e corta a cauda de cada dimensao.
 *
 * A repeticao nao e so higiene: o Postgres recusa um `INSERT ... ON CONFLICT
 * DO UPDATE` que acerte a mesma linha duas vezes no mesmo comando, e a coleta
 * inteira cairia por causa de uma chave dobrada.
 */
export function limitarPorDia(linhas: LinhaDoDia[], teto = TETO_POR_DIMENSAO): LinhaDoDia[] {
  const unicas = new Map<string, LinhaDoDia>();
  for (const linha of linhas) unicas.set(chaveDaLinha(linha), linha);

  const grupos = new Map<string, LinhaDoDia[]>();
  const totais: LinhaDoDia[] = [];
  for (const linha of unicas.values()) {
    if (linha.dimensao === "total") {
      totais.push(linha);
      continue;
    }
    const grupo = `${linha.fonte}\u0000${linha.dia}\u0000${linha.dimensao}`;
    const lista = grupos.get(grupo) ?? [];
    lista.push(linha);
    grupos.set(grupo, lista);
  }

  const mantidas = [...totais];
  for (const lista of grupos.values()) {
    lista.sort(
      (a, b) =>
        b.pessoas - a.pessoas ||
        b.cliques - a.cliques ||
        b.aparicoes - a.aparicoes ||
        b.visitas - a.visitas ||
        a.chave.localeCompare(b.chave),
    );
    mantidas.push(...lista.slice(0, teto));
  }
  return mantidas;
}

/* ---------------------------------------------------------------- origens */

export type Contagem = { nome: string; visitas: number; pessoas: number };

const DIRETO = "Digitou o endereço";

/** Dominio igual ou subdominio dele. */
function eDe(host: string, dominio: string): boolean {
  return host === dominio || host.endsWith(`.${dominio}`);
}

const GRUPOS_DE_ORIGEM: readonly { nome: string; dominios: readonly string[] }[] = [
  // Antes do Google: gemini.google.com e assistente, nao busca.
  {
    nome: "Assistentes de IA (ChatGPT e parecidos)",
    dominios: ["chatgpt.com", "chat.openai.com", "perplexity.ai", "gemini.google.com", "copilot.microsoft.com", "claude.ai"],
  },
  { nome: "Instagram", dominios: ["instagram.com"] },
  { nome: "Facebook", dominios: ["facebook.com", "fb.com", "fb.me", "messenger.com"] },
  { nome: "WhatsApp", dominios: ["whatsapp.com", "wa.me"] },
  { nome: "YouTube", dominios: ["youtube.com", "youtu.be"] },
  { nome: "LinkedIn", dominios: ["linkedin.com", "lnkd.in"] },
  { nome: "Pinterest", dominios: ["pinterest.com", "pin.it"] },
  { nome: "TikTok", dominios: ["tiktok.com"] },
  { nome: "X (antigo Twitter)", dominios: ["x.com", "twitter.com", "t.co"] },
  { nome: "Outras buscas (Bing e parecidos)", dominios: ["bing.com", "duckduckgo.com", "yahoo.com", "ecosia.org", "search.brave.com", "yandex.com"] },
  { nome: "O próprio site", dominios: ["podoposture.com.br", "vercel.app"] },
];

/**
 * O site de origem em nome que a clinica reconhece.
 *
 * Sem referencia vira "Digitou o endereco" — e isso inclui quem abriu por um
 * link no WhatsApp do celular, que nao informa de onde veio. A tela explica.
 */
export function nomeDaOrigem(bruto: string | null | undefined): string {
  const host = (bruto ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/^(www|m)\./, "");
  if (!host) return DIRETO;

  // Busca do Google e so o dominio da busca (google.com, google.com.br) e o
  // aplicativo do Android; mail.google.com e docs.google.com nao sao busca.
  if (/^google(\.[a-z]{2,3}){1,2}$/.test(host) || host === "com.google.android.googlequicksearchbox") {
    return "Busca do Google";
  }
  for (const grupo of GRUPOS_DE_ORIGEM) {
    if (grupo.dominios.some((d) => eDe(host, d))) return grupo.nome;
  }
  return host;
}

export function agruparOrigens(linhas: readonly { chave: string; visitas: number; pessoas: number }[]): Contagem[] {
  const somas = new Map<string, Contagem>();
  for (const linha of linhas) {
    const nome = nomeDaOrigem(linha.chave);
    const atual = somas.get(nome) ?? { nome, visitas: 0, pessoas: 0 };
    atual.visitas += linha.visitas;
    atual.pessoas += linha.pessoas;
    somas.set(nome, atual);
  }
  return [...somas.values()].sort((a, b) => b.pessoas - a.pessoas || b.visitas - a.visitas);
}

/* ----------------------------------------------------------------- textos */

/**
 * Prefixo dos textos do blog. E o `PREFIXO_POST` de `posts.ts`, repetido aqui
 * pelo motivo do comentario do topo; o teste confere os dois.
 */
export const PREFIXO_DOS_TEXTOS = "/home/f/";

/**
 * O slug de um endereco de texto, ou null se o endereco nao e de texto.
 *
 * Aceita as tres formas em que o mesmo texto chega: com acento em
 * percent-encoding (o que o navegador manda), com acento cru, e a rota ASCII
 * para a qual o middleware reescreve. Do Google chega a URL inteira.
 */
export function slugDoEndereco(endereco: string): string | null {
  let caminho = endereco.trim();
  if (/^https?:\/\//i.test(caminho)) {
    try {
      caminho = new URL(caminho).pathname;
    } catch {
      return null;
    }
  }
  caminho = caminho.split(/[?#]/)[0];
  try {
    caminho = decodeURIComponent(caminho);
  } catch {
    // percent-encoding quebrado: segue com o texto cru, que simplesmente nao
    // vai casar com titulo nenhum
  }
  caminho = caminho.normalize("NFC").replace(/\/+$/, "");
  if (!caminho.startsWith(PREFIXO_DOS_TEXTOS)) return null;
  const slug = caminho.slice(PREFIXO_DOS_TEXTOS.length);
  return slug && !slug.includes("/") ? slug : null;
}

export type Catalogo = {
  /** slug real em NFC -> titulo */
  titulos: ReadonlyMap<string, string>;
  /** rota ASCII -> slug real (o `MAPA_ASCII_POSTS`) */
  asciiParaReal: ReadonlyMap<string, string>;
};

export function tituloDoTexto(endereco: string, catalogo: Catalogo): { slug: string; titulo: string } | null {
  const slug = slugDoEndereco(endereco);
  if (!slug) return null;
  const real = catalogo.titulos.has(slug) ? slug : catalogo.asciiParaReal.get(slug)?.normalize("NFC");
  const titulo = real ? catalogo.titulos.get(real) : undefined;
  return real && titulo ? { slug: real, titulo } : null;
}

export type TextoLido = { titulo: string; slug: string; visitas: number; pessoas: number; cliques: number };

/**
 * Os textos pelo titulo. As formas diferentes do mesmo endereco somam num so;
 * endereco que nao e de um texto que existe hoje fica de fora — a lista e dos
 * textos dela, nao de URL antiga que alguem ainda visita.
 */
export function textosPeloTitulo(
  linhas: readonly { chave: string; visitas: number; pessoas: number; cliques: number }[],
  catalogo: Catalogo,
  limite = 10,
): TextoLido[] {
  const somas = new Map<string, TextoLido>();
  for (const linha of linhas) {
    const texto = tituloDoTexto(linha.chave, catalogo);
    if (!texto) continue;
    const atual = somas.get(texto.slug) ?? { ...texto, visitas: 0, pessoas: 0, cliques: 0 };
    atual.visitas += linha.visitas;
    atual.pessoas += linha.pessoas;
    atual.cliques += linha.cliques;
    somas.set(texto.slug, atual);
  }
  return [...somas.values()]
    .sort((a, b) => b.pessoas - a.pessoas || b.cliques - a.cliques || b.visitas - a.visitas)
    .slice(0, limite);
}

/* ------------------------------------------------------- pais e aparelho */

export function nomeDoPais(codigo: string): string {
  const limpo = codigo.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(limpo)) return "Não identificado";
  try {
    return new Intl.DisplayNames(["pt-BR"], { type: "region" }).of(limpo) ?? limpo;
  } catch {
    return limpo;
  }
}

export function nomeDoAparelho(tipo: string): string {
  const limpo = tipo.trim().toLowerCase();
  if (limpo === "mobile") return "Celular";
  if (limpo === "desktop") return "Computador";
  if (limpo === "tablet") return "Tablet";
  return "Outro";
}

/* ------------------------------------------------------ resposta da rota */

export type Coleta = {
  em: string;
  ate: string | null;
  linhas: number;
  situacao: SituacaoDaColeta;
  erro: string | null;
};

export type EstadoDaFonte = {
  configurada: boolean;
  ultima: Coleta | null;
  ultimaComSucesso: Coleta | null;
  primeiroDia: string | null;
  ultimoDia: string | null;
};

export type Consulta = { consulta: string; cliques: number; aparicoes: number; posicao: number | null };

export type Mes = { mes: string; cliques: number; aparicoes: number };

export type Visitas = {
  /** Intervalo efetivo: comeca no primeiro dia guardado, se ele for mais novo. */
  intervalo: Intervalo;
  pessoas: number;
  visitas: number;
  /** null quando o periodo anterior nao esta inteiro no arquivo. */
  anterior: { pessoas: number; visitas: number } | null;
  porDia: { dia: string; pessoas: number }[];
  textos: TextoLido[];
  origens: Contagem[];
  paises: Contagem[];
  aparelhos: Contagem[];
};

export type Buscas = {
  intervalo: Intervalo;
  cliques: number;
  aparicoes: number;
  posicao: number | null;
  anterior: { cliques: number; aparicoes: number } | null;
  consultas: Consulta[];
  textos: TextoLido[];
  /** Cliques por mes, ate 16 meses, para o antes e depois da mudanca. */
  meses: Mes[];
};

export type RespostaDosNumeros =
  | { semBanco: true; fontes: Record<Fonte, { configurada: boolean }> }
  | {
      semBanco: false;
      periodo: Periodo;
      /** Mes da mudanca do site (AAAA-MM), ou null se ainda nao foi marcada. */
      migracao: string | null;
      fontes: Record<Fonte, EstadoDaFonte>;
      visitas: Visitas | null;
      buscas: Buscas | null;
    };

/**
 * Intervalo do periodo terminando no ultimo dia guardado, e o anterior de
 * mesmo tamanho.
 *
 * Termina no ultimo dia guardado, e nao em "hoje": se a coleta parou ha uma
 * semana, uma janela ate hoje mostraria uma queda que nao aconteceu. A linha
 * de frescor e que avisa que o dado e velho.
 */
export function intervalosDoPeriodo(
  periodo: Periodo,
  primeiroDia: string,
  ultimoDia: string,
): { atual: Intervalo; anterior: Intervalo | null } {
  const inicioCheio = somarDias(ultimoDia, -(periodo - 1));
  const fimAnterior = somarDias(inicioCheio, -1);
  const inicioAnterior = somarDias(fimAnterior, -(periodo - 1));
  return {
    atual: { inicio: inicioCheio < primeiroDia ? primeiroDia : inicioCheio, fim: ultimoDia },
    anterior: primeiroDia <= inicioAnterior ? { inicio: inicioAnterior, fim: fimAnterior } : null,
  };
}

/* ------------------------------------------------- antes e depois, por mes */

export type MesContinuo = { mes: string; cliques: number | null };

/**
 * Os meses do primeiro ao ultimo, sem pular nenhum. Mes sem linha guardada
 * vira null, e nao zero: e coleta que nao houve, e desenhar zero ali faria a
 * mudanca do site parecer ter derrubado o trafego.
 */
export function mesesSemBuraco(meses: readonly Mes[]): MesContinuo[] {
  if (meses.length === 0) return [];
  const porMes = new Map(meses.map((m) => [m.mes, m.cliques]));
  const ultimo = meses[meses.length - 1].mes;
  let [ano, mes] = meses[0].mes.split("-").map(Number);
  const lista: MesContinuo[] = [];
  // Teto de 20 anos: um mes malformado nunca prende o laco.
  for (let volta = 0; volta < 240; volta += 1) {
    const chave = `${ano}-${String(mes).padStart(2, "0")}`;
    lista.push({ mes: chave, cliques: porMes.get(chave) ?? null });
    if (chave >= ultimo) break;
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return lista;
}

export type Media = { media: number; meses: number };

/**
 * Media de cliques por mes nos meses antes e depois da mudanca.
 *
 * O mes da mudanca fica de fora dos dois lados (e metade de cada), e tambem
 * os meses pela metade nas pontas do arquivo — o primeiro, se a coleta
 * comecou no meio dele, e o ultimo, que ainda esta correndo. Mes incompleto
 * comparado com mes cheio e queda que nao existe.
 */
export function mediasAntesEDepois(
  meses: readonly MesContinuo[],
  migracao: string,
  primeiroDia: string,
  ultimoDia: string,
  quantos = 3,
): { antes: Media | null; depois: Media | null } {
  const primeiroIncompleto = primeiroDia.slice(8) !== "01" ? primeiroDia.slice(0, 7) : null;
  const ultimoIncompleto = somarDias(ultimoDia, 1).slice(8) !== "01" ? ultimoDia.slice(0, 7) : null;
  const cheios = meses.filter(
    (m): m is { mes: string; cliques: number } =>
      m.cliques !== null && m.mes !== primeiroIncompleto && m.mes !== ultimoIncompleto,
  );
  const media = (lista: { cliques: number }[]): Media | null =>
    lista.length === 0
      ? null
      : { media: Math.round(lista.reduce((s, m) => s + m.cliques, 0) / lista.length), meses: lista.length };
  return {
    antes: media(cheios.filter((m) => m.mes < migracao).slice(-quantos)),
    depois: media(cheios.filter((m) => m.mes > migracao).slice(0, quantos)),
  };
}

/* ----------------------------------------------------------------- frases */

const NUMERO = new Intl.NumberFormat("pt-BR");

export function formatarNumero(n: number): string {
  return NUMERO.format(n);
}

/** "1 pessoa", "1.204 pessoas". */
export function contar(n: number, [singular, plural]: readonly [string, string]): string {
  return `${formatarNumero(n)} ${n === 1 ? singular : plural}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "9 de setembro"; com o ano quando nao e o de referencia. */
export function dataPorExtenso(dia: string, anoDeReferencia?: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const base = `${d} de ${MESES[mes - 1]}`;
  return anoDeReferencia === undefined || anoDeReferencia === ano ? base : `${base} de ${ano}`;
}

/** "9 set." — rotulo curto do eixo diario. */
export function diaCurto(dia: string): string {
  const [, mes, d] = dia.split("-").map(Number);
  return `${d} ${MESES[mes - 1].slice(0, 3)}.`;
}

/** "set. 26" — rotulo curto do eixo. */
export function mesCurto(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[m - 1].slice(0, 3)}. ${String(ano).slice(2)}`;
}

export function mesPorExtenso(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${ano}`;
}

const PARTES_EM_SAO_PAULO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function emSaoPaulo(instante: Date): { dia: string; hora: number; minuto: number } {
  const partes = Object.fromEntries(
    PARTES_EM_SAO_PAULO.formatToParts(instante).map((p) => [p.type, p.value]),
  );
  return {
    dia: `${partes.year}-${partes.month}-${partes.day}`,
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
  };
}

/**
 * "hoje às 6h", "ontem às 6h05", "em 3 de setembro às 6h".
 *
 * Sempre no horario de Brasilia, onde a clinica esta — o servidor e o
 * agendador contam em UTC, e "atualizado as 9h" leria como erro.
 */
export function quandoFoi(emISO: string, agora: Date): string {
  const quando = emSaoPaulo(new Date(emISO));
  const hoje = emSaoPaulo(agora);
  const hora = `${quando.hora}h${quando.minuto ? String(quando.minuto).padStart(2, "0") : ""}`;
  if (quando.dia === hoje.dia) return `hoje às ${hora}`;
  if (quando.dia === somarDias(hoje.dia, -1)) return `ontem às ${hora}`;
  return `em ${dataPorExtenso(quando.dia, Number(hoje.dia.slice(0, 4)))} às ${hora}`;
}

/** A diferenca contra o periodo anterior, em palavras. */
export function comparacaoEmPalavras(
  atual: number,
  anterior: number,
  periodo: Periodo,
  unidade: readonly [singular: string, plural: string],
): string {
  const rotulo = rotuloDoPeriodo(periodo);
  if (anterior === 0) {
    return atual === 0
      ? `Nenhum registro, nem agora nem nos ${rotulo} anteriores.`
      : `Nos ${rotulo} anteriores não houve nenhum registro.`;
  }
  const diferenca = atual - anterior;
  const porcento = Math.round((Math.abs(diferenca) / anterior) * 100);
  if (porcento < 3) {
    return `Praticamente o mesmo que nos ${rotulo} anteriores (${formatarNumero(anterior)}).`;
  }
  const quanto = contar(Math.abs(diferenca), unidade);
  return diferenca > 0
    ? `${quanto} a mais que nos ${rotulo} anteriores — ${porcento}% acima.`
    : `${quanto} a menos que nos ${rotulo} anteriores — ${porcento}% abaixo.`;
}
