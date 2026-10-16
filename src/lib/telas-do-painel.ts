/**
 * A tela de quem entra no painel: janela, tela, densidade e zoom.
 *
 * Para saber o tamanho real da janela da cliente sem perguntar a ela (o
 * layout do site e testado nesse tamanho exato). Medido SO no formulario de
 * senha do painel (components/painel/Entrar.tsx) e gravado SO quando a senha
 * confere (api/painel/entrar); nada disto roda para visitante do site.
 *
 * Todo login certo grava uma linha (lib/telas-db.ts), mesmo sem medida: o
 * servidor le o que chega com `lerMedida`, campo a campo, e marca a linha
 * como completa, parcial (algum campo invalido ficou vazio) ou ausente (o
 * navegador nao mandou medida: o painel antigo em cache, que nao media).
 * Junto vai a versao do painel no navegador (next.config.ts), vazia nas
 * linhas de antes desse campo.
 *
 * O painel mostra a linha com `inferirZoom`, `lerUserAgent` e os textos de
 * celula do fim do arquivo, em que campo vazio e' "nao medido".
 *
 * Puro e sem DOM proprio, exceto `medirTela`, que so roda no navegador.
 */

export type MedidaDaTela = {
  /** window.innerWidth/innerHeight: a janela em pixels CSS (com a barra de rolagem). */
  janelaL: number;
  janelaA: number;
  /** window.outerWidth/outerHeight: a janela inteira, em pixels da tela (nao mudam com o zoom no Chrome). */
  externaL: number;
  externaA: number;
  devicePixelRatio: number;
  /** screen.width/height e availWidth/availHeight. */
  telaL: number;
  telaA: number;
  telaUtilL: number;
  telaUtilA: number;
};

const CAMPOS = [
  "janelaL",
  "janelaA",
  "externaL",
  "externaA",
  "devicePixelRatio",
  "telaL",
  "telaA",
  "telaUtilL",
  "telaUtilA",
] as const satisfies readonly (keyof MedidaDaTela)[];

/** No navegador: a medida agora. */
export function medirTela(): MedidaDaTela {
  return {
    janelaL: window.innerWidth,
    janelaA: window.innerHeight,
    externaL: window.outerWidth,
    externaA: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
    telaL: window.screen.width,
    telaA: window.screen.height,
    telaUtilL: window.screen.availWidth,
    telaUtilA: window.screen.availHeight,
  };
}

/** Uma medida em que cada campo pode ter faltado ou chegado invalido. */
export type MedidaParcial = { [C in keyof MedidaDaTela]: number | null };

/**
 * Como a medida chegou: inteira, em parte (algum campo invalido ficou
 * vazio) ou ausente (o navegador mandou o login sem ela: o painel antigo em
 * cache, que nao media).
 */
export type SituacaoDaMedida = "completa" | "parcial" | "ausente";

const POSITIVOS: ReadonlySet<keyof MedidaDaTela> = new Set(["janelaL", "janelaA", "devicePixelRatio"]);

/**
 * O que veio do navegador, campo a campo: numero finito e plausivel entra,
 * o resto fica vazio. Nunca descarta a medida inteira por um campo ruim, e
 * nunca impede o login.
 */
export function lerMedida(bruto: unknown): { medida: MedidaParcial; situacao: SituacaoDaMedida } {
  const fonte =
    typeof bruto === "object" && bruto !== null && !Array.isArray(bruto) ? (bruto as Record<string, unknown>) : null;
  const medida = {} as MedidaParcial;
  let validos = 0;
  for (const campo of CAMPOS) {
    const valor = fonte?.[campo];
    const teto = campo === "devicePixelRatio" ? 10 : 20_000;
    // Janela e densidade zero nao sao medida: e' o navegador sem janela.
    const piso = POSITIVOS.has(campo) ? Number.MIN_VALUE : 0;
    const ok = typeof valor === "number" && Number.isFinite(valor) && valor >= piso && valor <= teto;
    medida[campo] = ok
      ? campo === "devicePixelRatio"
        ? Math.round((valor as number) * 10_000) / 10_000
        : Math.round(valor as number)
      : null;
    if (ok) validos++;
  }
  const situacao: SituacaoDaMedida = !fonte || validos === 0 ? "ausente" : validos === CAMPOS.length ? "completa" : "parcial";
  return { medida, situacao };
}

/** Os niveis de zoom que o Chrome e o Edge oferecem, em porcento. */
export const NIVEIS_DE_ZOOM = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500] as const;

/** As escalas de tela do Windows, em porcento. */
const ESCALAS_DO_SISTEMA = [100, 125, 150, 175, 200, 225, 250, 300, 350] as const;

const maisPerto = (valor: number, opcoes: readonly number[]) =>
  opcoes.reduce((melhor, x) => (Math.abs(x - valor) < Math.abs(melhor - valor) ? x : melhor), opcoes[0]);

/**
 * O zoom do navegador e a escala do sistema, inferidos.
 *
 * No Chrome e no Edge a largura externa da janela (outerWidth) e' medida em
 * pixels da tela e nao muda com o zoom, e a interna (innerWidth) e' em pixels
 * CSS, que crescem com ele: a razao entre as duas e' o zoom, a menos da borda
 * da janela (uns 16px, menos de 2%, por isso o nivel mais perto). O
 * devicePixelRatio e' a escala do sistema vezes o zoom, entao a escala sai
 * da divisao. Em outro navegador a razao nao vale, e o zoom fica sem palpite.
 */
export function inferirZoom(
  m: MedidaParcial,
  userAgent: string,
): { zoom: number | null; escalaDoSistema: number | null; razao: number } {
  const razao = m.janelaL && m.externaL ? m.externaL / m.janelaL : 0;
  const { navegador } = lerUserAgent(userAgent);
  const cromado = navegador.startsWith("Chrome") || navegador.startsWith("Edge");
  if (!cromado || razao < 0.2 || razao > 6) return { zoom: null, escalaDoSistema: null, razao };
  const zoom = maisPerto(razao * 100, NIVEIS_DE_ZOOM);
  const escala = m.devicePixelRatio ? maisPerto((m.devicePixelRatio / (zoom / 100)) * 100, ESCALAS_DO_SISTEMA) : null;
  return { zoom, escalaDoSistema: escala, razao };
}

/** Navegador e sistema, legiveis, a partir do user agent. */
export function lerUserAgent(ua: string): { navegador: string; sistema: string } {
  const versao = (re: RegExp) => re.exec(ua)?.[1]?.split(".")[0] ?? "";
  let navegador = "Outro";
  if (/Edg\//.test(ua)) navegador = `Edge ${versao(/Edg\/([\d.]+)/)}`;
  else if (/OPR\//.test(ua)) navegador = `Opera ${versao(/OPR\/([\d.]+)/)}`;
  else if (/Firefox\//.test(ua)) navegador = `Firefox ${versao(/Firefox\/([\d.]+)/)}`;
  else if (/Chrome\//.test(ua)) navegador = `Chrome ${versao(/Chrome\/([\d.]+)/)}`;
  else if (/Version\/[\d.]+.*Safari\//.test(ua)) navegador = `Safari ${versao(/Version\/([\d.]+)/)}`;

  let sistema = "Outro";
  if (/Windows NT 10/.test(ua)) sistema = "Windows 10 ou 11";
  else if (/Windows NT/.test(ua)) sistema = "Windows";
  else if (/iPhone|iPad/.test(ua)) sistema = "iOS";
  else if (/Mac OS X/.test(ua)) sistema = "macOS";
  else if (/Android/.test(ua)) sistema = "Android";
  else if (/CrOS/.test(ua)) sistema = "ChromeOS";
  else if (/Linux/.test(ua)) sistema = "Linux";
  return { navegador: navegador.trim(), sistema };
}

/* ------------------------------------------------- textos das celulas */

export const NAO_MEDIDO = "não medido";

/** Largura x altura; com um dos dois vazio, a medida nao serve: "nao medido". */
export function textoDoPar(largura: number | null, altura: number | null): string {
  return largura === null || altura === null ? NAO_MEDIDO : `${largura}×${altura}`;
}

export function textoDoNumero(valor: number | null): string {
  return valor === null ? NAO_MEDIDO : String(valor);
}

/** Zoom ou escala inferidos: sem a medida, "nao medido"; com ela e sem palpite (fora do Chrome e do Edge), "?". */
export function textoDoPalpite(valor: number | null, medido: boolean): string {
  if (valor !== null) return `${valor}%`;
  return medido ? "?" : NAO_MEDIDO;
}

export function textoDaSituacao(situacao: SituacaoDaMedida): string {
  return situacao === "completa" ? "completa" : situacao === "parcial" ? "parcial" : "não enviada (painel antigo)";
}

/** A versao do painel no navegador; vazia nas linhas gravadas antes desse campo. */
export function textoDaVersao(versao: string): string {
  return versao || "anterior ao registro";
}
