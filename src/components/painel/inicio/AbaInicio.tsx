"use client";

/**
 * Aba "Pagina inicial" — ainda sem conteudo.
 *
 * A frente da pagina inicial substitui este arquivo inteiro. A assinatura fica:
 * o painel ja monta a aba com ela (contrato de aba em Painel.tsx).
 */
export function AbaInicio({ aoPerderSessao }: { aoPerderSessao: () => void }) {
  void aoPerderSessao;
  return <p className="text-[1.0625rem] text-muted">Em preparação.</p>;
}
