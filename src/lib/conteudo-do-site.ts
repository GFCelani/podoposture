import "server-only";

import { cache } from "react";

import { lerPublicados, lerPublicadosERascunhos, type LinhaDeConteudo } from "./conteudo-db";
import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import {
  CHAVES_DE_SECAO,
  mesclarConteudo,
  mesclarSecao,
  type ChaveDeSecao,
  type ConteudoDoSite,
  type EstadoDaSecao,
  type EstadosDasSecoes,
} from "./conteudo-tipos";
import { bancoConfigurado } from "./painel-db";

/**
 * O conteudo que as paginas mostram: padrao do codigo com o publicado por cima.
 *
 * Regra dura deste arquivo: ler conteudo NUNCA derruba pagina nem build.
 * - Sem DATABASE_URL devolve o padrao sem abrir conexao.
 * - Qualquer erro vira console.error e padrao.
 * - Depois de uma falha, o modulo passa 60 s devolvendo o padrao sem tentar.
 *   Sem esse disjuntor, um build com o banco fora esperaria o connect_timeout
 *   de 10 s em cada uma das 89 paginas, e estouraria o limite de 60 s por
 *   pagina muito antes de terminar.
 *
 * O preco conhecido: se o banco falhar justo na regeneracao depois de uma
 * publicacao, a pagina fica com o padrao ate a proxima publicacao ou deploy.
 * Mostrar o texto de hoje e o erro aceitavel; mostrar uma pagina quebrada nao.
 */

const PAUSA_DEPOIS_DE_FALHA_MS = 60_000;
let falhouEm = 0;

/**
 * Uma consulta por renderizacao: o `cache` do React deduplica entre o layout,
 * os metadados, a pagina e a casca que chamam esta funcao na mesma requisicao.
 */
export const lerConteudoDoSite = cache(async (): Promise<ConteudoDoSite> => {
  if (!bancoConfigurado()) return CONTEUDO_PADRAO;
  if (Date.now() - falhouEm < PAUSA_DEPOIS_DE_FALHA_MS) return CONTEUDO_PADRAO;
  try {
    return mesclarConteudo(CONTEUDO_PADRAO, await lerPublicados());
  } catch (erro) {
    falhouEm = Date.now();
    console.error("[conteudo] falha ao ler o conteudo publicado; o site mostra o padrao:", erro);
    return CONTEUDO_PADRAO;
  }
});

export type ConteudoDaPrevia = {
  conteudo: ConteudoDoSite;
  /** Frase pronta para a faixa da previa quando o rascunho nao pode ser lido. */
  aviso: string | null;
};

/**
 * Padrao ⊕ publicado ⊕ rascunho, para a previa. So a pagina da previa chama,
 * depois de conferir a sessao; sem `cache`, porque a previa e dinamica e cada
 * visita precisa ver o rascunho de agora.
 */
export async function lerConteudoComRascunho(): Promise<ConteudoDaPrevia> {
  if (!bancoConfigurado()) {
    return {
      conteudo: CONTEUDO_PADRAO,
      aviso: "O banco de dados não está ligado neste servidor, então a prévia mostra o texto padrão.",
    };
  }
  try {
    const { publicados, rascunhos } = await lerPublicadosERascunhos();
    const saida = {} as Record<ChaveDeSecao, unknown>;
    for (const chave of CHAVES_DE_SECAO) {
      const publicado = mesclarSecao(chave, CONTEUDO_PADRAO[chave], publicados[chave]);
      saida[chave] = mesclarSecao(chave, publicado, rascunhos[chave]);
    }
    return { conteudo: saida as ConteudoDoSite, aviso: null };
  } catch (erro) {
    console.error("[conteudo] falha ao ler o rascunho para a previa:", erro);
    return {
      conteudo: CONTEUDO_PADRAO,
      aviso: "Não deu para ler os rascunhos agora, então a prévia mostra o texto padrão. Recarregue em instantes.",
    };
  }
}

/** A secao como o painel a recebe: publicado e rascunho ja mesclados e validos. */
export function estadoDaSecao<C extends ChaveDeSecao>(
  chave: C,
  linha: LinhaDeConteudo | null | undefined,
): EstadoDaSecao<ConteudoDoSite[C]> {
  const padrao = CONTEUDO_PADRAO[chave];
  const publicado =
    linha && linha.publicado !== null ? mesclarSecao(chave, padrao, linha.publicado) : null;
  const rascunho =
    linha && linha.rascunho !== null ? mesclarSecao(chave, publicado ?? padrao, linha.rascunho) : null;
  return {
    padrao,
    publicado,
    rascunho,
    atualizadoEm: linha?.atualizadoEm ?? null,
    publicadoEm: linha?.publicadoEm ?? null,
  };
}

/** Todas as secoes, na ordem da pagina. Secao nunca salva vem so com o padrao. */
export function estadosDasSecoes(linhas: ReadonlyMap<string, LinhaDeConteudo>): EstadosDasSecoes {
  const saida = {} as Record<ChaveDeSecao, unknown>;
  for (const chave of CHAVES_DE_SECAO) saida[chave] = estadoDaSecao(chave, linhas.get(chave));
  return saida as EstadosDasSecoes;
}
