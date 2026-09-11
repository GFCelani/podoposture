"use client";

import { useCallback, useEffect, useState } from "react";

import type { PostDoPainel } from "@/lib/painel-tipos";

/**
 * Aba "Seus textos": os posts escritos pelo painel.
 *
 * E a entrada padrao do painel. Segue o contrato de aba descrito em
 * Painel.tsx; alem de `aoPerderSessao`, recebe `aoAbrirEditor`, porque o editor
 * ocupa a tela inteira e quem decide a tela e o painel.
 */
export function AbaTextos({
  aoPerderSessao,
  aoAbrirEditor,
}: {
  aoPerderSessao: () => void;
  aoAbrirEditor: (post: PostDoPainel | null) => void;
}) {
  const [posts, setPosts] = useState<PostDoPainel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semBanco, setSemBanco] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const resposta = await fetch("/api/painel/posts", { cache: "no-store" });

      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setAviso(
          resposta.status === 503 && typeof corpo?.erro === "string"
            ? corpo.erro
            : "Não foi possível carregar os textos. Tente de novo em alguns minutos.",
        );
        return;
      }

      const corpo = await resposta.json();
      setPosts(corpo.posts ?? []);
      setSemBanco(Boolean(corpo.semBanco));
      setAviso(null);
    } catch {
      setAviso("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    } finally {
      setCarregando(false);
    }
  }, [aoPerderSessao]);

  useEffect(() => {
    // Mesmo motivo do efeito em Painel.tsx: o estado so muda depois da rede.
    queueMicrotask(() => void carregar());
  }, [carregar]);

  async function abrirEditor(id?: string) {
    if (!id) {
      aoAbrirEditor(null);
      return;
    }
    try {
      const resposta = await fetch(`/api/painel/posts/${id}`, { cache: "no-store" });
      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        setAviso("Não foi possível abrir esse texto. Tente de novo em alguns minutos.");
        return;
      }
      const corpo = await resposta.json();
      aoAbrirEditor(corpo.post);
    } catch {
      setAviso("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    }
  }

  return (
    <>
      {aviso && (
        <p role="alert" className="mb-6 rounded-md bg-surface px-4 py-3 text-[0.9375rem] text-ink">
          {aviso}
        </p>
      )}

      {semBanco && (
        <p className="mb-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
          O painel está funcionando, mas o banco de textos ainda não foi ligado neste
          servidor. Assim que ele for configurado, os textos aparecem aqui.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong">
          Seus textos
        </h1>
        {/* Unico botao preenchido da tela — a acao dominante do loop de retorno */}
        <button
          onClick={() => void abrirEditor()}
          className="min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-6 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift"
        >
          Escrever texto
        </button>
      </div>

      {carregando ? (
        // ui-ux-pro-max ux: Animation/Loading States — sem isto, o estado vazio
        // piscava "voce ainda nao escreveu nenhum texto" antes da lista chegar.
        <p role="status" className="mt-10 text-[1.0625rem] text-muted">
          Carregando seus textos…
        </p>
      ) : posts.length === 0 ? (
        // ui-ux-pro-max ux: estado vazio que ensina o proximo passo, nunca em branco
        <p className="mt-10 rounded-lg border border-rule bg-surface px-6 py-10 text-center text-[1.0625rem] leading-[1.7] text-muted">
          Você ainda não escreveu nenhum texto por aqui.
          <br />
          Comece pelo botão <strong className="text-ink-strong">Escrever texto</strong>.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-rule border-t border-rule">
          {posts.map((post) => (
            <LinhaDePost
              key={post.id}
              post={post}
              aoEditar={() => void abrirEditor(post.id)}
              aoApagar={() => void carregar()}
              aoPerderSessao={aoPerderSessao}
            />
          ))}
        </ul>
      )}

      <p className="mt-14 text-[0.875rem] leading-[1.6] text-muted">
        Os 68 textos que já estavam no site continuam publicados normalmente — eles não
        aparecem nesta lista porque fazem parte do próprio site, e não precisam de edição.
      </p>
    </>
  );
}

function LinhaDePost({
  post,
  aoEditar,
  aoApagar,
  aoPerderSessao,
}: {
  post: PostDoPainel;
  aoEditar: () => void;
  aoApagar: () => void;
  aoPerderSessao: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);

  async function apagar() {
    // ui-ux-pro-max ux: Interaction/Confirmation Dialogs — o segundo clique e a
    // confirmacao, e o botao diz o que vai acontecer em vez de abrir um modal.
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setApagando(true);
    try {
      const resposta = await fetch(`/api/painel/posts/${post.id}`, { method: "DELETE" });
      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      aoApagar();
    } catch {
      // Sem rede, recarregar a lista e o que faz o aviso de conexao aparecer.
      aoApagar();
    } finally {
      // Sem isto, um erro de rede deixava o botao preso em "Apagando…".
      setApagando(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
      <div className="min-w-0">
        <p className="font-display text-[1.125rem] leading-[1.35] font-medium text-ink-strong">
          {post.titulo}
        </p>
        <p className="mt-1 text-[0.875rem] text-muted">
          {post.publicado ? (
            <>
              No ar ·{" "}
              <a
                href={`/home/f/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className="sublinha text-accent"
              >
                ver no site
              </a>
            </>
          ) : (
            <span className="text-[#8a6d1f]">Rascunho — ainda não está no site</span>
          )}
          {" · "}
          {post.categoria}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={aoEditar}
          className="min-h-[44px] rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent"
        >
          Editar
        </button>
        <button
          onClick={() => void apagar()}
          onBlur={() => setConfirmando(false)}
          disabled={apagando}
          className={`min-h-[44px] rounded-md px-4 text-[0.9375rem] ${
            confirmando
              ? "border-[1.5px] border-[#8c2f2f] text-[#8c2f2f]"
              : "text-muted hover:text-[#8c2f2f]"
          }`}
        >
          {apagando ? "Apagando…" : confirmando ? "Confirmar exclusão" : "Apagar"}
        </button>
      </div>
    </li>
  );
}
