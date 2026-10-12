import { elementos } from "./blocos";
import type { LinhaDoFluxo, PlanoDoFluxo } from "./fluxo";
import type { Foto } from "./ilustracao-da-pagina";

/**
 * A regra das imagens da grade em duas colunas (texto a esquerda, imagens a
 * direita): a coluna das imagens de uma linha nunca fica muito mais alta que
 * o texto ao lado dela. Passou do limite, nesta ordem:
 *
 *   1. as que sobram descem para as linhas seguintes que tem texto e nao tem
 *      imagem, na ordem do texto, cada uma com as que couberem nela (e a
 *      primeira tambem desce, se nem reduzida ao minimo ela cabe ao lado do
 *      texto em que foi posta);
 *   2. o que ainda sobra volta para a linha e a coluna vira grade de duas;
 *   3. por fim a coluna inteira reduz, ate a menor foto legivel (MENOR_FOTO).
 *
 * Sem medir no navegador: a altura do texto e' estimada pelo numero de
 * caracteres, com as medidas da grade em 1440 (coluna do texto de 1-7 com a
 * prosa em 66ch, coluna das imagens de 9-12). A grade escala junto com a
 * janela, entao a proporcao entre as duas colunas, que e' o que a regra
 * compara, quase nao muda de 1024 em diante. Abaixo de 1024 as imagens
 * empilham debaixo do texto e a regra nao se aplica.
 *
 * As medidas foram calibradas contra a pagina renderizada; o teste de
 * e2e/pagina-nova.spec.ts confere o resultado no navegador.
 */

/** Medidas em px na grade de 1440 (involucro de 1240 com 40 de margem, 12 colunas de goteira 24). */
export const GRADE = {
  colunaDasFotos: 370.67,
  /** Caracteres por linha da prosa (1.125rem, 66ch). */
  caracteresPorLinha: 74,
  entrelinha: 30.6,
  /** Espaco entre dois blocos de texto. */
  entreBlocos: 24.3,
  /** Titulo de secao (.pi-h2) e o espaco ate o texto. */
  caracteresPorLinhaDoTitulo: 34,
  entrelinhaDoTitulo: 43.7,
  /** Primeiro paragrafo da abertura (.pi-lead). */
  caracteresPorLinhaDoLead: 50,
  entrelinhaDoLead: 39,
  depoisDoTitulo: 32,
  /** Moldura da foto (borda + p-2), legenda em mono e o vao entre fotos. */
  moldura: 18,
  caracteresPorLinhaDaLegenda: 38,
  entrelinhaDaLegenda: 16.5,
  respiroDaLegenda: 16,
  entreFotos: 24,
  entreFotosNoPar: 16,
} as const;

/** Quanto a coluna das imagens pode passar do texto: o respiro de uma faixa. */
export const TOLERANCIA = 88;

/**
 * Menor largura de uma foto: abaixo disso a legenda em mono vira uma coluna
 * de palavras soltas e a foto deixa de ser legivel.
 */
export const MENOR_FOTO = 200;

/** Na grade de duas cada foto ja nasce com menos da metade da coluna. */
export const MENOR_FOTO_NO_PAR = 150;

/** Menor largura da coluna das imagens, em fracao da coluna, por arranjo. */
export function escalaMinima(arranjo: Arranjo): number {
  const coluna = arranjo === "par" ? 2 * MENOR_FOTO_NO_PAR + GRADE.entreFotosNoPar : MENOR_FOTO;
  return Math.min(1, Math.ceil((coluna / GRADE.colunaDasFotos) * 100) / 100);
}

const linhasDe = (caracteres: number, porLinha: number) => Math.max(1, Math.ceil(caracteres / porLinha));

/** Altura estimada do texto de uma linha, com o titulo quando ela comeca nele. */
export function alturaDoTexto(html: string, titulo?: string, lead = false): number {
  let altura = 0;
  if (titulo !== undefined) {
    altura += linhasDe(titulo.length, GRADE.caracteresPorLinhaDoTitulo) * GRADE.entrelinhaDoTitulo;
    if (html.trim()) altura += GRADE.depoisDoTitulo;
  }
  const els = elementos(html);
  els.forEach((e, k) => {
    if (k > 0) altura += GRADE.entreBlocos;
    if (e.tag === "ul" || e.tag === "ol") {
      const itens = [...e.html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
      itens.forEach((i, j) => {
        if (j > 0) altura += 8;
        altura += linhasDe(i.length, GRADE.caracteresPorLinha - 4) * GRADE.entrelinha;
      });
    } else if (/^h[2-6]$/.test(e.tag)) {
      altura += linhasDe(e.texto.length, GRADE.caracteresPorLinhaDoTitulo + 10) * 34;
    } else if (e.tag === "blockquote") {
      altura += linhasDe(e.texto.length, 48) * 36;
    } else if (lead && k === 0 && e.tag === "p") {
      altura += linhasDe(e.texto.length, GRADE.caracteresPorLinhaDoLead) * GRADE.entrelinhaDoLead;
    } else {
      altura += linhasDe(e.texto.length, GRADE.caracteresPorLinha) * GRADE.entrelinha;
    }
  });
  return altura;
}

/** Altura de uma foto em moldura, com a legenda, numa coluna de `largura` px. */
export function alturaDaFoto(foto: Foto, largura: number): number {
  const miolo = largura - GRADE.moldura;
  let altura = (miolo * foto.altura) / foto.largura + GRADE.moldura;
  if (foto.legenda) {
    const porLinha = Math.max(8, Math.floor((GRADE.caracteresPorLinhaDaLegenda * largura) / GRADE.colunaDasFotos) - 4);
    altura += GRADE.respiroDaLegenda + linhasDe(foto.legenda.length, porLinha) * GRADE.entrelinhaDaLegenda;
  }
  return altura;
}

export type Arranjo = "pilha" | "par";

/** Altura da coluna das imagens, na escala dada. */
export function alturaDaColuna(fotos: Foto[], arranjo: Arranjo, escala = 1): number {
  const largura = GRADE.colunaDasFotos * escala;
  if (fotos.length === 0) return 0;
  if (arranjo === "pilha") {
    return fotos.reduce((a, f) => a + alturaDaFoto(f, largura), 0) + GRADE.entreFotos * (fotos.length - 1);
  }
  const meia = (largura - GRADE.entreFotosNoPar) / 2;
  let altura = 0;
  for (let i = 0; i < fotos.length; i += 2) {
    if (i > 0) altura += GRADE.entreFotosNoPar;
    altura += Math.max(...fotos.slice(i, i + 2).map((f) => alturaDaFoto(f, meia)));
  }
  return altura;
}

export type LinhaDistribuida = LinhaDoFluxo & {
  arranjo: Arranjo;
  /** Largura da coluna das imagens, em fracao (1 = a coluna inteira). */
  escala: number;
  /** Mesmo reduzidas, as imagens passam do limite ao lado deste texto. */
  excede: boolean;
};

type Ref = { linha: LinhaDoFluxo; titulo?: string; lead?: boolean };

function limiteDe(ref: Ref): number {
  return alturaDoTexto(ref.linha.html, ref.linha.comTitulo ? ref.titulo : undefined, ref.lead) + TOLERANCIA;
}

/**
 * Quantas das primeiras fotos ficam numa linha: as que cabem empilhadas no
 * limite em tamanho cheio; nenhuma cabendo cheia, a primeira, se couber
 * reduzida ao minimo; senao nenhuma (ela desce tambem).
 */
function quantasCabem(fotos: Foto[], limite: number): number {
  let n = 0;
  while (n < fotos.length && alturaDaColuna(fotos.slice(0, n + 1), "pilha") <= limite) n++;
  if (n > 0) return n;
  return fotos.length > 0 && alturaDaColuna(fotos.slice(0, 1), "pilha", escalaMinima("pilha")) <= limite ? 1 : 0;
}

/** Passos 2 e 3 numa linha: grade de duas, depois reduzir. */
function arranjar(fotos: Foto[], limite: number): { arranjo: Arranjo; escala: number; excede: boolean } {
  if (fotos.length === 0 || alturaDaColuna(fotos, "pilha") <= limite) return { arranjo: "pilha", escala: 1, excede: false };
  const arranjo: Arranjo = fotos.length > 1 ? "par" : "pilha";
  const cheia = alturaDaColuna(fotos, arranjo);
  if (cheia <= limite) return { arranjo, escala: 1, excede: false };
  // A altura cresce com a largura quase na mesma proporcao (so a legenda nao).
  const minima = escalaMinima(arranjo);
  let escala = Math.max(minima, Math.floor((limite / cheia) * 100) / 100);
  while (escala > minima && alturaDaColuna(fotos, arranjo, escala) > limite) escala = Math.max(minima, escala - 0.02);
  return { arranjo, escala, excede: alturaDaColuna(fotos, arranjo, escala) > limite };
}

/**
 * O plano com as imagens distribuidas. Nao muda o texto nem a ordem dele;
 * so em que linha cada imagem fica e como a coluna dela se arranja.
 */
export function distribuirFotos(plano: PlanoDoFluxo): {
  abertura: LinhaDistribuida[];
  secoes: LinhaDistribuida[][];
  excesso: boolean;
} {
  const refs: Ref[] = [];
  const abertura = plano.abertura?.linhas.map((l) => ({ ...l, fotos: [...l.fotos] })) ?? [];
  abertura.forEach((linha, k) => refs.push({ linha, lead: k === 0 }));
  const secoes = plano.secoes.map((s) =>
    s.linhas.map((l) => {
      const linha = { ...l, fotos: [...l.fotos] };
      refs.push({ linha, titulo: (s.tituloHtml ?? "").replace(/<[^>]+>/g, "") });
      return linha;
    }),
  );

  // As linhas que nasceram sem imagem, e que por isso podem receber.
  const livres = new Set(refs.filter((r) => r.linha.fotos.length === 0 && r.linha.html.trim()));
  for (let k = 0; k < refs.length; k++) {
    const ref = refs[k];
    if (ref.linha.fotos.length === 0 || livres.has(ref)) continue;
    const ficam = quantasCabem(ref.linha.fotos, limiteDe(ref));
    let sobram = ref.linha.fotos.slice(ficam);
    ref.linha.fotos = ref.linha.fotos.slice(0, ficam);
    const candidatas: Ref[] = [ref];
    for (let j = k + 1; j < refs.length && sobram.length > 0; j++) {
      const alvo = refs[j];
      if (!livres.has(alvo)) continue;
      const n = quantasCabem(sobram, limiteDe(alvo));
      if (n === 0) continue;
      livres.delete(alvo);
      candidatas.push(alvo);
      alvo.linha.fotos = sobram.slice(0, n);
      sobram = sobram.slice(n);
    }
    // Passos 2 e 3 para as que ainda sobram: cada uma vai para a linha (a
    // dela, uma das que ja receberam ou uma livre adiante) em que a coluna,
    // em grade de duas ou reduzida, passa menos do texto ao lado.
    for (const foto of sobram) {
      const opcoes = [...candidatas, ...refs.slice(k + 1).filter((r) => livres.has(r))];
      let melhor = opcoes[0];
      let menor = Infinity;
      for (const r of opcoes) {
        const limite = limiteDe(r);
        const fotos = [...r.linha.fotos, foto];
        const a = arranjar(fotos, limite);
        const passa = alturaDaColuna(fotos, a.arranjo, a.escala) - limite;
        if (passa < menor - 0.5) {
          menor = passa;
          melhor = r;
        }
      }
      if (livres.delete(melhor)) candidatas.push(melhor);
      melhor.linha.fotos.push(foto);
    }
  }

  let excesso = false;
  const fechar = (ref: Ref): LinhaDistribuida => {
    const a = arranjar(ref.linha.fotos, limiteDe(ref));
    if (a.excede) excesso = true;
    return { ...ref.linha, ...a };
  };
  const porLinha = new Map(refs.map((r) => [r.linha, fechar(r)]));
  return {
    abertura: abertura.map((l) => porLinha.get(l)!),
    secoes: secoes.map((s) => s.map((l) => porLinha.get(l)!)),
    excesso,
  };
}
