"use client";

import { useRouter } from "next/navigation";

/**
 * Saida da previa da pagina inicial.
 *
 * O editor abre a previa numa aba propria, e o painel continua aberto na aba
 * de origem. Um link para /publicar levaria esta aba ao painel e deixaria dois
 * paineis abertos, cada um com a propria copia do que ela digitou. Por isso o
 * botao fecha a aba; so quando o navegador nao deixa (a previa foi aberta por
 * link, fora do editor) ele navega para o painel, e nunca vira beco sem saida.
 */
export function VoltarAoPainel() {
  const router = useRouter();

  function aoVoltar() {
    window.close();
    if (!window.closed) router.push("/publicar");
  }

  return (
    <button
      type="button"
      onClick={aoVoltar}
      className="sublinha inline-flex min-h-[44px] items-center text-[0.9375rem] text-paper"
    >
      Fechar e voltar ao painel
    </button>
  );
}
