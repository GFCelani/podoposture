"use client";

import { useRef, useState } from "react";

import { CANAL_DA_PAGINA_INICIAL } from "./edicao";

/**
 * Publicar direto da aba de como vai ficar.
 *
 * Publica o rascunho que ela esta vendo — os dados vem do servidor, os mesmos
 * que montaram a pagina — com a versao da linha: se a secao mudou em outra
 * janela depois, a rota responde 409 e nada vai ao ar. O mesmo segundo clique
 * de confirmacao do editor, com a mesma frase de onde a mudanca aparece.
 *
 * Depois de publicar, avisa o editor aberto no painel pelo BroadcastChannel;
 * sem esse aviso ele seguiria mostrando "Publicar no site" para algo que ja
 * esta no ar. Navegador sem o canal ainda fica protegido pela versao: a
 * proxima gravacao do editor recebe 409 e junta as mudancas.
 */
export function PublicarDaPrevia({
  chave,
  rotulo,
  explicacao,
  dados,
  versao,
}: {
  chave: string;
  rotulo: string;
  explicacao: string;
  dados: unknown;
  versao: string | null;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [situacao, setSituacao] = useState<"parado" | "publicando" | "publicado">("parado");
  const [erro, setErro] = useState<string | null>(null);
  const emCurso = useRef(false);

  async function publicar() {
    if (emCurso.current || situacao === "publicado") return;
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    emCurso.current = true;
    setSituacao("publicando");
    setErro(null);
    try {
      const resposta = await fetch(`/api/painel/inicio/${encodeURIComponent(chave)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados, acao: "publicar", versao }),
      });
      const lido: unknown = await resposta.json().catch(() => null);
      const corpo = typeof lido === "object" && lido !== null ? (lido as Record<string, unknown>) : {};

      if (resposta.status === 401 || resposta.status === 403) {
        setErro("Sua sessão terminou. Volte ao painel, entre de novo e publique por lá: o rascunho continua guardado.");
        setSituacao("parado");
        return;
      }
      if (resposta.status === 409) {
        setErro(
          "Esta seção mudou em outra janela depois que você abriu esta página, e nada foi publicado. Volte ao painel e veja de novo como vai ficar.",
        );
        setSituacao("parado");
        return;
      }
      if (!resposta.ok) {
        const doServidor = typeof corpo.erro === "string" ? corpo.erro : "Não foi possível publicar agora.";
        setErro(`${doServidor} O rascunho continua guardado; tente de novo em instantes ou publique pelo painel.`);
        setSituacao("parado");
        return;
      }

      try {
        const canal = new BroadcastChannel(CANAL_DA_PAGINA_INICIAL);
        canal.postMessage({ tipo: "publicada", chave, secao: corpo.secao });
        canal.close();
      } catch {
        // sem o canal, o editor descobre pela versao na proxima gravacao
      }
      setSituacao("publicado");
    } catch {
      setErro("Sem conexão com o servidor. O rascunho continua guardado; tente de novo quando a internet voltar.");
      setSituacao("parado");
    } finally {
      emCurso.current = false;
      setConfirmando(false);
    }
  }

  if (situacao === "publicado") {
    return (
      <p role="status" className="mt-3 text-[0.9375rem] leading-[1.5] font-medium text-paper">
        A seção “{rotulo}” foi publicada. Quem abrir o site a partir de agora já vê a versão nova.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void publicar()}
        onBlur={() => setConfirmando(false)}
        aria-disabled={situacao === "publicando"}
        aria-describedby={confirmando ? "previa-confirmacao" : undefined}
        className="min-h-[44px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-5 font-medium text-ink-strong shadow-tag aria-disabled:opacity-60"
      >
        {situacao === "publicando" ? "Publicando…" : confirmando ? "Confirmar e publicar" : "Publicar no site"}
      </button>
      {confirmando && (
        <p id="previa-confirmacao" role="alert" className="mt-2 text-[0.875rem] leading-[1.5] text-paper">
          {explicacao}
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-[0.875rem] leading-[1.5] font-medium text-paper">
          {erro}
        </p>
      )}
    </div>
  );
}
