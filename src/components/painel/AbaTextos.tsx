"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PostDoPainel, ResumoDoPainel } from "@/lib/painel-tipos";
import { armazemDaAba, deixarRecado, tomarRecado } from "@/lib/recado-do-editor";

import { GestaoDeTemas } from "./GestaoDeTemas";
/**
 * Aba "Meu blog": todos os posts do blog — os que vieram do GoDaddy e os
 * escritos pelo painel — e, pelo botao "Temas", a lista de temas.
 *
 * E a entrada padrao do painel. Segue o contrato de aba descrito em
 * Painel.tsx; alem de `aoPerderSessao`, recebe `aoAbrirEditor`, porque o editor
 * ocupa a tela inteira e quem decide a tela e o painel.
 *
 * Ao montar, a aba le o recado que o editor deixou (ver `recado-do-editor.ts`):
 * a confirmacao do que acabou de ser salvo, ou o texto que estava aberto quando
 * a sessao caiu, que ela reabre sozinha.
 */

type Aviso = { tipo: "erro" | "feito"; texto: string };

const SEM_CONEXAO = "Sem conexão com o servidor. Verifique a internet e tente de novo.";

export function AbaTextos({
  aoPerderSessao,
  aoAbrirEditor,
  tomarFoco,
}: {
  aoPerderSessao: () => void;
  aoAbrirEditor: (post: PostDoPainel | null, semBanco: boolean) => void;
  /** Para onde vai o foco quando a lista termina de carregar (voltando do editor), ou null. */
  tomarFoco: () => string | null;
}) {
  const primeiraCarga = useRef(true);
  /** O id que espera o foco, lido do painel na primeira carga e consumido depois do render da lista. */
  const focoPendente = useRef<string | null>(null);
  // Em ref, e nao so no estado: o editor precisa saber se ha banco, e ler o
  // estado aqui refaria `abrirEditor` e recarregaria a aba quando ele chega.
  const semBancoAgora = useRef(false);
  const [posts, setPosts] = useState<ResumoDoPainel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semBanco, setSemBanco] = useState(false);
  const [verTemas, setVerTemas] = useState(false);
  // Falha ao carregar e falha de uma acao sao avisos separados: recarregar a
  // lista depois de apagar nao pode apagar junto o aviso de que apagar falhou.
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const resposta = await fetch("/api/painel/posts", { cache: "no-store" });

      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErroDaLista(
          resposta.status === 503 && typeof corpo?.erro === "string"
            ? `${corpo.erro} Avise quem cuida do site.`
            : "Não foi possível carregar os textos. Tente de novo em alguns minutos.",
        );
        return;
      }

      const corpo = await resposta.json();
      setPosts(corpo.posts ?? []);
      setSemBanco(Boolean(corpo.semBanco));
      semBancoAgora.current = Boolean(corpo.semBanco);
      setErroDaLista(null);
    } catch {
      setErroDaLista(SEM_CONEXAO);
    } finally {
      setCarregando(false);
      // So na primeira carga: voltando do editor, o foco volta ao "Editar" do
      // texto de onde ela saiu. Aqui so guardamos o alvo; quem move o foco e o
      // efeito abaixo, depois que a lista existe na tela.
      if (primeiraCarga.current) {
        primeiraCarga.current = false;
        focoPendente.current = tomarFoco();
      }
    }
  }, [aoPerderSessao, tomarFoco]);

  /**
   * O foco so vai ao "Editar" depois que a lista foi para a tela.
   *
   * Antes ele era movido num `requestAnimationFrame` disparado no fim do
   * carregamento. No WebKit esse quadro roda ANTES de o React montar as linhas:
   * `getElementById("editar-<id>")` voltava null e o foco caia no reserva, o
   * titulo da lista — 1 acerto em 4 idas ao editor, contra 4 em 4 no Chromium.
   * Este efeito roda depois do render que ja tem as linhas, entao o alvo existe.
   */
  useEffect(() => {
    if (carregando) return;
    const alvo = focoPendente.current;
    if (alvo === null) return;
    focoPendente.current = null;
    // O reserva continua valendo: o texto pode ter sido apagado em outra janela
    // e nao estar mais na lista que acabou de chegar.
    (document.getElementById(alvo) ?? document.getElementById("textos-titulo"))?.focus();
  }, [posts, carregando]);

  /**
   * Busca o texto completo e abre o editor. `reabrindo` e o caso da sessao que
   * caiu com o texto aberto: se cair de novo aqui, o recado volta para o
   * armazem, senao a proxima senha levaria para a lista e nao para o texto.
   */
  const abrirEditor = useCallback(
    async (id: string | null, reabrindo = false): Promise<void> => {
      if (!id) {
        aoAbrirEditor(null, semBancoAgora.current);
        return;
      }
      setAbrindo(id);
      setAviso(null);
      try {
        const resposta = await fetch(`/api/painel/posts/${id}`, { cache: "no-store" });
        if (resposta.status === 401 || resposta.status === 403) {
          if (reabrindo) deixarRecado(armazemDaAba(), { tipo: "reabrir", id });
          aoPerderSessao();
          return;
        }
        if (resposta.status === 404) {
          setAviso({
            tipo: "erro",
            texto: "Esse texto não existe mais: ele pode ter sido apagado em outra janela. A lista foi atualizada.",
          });
          void carregar();
          return;
        }
        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => ({}));
          setAviso({
            tipo: "erro",
            texto:
              resposta.status === 503 && typeof corpo?.erro === "string"
                ? `${corpo.erro} Avise quem cuida do site.`
                : "Não foi possível abrir esse texto agora. Tente de novo em alguns minutos.",
          });
          return;
        }
        const corpo = await resposta.json();
        aoAbrirEditor(corpo.post, semBancoAgora.current);
      } catch {
        setAviso({ tipo: "erro", texto: SEM_CONEXAO });
      } finally {
        setAbrindo(null);
      }
    },
    [aoAbrirEditor, aoPerderSessao, carregar],
  );

  useEffect(() => {
    // Mesmo motivo do efeito em Painel.tsx: o estado so muda fora do corpo do
    // efeito. O recado e lido na mesma microtarefa, e so uma vez: quem le apaga.
    queueMicrotask(() => {
      const recado = tomarRecado(armazemDaAba());
      if (recado?.tipo === "salvo") setAviso({ tipo: "feito", texto: recado.mensagem });
      if (recado?.tipo === "reabrir") void abrirEditor(recado.id, true);
      void carregar();
    });
  }, [abrirEditor, carregar]);

  const aoApagado = useCallback(() => {
    setAviso({ tipo: "feito", texto: "Texto apagado." });
    void carregar();
  }, [carregar]);

  const aoFalhar = useCallback((texto: string) => setAviso({ tipo: "erro", texto }), []);

  return (
    <>
      {erroDaLista && (
        <p role="alert" className="mb-6 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] text-[#8c2f2f]">
          {erroDaLista}
        </p>
      )}

      {/* ui-ux-pro-max ux: Feedback/Confirmation Messages — sucesso curto e
          visivel; erro anunciado com o proximo passo */}
      {aviso?.tipo === "erro" && (
        <p role="alert" className="mb-6 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] text-[#8c2f2f]">
          {aviso.texto}
        </p>
      )}
      {/* Regiao sempre na pagina, trocando so o texto: um aviso que ja nasce
          escrito junto com a lista nem sempre e lido pelo leitor de tela. */}
      <p
        role="status"
        className={
          aviso?.tipo === "feito"
            ? "mb-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] text-ink-strong"
            : "sr-only"
        }
      >
        {aviso?.tipo === "feito" ? aviso.texto : ""}
      </p>

      {semBanco && (
        <p className="mb-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
          O painel está funcionando, mas o banco de textos ainda não foi ligado neste
          servidor: por enquanto dá para escrever, mas não para guardar nem publicar. Assim que
          ele for configurado, os textos aparecem aqui. Avise quem cuida do site.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1
          id="textos-titulo"
          tabIndex={-1}
          className="font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong outline-none"
        >
          Meu blog
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setVerTemas((v) => !v)}
            aria-expanded={verTemas}
            aria-controls="painel-temas"
            className="min-h-[48px] rounded-md border-[1.5px] border-accent/45 px-5 text-accent hover:border-accent"
          >
            {verTemas ? "Fechar temas" : "Temas"}
          </button>
          {/* Unico botao preenchido da tela — a acao dominante do loop de retorno */}
          <button
          onClick={() => void abrirEditor(null)}
          className="min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-6 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift"
        >
            Escrever texto
          </button>
        </div>
      </div>

      {verTemas && (
        <div id="painel-temas">
          <GestaoDeTemas aoPerderSessao={aoPerderSessao} aoMudarTextos={() => void carregar()} />
        </div>
      )}

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
              abrindo={abrindo === post.id}
              aoEditar={() => {
                // Um texto por vez: dois cliques rapidos em linhas diferentes
                // abririam o editor duas vezes, com o segundo por cima.
                if (!abrindo) void abrirEditor(post.id);
              }}
              aoApagado={aoApagado}
              aoFalhar={aoFalhar}
              aoPerderSessao={aoPerderSessao}
            />
          ))}
        </ul>
      )}

    </>
  );
}

function LinhaDePost({
  post,
  abrindo,
  aoEditar,
  aoApagado,
  aoFalhar,
  aoPerderSessao,
}: {
  post: ResumoDoPainel;
  abrindo: boolean;
  aoEditar: () => void;
  aoApagado: () => void;
  aoFalhar: (texto: string) => void;
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
      // 404: ja nao existia (apagado em outra janela). O que ela queria ja
      // aconteceu, e a lista recarregada mostra isso.
      if (resposta.ok || resposta.status === 404) {
        aoApagado();
        return;
      }
      const corpo = await resposta.json().catch(() => ({}));
      aoFalhar(
        resposta.status === 503 && typeof corpo?.erro === "string"
          ? `${corpo.erro} O texto não foi apagado. Avise quem cuida do site.`
          : "Não foi possível apagar o texto agora. Ele continua aqui; tente de novo em alguns minutos.",
      );
    } catch {
      aoFalhar("Sem conexão com o servidor. O texto não foi apagado; verifique a internet e tente de novo.");
    } finally {
      // Sem isto, um erro deixava o botao preso em "Apagando…".
      setApagando(false);
      setConfirmando(false);
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
          {post.categoria || "Sem tema"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          id={`editar-${post.id}`}
          onClick={aoEditar}
          disabled={abrindo}
          className="min-h-[44px] rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent disabled:opacity-50"
        >
          {abrindo ? "Abrindo…" : "Editar"}
        </button>
        <button
          onClick={() => void apagar()}
          onBlur={() => setConfirmando(false)}
          disabled={apagando}
          aria-describedby={confirmando ? `aviso-apagar-${post.id}` : undefined}
          className={`min-h-[44px] rounded-md px-4 text-[0.9375rem] ${
            confirmando
              ? "border-[1.5px] border-[#8c2f2f] text-[#8c2f2f]"
              : "text-muted hover:text-[#8c2f2f]"
          }`}
        >
          {apagando ? "Apagando…" : confirmando ? "Confirmar exclusão" : "Apagar"}
        </button>
      </div>
      {/* Como nas outras confirmacoes do painel: a troca do rotulo sozinha nem
          sempre e lida num botao que ja tem o foco, e ela precisa saber que
          apagar nao tem volta antes do segundo clique. */}
      {confirmando && (
        <p
          id={`aviso-apagar-${post.id}`}
          role="alert"
          className="w-full rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]"
        >
          {post.publicado
            ? "Este texto sai do site e não pode ser recuperado. Para confirmar, clique outra vez em “Confirmar exclusão”."
            : "Este rascunho é apagado e não pode ser recuperado. Para confirmar, clique outra vez em “Confirmar exclusão”."}
        </p>
      )}
    </li>
  );
}
