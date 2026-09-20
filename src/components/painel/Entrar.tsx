"use client";

import { useRef, useState } from "react";

import { BrandMark } from "../brand-mark";

/**
 * A tela de senha.
 *
 * Orcamento: entrar em ate 2 interacoes, 1 campo. Ver design-system/JOURNEY.md.
 *
 * Esta tela nao guarda nada nem decide nada: ela pergunta ao servidor. Se a
 * resposta for boa, o servidor deixa um cookie assinado. Nao existe aqui
 * nenhuma anotacao de "ja entrou" — anotacao no navegador e escrita pelo
 * proprio visitante e nao protege coisa alguma.
 *
 * `aviso` e o recado do painel (sessao que caiu, painel sem configuracao). Mora
 * dentro do cartao, logo acima do campo: fora dele, com a pagina rolada ate os
 * botoes do editor, o aviso ficava acima da tela e ela via so a senha.
 */
export function Entrar({ aoEntrar, aviso }: { aoEntrar: () => Promise<void>; aviso: string | null }) {
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const emCurso = useRef(false);
  const campo = useRef<HTMLInputElement>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (emCurso.current) return;
    if (senha.length === 0) {
      setErro("Digite a senha.");
      campo.current?.focus();
      return;
    }
    emCurso.current = true;
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/painel/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (resposta.ok) {
        // "Entrando…" fica ate o painel trocar de tela: sem esperar, o botao
        // voltava a dizer "Entrar" com a senha certa ja aceita, e ela clicava
        // de novo sem saber se tinha dado certo.
        await aoEntrar();
        return;
      }

      const corpo = await resposta.json().catch(() => ({}));
      setErro(
        typeof corpo?.erro === "string" && corpo.erro
          ? corpo.erro
          : resposta.status === 403
            ? "Não foi possível confirmar de onde veio o pedido. Recarregue a página e tente de novo."
            : "Não foi possível entrar agora. Tente de novo em alguns minutos.",
      );
      setSenha("");
      // O foco volta ao campo: com o botao desligado no clique, ele caia no
      // corpo da pagina e quem usa teclado nao sabia onde estava.
      requestAnimationFrame(() => campo.current?.focus());
    } catch {
      setErro("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    } finally {
      emCurso.current = false;
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[26rem] flex-col justify-center px-6 py-16">
      <BrandMark className="h-10 w-auto" />

      <h1 className="mt-10 font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong">
        Painel do site
      </h1>
      <p className="mt-3 text-[1.0625rem] leading-[1.6] text-muted">
        Digite a senha para cuidar dos textos do blog, da página inicial e dos números do site.
      </p>

      {aviso && (
        <p role="alert" className="mt-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
          {aviso}
        </p>
      )}

      <form onSubmit={enviar} className="mt-10">
        <label htmlFor="senha" className="block text-[0.9375rem] font-medium text-ink-strong">
          Senha
        </label>

        <div className="mt-2 flex gap-2">
          <input
            ref={campo}
            id="senha"
            name="senha"
            type={mostrar ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            maxLength={200}
            autoFocus
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "erro-senha" : undefined}
            className="min-h-[44px] w-full rounded-md border-[1.5px] border-rule bg-paper px-4 text-[1.0625rem] text-ink outline-none focus:border-accent"
          />
          {/* ui-ux-pro-max ux: Forms/Password Visibility — o nome diz o que o
              botao faz, e contem a palavra que aparece nele */}
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? "Ocultar a senha" : "Mostrar a senha"}
            className="min-h-[44px] shrink-0 rounded-md border-[1.5px] border-rule px-3 text-[0.875rem] text-muted hover:border-accent hover:text-accent"
          >
            {mostrar ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {/* ui-ux-pro-max ux: Accessibility/Error Messages — anunciado, nao so colorido */}
        {erro && (
          <p id="erro-senha" role="alert" className="mt-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]">
            {erro}
          </p>
        )}

        {/* ui-ux-pro-max ux: Forms/Submit Feedback — carregando, nunca clique
            mudo. aria-disabled, e nao disabled: botao desligado com o foco nele
            joga o foco para o corpo da pagina. */}
        <button
          type="submit"
          aria-disabled={enviando || senha.length === 0}
          className="mt-8 min-h-[48px] w-full rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow,opacity] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:translate-y-0"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-8 text-[0.875rem] leading-[1.6] text-muted">
        Esqueceu a senha? Ela não pode ser recuperada por aqui: peça uma senha nova a quem cuida do site.
      </p>
    </div>
  );
}
