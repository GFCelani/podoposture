/**
 * Titulo longo do topo das paginas internas, reduzido ate o topo caber na
 * primeira tela (2026-10-13).
 *
 * O topo e' "o bloco de texto": trilha, emblema, titulo, subtitulo e
 * identificacao. Se ele termina abaixo da janela (menos FOLGA), em dois
 * passos, parando no primeiro que bastar:
 *   1. o espacamento compacto que a janela baixa ja usa (globals.css, "TOPO
 *      DAS PAGINAS INTERNAS EM JANELA BAIXA"): respiro de cima de 120px em
 *      vez de 176, emblema de 48 em vez de 80, passos menores entre trilha,
 *      subtitulo e identificacao. Sem ele, em 1536 x 695 o titulo de
 *      Tratamento da Dor, que nem e' longo, caia de 52 para 28px;
 *   2. o corpo do titulo desce ate o bloco caber, por busca binaria entre o
 *      corpo do CSS e MINIMO, o legivel para titulo em display. No minimo e
 *      ainda nao cabe, fica no minimo.
 * O texto nunca muda.
 *
 * So a partir de 1024px: abaixo disso o topo empilha (foto depois do texto)
 * e nao ha primeira tela a respeitar.
 *
 * Roda duas vezes: num <script> logo depois do topo, antes da primeira
 * pintura (page-shell.tsx serializa esta funcao com toString, por isso ela
 * nao usa nada de fora dela), e no componente AjusteDoTitulo depois que a
 * fonte carrega e a cada mudanca de janela.
 *
 * Mede a caixa do bloco, e nao a do titulo: o Reveal anima os filhos por
 * transform, que nao mexe na caixa do pai.
 *
 * O corpo vai numa folha <style id="ajuste-do-titulo"> no <head>, e nao no
 * style do <h1>: o script roda antes da hidratacao, e mexer num atributo do
 * <h1> ali seria diferenca de hidratacao para o React.
 */
export function ajustarTitulo(): void {
  const MINIMO = 28;
  const FOLGA = 16;
  const COMPACTO =
    ".ps-topo{padding-top:120px !important;padding-bottom:40px !important}" +
    ".ps-trilha{margin-bottom:16px !important}" +
    ".ps-emblema{width:48px !important;height:48px !important;margin-bottom:16px !important}" +
    ".ps-subtitulo,.ps-ident{margin-top:12px !important}" +
    ".ps-ident>span:first-child{margin-bottom:12px !important}" +
    ".ps-midia figure{max-height:calc(100svh - 136px) !important}";
  let estilo = document.getElementById("ajuste-do-titulo");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "ajuste-do-titulo";
    document.head.appendChild(estilo);
  }
  const folha = estilo;
  const aplicar = function (compacto: boolean, px: number | null) {
    folha.textContent = (compacto ? COMPACTO : "") + (px === null ? "" : ".ps-titulo{font-size:" + px + "px !important}");
  };
  aplicar(false, null);
  const h1 = document.querySelector<HTMLElement>(".ps-titulo");
  const bloco = h1 && h1.closest<HTMLElement>(".ps-topo > div > div");
  if (!h1 || !bloco || window.innerWidth < 1024) return;
  const limite = window.innerHeight - FOLGA;
  const base = function () {
    return bloco.getBoundingClientRect().bottom + window.scrollY;
  };
  if (base() <= limite) return;
  aplicar(true, null);
  if (base() <= limite) return;
  let maior = parseFloat(getComputedStyle(h1).fontSize);
  if (!(maior > MINIMO)) return;
  aplicar(true, MINIMO);
  if (base() > limite) return;
  let menor = MINIMO;
  for (let i = 0; i < 8; i++) {
    const meio = (menor + maior) / 2;
    aplicar(true, meio);
    if (base() <= limite) menor = meio;
    else maior = meio;
  }
  aplicar(true, Math.floor(menor * 4) / 4);
}
