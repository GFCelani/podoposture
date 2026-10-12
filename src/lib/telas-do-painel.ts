/**
 * A tela de quem entra no painel: janela, tela, densidade e zoom.
 *
 * Para saber o tamanho real da janela da cliente sem perguntar a ela (o
 * layout do site e testado nesse tamanho exato). Medido SO no formulario de
 * senha do painel (components/painel/Entrar.tsx) e gravado SO quando a senha
 * confere (api/painel/entrar); nada disto roda para visitante do site.
 *
 * Puro e sem DOM proprio, exceto `medirTela`, que so roda no navegador: o
 * servidor valida o que chega com `validarMedida` e o painel mostra com
 * `inferirZoom` e `lerUserAgent`.
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

/**
 * O que veio do navegador, conferido: so numeros finitos e plausiveis. Algo
 * fora disso descarta a medida inteira (o login segue normalmente).
 */
export function validarMedida(bruto: unknown): MedidaDaTela | null {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return null;
  const fonte = bruto as Record<string, unknown>;
  const saida = {} as MedidaDaTela;
  for (const campo of CAMPOS) {
    const valor = fonte[campo];
    if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
    const teto = campo === "devicePixelRatio" ? 10 : 20_000;
    if (valor < 0 || valor > teto) return null;
    saida[campo] = campo === "devicePixelRatio" ? Math.round(valor * 10_000) / 10_000 : Math.round(valor);
  }
  if (saida.janelaL === 0 || saida.janelaA === 0 || saida.devicePixelRatio === 0) return null;
  return saida;
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
  m: MedidaDaTela,
  userAgent: string,
): { zoom: number | null; escalaDoSistema: number | null; razao: number } {
  const razao = m.janelaL > 0 ? m.externaL / m.janelaL : 0;
  const { navegador } = lerUserAgent(userAgent);
  const cromado = navegador.startsWith("Chrome") || navegador.startsWith("Edge");
  if (!cromado || razao < 0.2 || razao > 6) return { zoom: null, escalaDoSistema: null, razao };
  const zoom = maisPerto(razao * 100, NIVEIS_DE_ZOOM);
  const escala = maisPerto((m.devicePixelRatio / (zoom / 100)) * 100, ESCALAS_DO_SISTEMA);
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
