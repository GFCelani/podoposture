"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * A rede embaixo de toda pagina publica.
 *
 * Ate aqui o site tinha 404 caprichado e mais nada: qualquer excecao em render
 * caia na tela padrao do Next, fundo branco e texto em ingles, num site de
 * saude cuja visitante costuma chegar com dor. Esta fronteira troca isso por
 * uma pagina na lingua e no sistema visual do site, com saida.
 *
 * Por que ela nao usa o PageShell: fronteira de erro e Client Component
 * (exigencia do React), e o PageShell e um componente de servidor que le o
 * conteudo do banco — justamente uma das coisas que podem ter quebrado para a
 * pagina chegar aqui. Uma pagina de erro que depende do que falhou nao e rede.
 * Por isso a composicao abaixo e autossuficiente e so usa os tokens do tema.
 *
 * O que ela NAO oferece: telefone e WhatsApp. Eles moram no conteudo editavel
 * (painel), que esta fora do alcance de um componente de cliente, e escrever o
 * numero aqui a mao recriaria a divergencia que o CRUD da home acabou de
 * eliminar. O caminho para falar com a clinica e o link para /contato, que tem
 * o dado de verdade.
 *
 * `retry` e o nome da prop no Next 16 (`reset` ficou como caso de excecao).
 *
 * O QUE ESTA PAGINA NAO COBRE, medido e nao suposto: quando quem quebra e' um
 * componente de SERVIDOR, o Next responde 500 com um documento minimo
 * (`<html id="__next_error__">`, sem nada desta tela dentro) e esta fronteira
 * so aparece depois que o JavaScript carrega e hidrata. Conferido em
 * `next start`: o HTML cru nao traz "Esta pagina nao carregou", e o navegador
 * mostra a pagina inteira. Na pratica cobre quem visita pelo navegador — que e'
 * o caso da clinica — mas nao um leitor sem JavaScript, que ve pagina em
 * branco com status 500. Mudar isso dependeria do Next, nao deste arquivo.
 */
export default function ErroDaPagina({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Em producao o React nao manda a mensagem original para o cliente, so o
    // digest. Registrar aqui deixa o rastro no console do navegador; o texto
    // completo fica no log do servidor, casado por esse mesmo digest.
    console.error("[site] pagina quebrou:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col justify-center bg-paper px-6 py-16">
      <div className="mx-auto w-full max-w-[34rem]">
        <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
          Erro no site
        </p>

        <h1 className="mt-5 font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.15] font-semibold text-ink-strong">
          Esta página não carregou
        </h1>

        <p className="mt-5 text-[1.0625rem] leading-[1.6] text-ink">
          Foi uma falha nossa, não algo que você fez. Em geral é passageiro:
          tentar de novo costuma resolver.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="min-h-[44px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-5 text-[1rem] font-medium text-ink-strong shadow-tag hover:shadow-lift"
          >
            Tentar de novo
          </button>

          <Link
            href="/"
            className="min-h-[44px] content-center text-[1rem] text-accent underline underline-offset-4"
          >
            Voltar ao início
          </Link>
        </div>

        <p className="mt-12 border-t border-rule pt-8 text-[0.9375rem] leading-[1.7] text-muted">
          Se continuar assim, fale com a clínica pela{" "}
          <Link href="/contato" className="text-accent underline underline-offset-4">
            página de contato
          </Link>
          .
          {error.digest && (
            <>
              {" "}
              Se quiser relatar, o código desta falha é{" "}
              <span className="font-mono text-[0.8125rem] text-ink">
                {error.digest}
              </span>
              .
            </>
          )}
        </p>
      </div>
    </main>
  );
}
