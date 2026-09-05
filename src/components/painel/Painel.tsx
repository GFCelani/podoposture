"use client";

import { useCallback, useEffect, useState } from "react";

import type { PostDoPainel } from "@/lib/painel-tipos";
import { BrandMark } from "../brand-mark";
import { EditorDePost } from "./EditorDePost";
import { Entrar } from "./Entrar";

/**
 * O painel inteiro.
 *
 * A regra que organiza este componente: **a tela nunca e a fechadura**. Toda
 * resposta 401 ou 403 do servidor derruba a interface de volta para a senha,
 * venha ela de onde vier. O componente nao guarda "esta autenticado" em lugar
 * nenhum — ele so reage ao que o servidor responde.
 *
 * Depois de entrar, a primeira tela e a LISTA do que ja existe, e nao um
 * formulario em branco: quem volta uma vez por mes quer primeiro ver o que ja
 * escreveu (ver design-system/JOURNEY.md, loop de retorno).
 */

type Tela =
  | { nome: "carregando" }
  | { nome: "entrar" }
  | { nome: "lista" }
  | { nome: "editor"; post: PostDoPainel | null };

export function Painel() {
  const [tela, setTela] = useState<Tela>({ nome: "carregando" });
  const [posts, setPosts] = useState<PostDoPainel[]>([]);
  const [semBanco, setSemBanco] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const resposta = await fetch("/api/painel/posts", { cache: "no-store" });

      if (resposta.status === 401 || resposta.status === 403) {
        setTela({ nome: "entrar" });
        return;
      }
      if (resposta.status === 503) {
        const corpo = await resposta.json().catch(() => ({}));
        setAviso(corpo?.erro ?? "Painel indisponível.");
        setTela({ nome: "entrar" });
        return;
      }
      if (!resposta.ok) {
        setAviso("Não foi possível carregar os textos.");
        setTela({ nome: "lista" });
        return;
      }

      const corpo = await resposta.json();
      setPosts(corpo.posts ?? []);
      setSemBanco(Boolean(corpo.semBanco));
      setAviso(null);
      setTela({ nome: "lista" });
    } catch {
      setAviso("Sem conexão com o servidor.");
      setTela({ nome: "entrar" });
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      await carregar();
      if (!vivo) return;
    })();
    return () => {
      vivo = false;
    };
  }, [carregar]);

  async function sair() {
    await fetch("/api/painel/sair", { method: "POST" }).catch(() => {});
    setPosts([]);
    setTela({ nome: "entrar" });
  }

  async function abrirEditor(id?: string) {
    if (!id) {
      setTela({ nome: "editor", post: null });
      return;
    }
    const resposta = await fetch(`/api/painel/posts/${id}`, { cache: "no-store" });
    if (resposta.status === 401 || resposta.status === 403) {
      setTela({ nome: "entrar" });
      return;
    }
    if (!resposta.ok) {
      setAviso("Não foi possível abrir esse texto.");
      return;
    }
    const corpo = await resposta.json();
    setTela({ nome: "editor", post: corpo.post });
  }

  if (tela.nome === "carregando") {
    return (
      <div className="mx-auto max-w-[26rem] px-6 py-24">
        <p className="text-[1.0625rem] text-muted">Carregando…</p>
      </div>
    );
  }

  if (tela.nome === "entrar") {
    return (
      <>
        {aviso && (
          <p role="alert" className="bg-surface px-6 py-3 text-center text-[0.9375rem] text-ink">
            {aviso}
          </p>
        )}
        <Entrar aoEntrar={() => void carregar()} />
      </>
    );
  }

  if (tela.nome === "editor") {
    return (
      <EditorDePost
        post={tela.post}
        aoSalvar={() => void carregar()}
        aoCancelar={() => setTela({ nome: "lista" })}
        aoPerderSessao={() => setTela({ nome: "entrar" })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[52rem] px-6 py-12 lg:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div className="flex items-center gap-4">
          <BrandMark className="h-8 w-auto" />
          <span
            className="text-[0.6875rem] tracking-[0.18em] text-muted uppercase"
            style={{ fontFamily: "var(--mono)" }}
          >
            Painel do blog
          </span>
        </div>
        <button
          onClick={() => void sair()}
          className="sublinha min-h-[44px] text-[0.9375rem] text-accent hover:text-accent-deep"
        >
          Sair
        </button>
      </header>

      {aviso && (
        <p role="alert" className="mt-6 rounded-md bg-surface px-4 py-3 text-[0.9375rem] text-ink">
          {aviso}
        </p>
      )}

      {semBanco && (
        <p className="mt-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
          O painel está funcionando, mas o banco de textos ainda não foi ligado neste
          servidor. Assim que ele for configurado, os textos aparecem aqui.
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
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

      {posts.length === 0 ? (
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
              aoPerderSessao={() => setTela({ nome: "entrar" })}
            />
          ))}
        </ul>
      )}

      <p className="mt-14 text-[0.875rem] leading-[1.6] text-muted">
        Os 68 textos que já estavam no site continuam publicados normalmente — eles não
        aparecem nesta lista porque fazem parte do próprio site, e não precisam de edição.
      </p>
    </div>
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
    const resposta = await fetch(`/api/painel/posts/${post.id}`, { method: "DELETE" });
    setApagando(false);
    if (resposta.status === 401 || resposta.status === 403) {
      aoPerderSessao();
      return;
    }
    aoApagar();
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
