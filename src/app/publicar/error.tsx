"use client";

import { useEffect } from "react";

/**
 * A rede do painel, escrita para a Dra. Claudia — nao para a visitante.
 *
 * Sem este arquivo, uma trava no painel cairia no `error.tsx` da raiz, que
 * fala com quem veio procurar a clinica e oferece "voltar ao inicio" e "ver o
 * blog": nenhuma das duas coisas que ela precisa no meio de um texto.
 *
 * Cada frase aqui foi medida contra o codigo, porque texto de tela garantindo
 * alem do que o codigo faz e' o defeito que mais apareceu na auditoria deste
 * projeto. Por isso:
 *
 * - "normalmente nao derruba o site", e nao "o site continua no ar": esta
 *   fronteira nao checou o site. Ela sabe que o painel e' outra rota, e nada
 *   alem disso.
 * - "se voce estava escrevendo": a copia no navegador
 *   (`podoposture_rascunho:<id>` em src/lib/copia-do-post.ts, e
 *   `podoposture_inicio:<chave>` na aba da pagina inicial) so nasce quando ela
 *   digita algo.
 * - "recupera — ou pergunta antes": `decidirCopia` compara a versao de origem
 *   da copia com a do servidor, e quando elas divergem ela PERGUNTA em vez de
 *   restaurar sozinha. Prometer restauracao automatica seria mentir na metade
 *   dos casos.
 *
 * `retry` remonta o painel sem recarregar a pagina, entao a copia do navegador
 * continua onde esta e o editor a encontra ao abrir.
 */
export default function ErroDoPainel({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[painel] a tela quebrou:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[30rem] flex-col justify-center px-6 py-16">
      <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
        Painel do site
      </p>

      <h1 className="mt-5 font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong">
        Algo travou aqui dentro
      </h1>

      <p className="mt-4 text-[1.0625rem] leading-[1.6] text-ink">
        Foi só aqui no painel: uma falha nesta tela normalmente não derruba o
        site, que é servido à parte.
      </p>

      <p className="mt-4 text-[1.0625rem] leading-[1.6] text-ink">
        Se você estava escrevendo, o que digitou continua guardado neste
        navegador: ao reabrir, o editor recupera o texto — ou pergunta antes,
        se ele tiver mudado em outro aparelho.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-[44px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-5 text-[1rem] font-medium text-ink-strong shadow-tag hover:shadow-lift"
        >
          Abrir o painel de novo
        </button>

        {/* Ancora crua, e nao <Link>, de proposito: <Link> navega pelo
            roteador do cliente, que e' justamente a parte que acabou de
            quebrar. Aqui a saida e' recarregar o documento do zero, que e' o
            que o navegador faz sozinho com um href comum. Por isso a regra do
            Next que pede <Link> fica desligada nesta linha. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/publicar"
          className="min-h-[44px] content-center text-[1rem] text-accent underline underline-offset-4"
        >
          Recarregar a página
        </a>
      </div>

      <p className="mt-12 border-t border-rule pt-8 text-[0.9375rem] leading-[1.7] text-muted">
        Se continuar travando, avise quem cuida do site.
        {error.digest && (
          <>
            {" "}
            O código desta falha é{" "}
            <span className="font-mono text-[0.8125rem] text-ink">
              {error.digest}
            </span>
            .
          </>
        )}
      </p>
    </main>
  );
}
