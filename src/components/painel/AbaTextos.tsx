"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PostDoPainel, ResumoDoPainel } from "@/lib/painel-tipos";
import { conferirArquivo, importarArquivo, lerTextoDoArquivo, type Importado } from "@/lib/importar-arquivo";
import { rotuloNoMenu } from "@/lib/menu";
import { agruparPorMenu, moverNaLista } from "@/lib/ordem-das-paginas";
import { GRUPOS_DO_MENU, type GrupoDoMenu, type PaginaDoPainel, type ResumoDaPagina } from "@/lib/paginas-tipos";
import { armazemDaAba, deixarRecado, tomarRecadoDa } from "@/lib/recado-do-editor";

import { GestaoDeTemas } from "./GestaoDeTemas";
/**
 * Aba "Blog": todos os posts do blog — os que vieram do GoDaddy e os
 * escritos pelo painel — e, pelo botao "Editar temas do blog", a lista de temas.
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

/**
 * A mesma lista serve o blog e as paginas (aba "Paginas"): mesmo carregar,
 * mesmo abrir, mesmo apagar em dois cliques. Muda o endereco das rotas, as
 * palavras e onde cada item mora no site.
 */
const PERFIL = {
  post: {
    api: "/api/painel/posts",
    lista: "posts",
    item: "post",
    recado: "blog",
    titulo: "Textos do blog",
    idDoTitulo: "textos-titulo",
    novo: "Novo texto do blog",
    importar: "Importar arquivo como texto do blog",
    editar: "Editar texto",
    apagar: "Apagar texto",
    semGrupo: "Sem tema",
    // Codificado como no site (hrefDoPost): o "%" do post "chinelos-100%-..."
    // cru dava 404 no "ver no site".
    endereco: (slug: string) => `/home/f/${encodeURIComponent(slug)}`,
    carregando: "Carregando seus textos…",
    vazio: "Você ainda não escreveu nenhum texto por aqui.",
    apagado: "Texto apagado.",
    naoExiste: "Esse texto não existe mais: ele pode ter sido apagado em outra janela. A lista foi atualizada.",
    naoAbre: "Não foi possível abrir esse texto agora. Tente de novo em alguns minutos.",
    naoCarrega: "Não foi possível carregar os textos. Tente de novo em alguns minutos.",
    nome: "texto",
    oNome: "O texto",
    esteNome: "Este texto",
    rascunho: "Rascunho, ainda não está no site",
  },
  pagina: {
    api: "/api/painel/paginas",
    lista: "paginas",
    item: "pagina",
    recado: "paginas",
    titulo: "Páginas do site",
    idDoTitulo: "paginas-titulo",
    novo: "Nova página",
    importar: "Importar arquivo como página",
    editar: "Editar página",
    apagar: "Apagar página",
    semGrupo: "Fora do menu",
    endereco: (slug: string) => `/${encodeURIComponent(slug)}`,
    carregando: "Carregando as páginas…",
    vazio: "Ainda não há páginas por aqui.",
    apagado: "Página apagada.",
    naoExiste: "Essa página não existe mais: ela pode ter sido apagada em outra janela. A lista foi atualizada.",
    naoAbre: "Não foi possível abrir essa página agora. Tente de novo em alguns minutos.",
    naoCarrega: "Não foi possível carregar as páginas. Tente de novo em alguns minutos.",
    nome: "página",
    oNome: "A página",
    esteNome: "Esta página",
    rascunho: "Rascunho, ainda não está no site",
  },
} as const;

type Resumo = ResumoDoPainel | ResumoDaPagina;

const SEM_CONEXAO = "Sem conexão com o servidor. Verifique a internet e tente de novo.";

/** O que fica sob o nome de cada grupo na lista de paginas. */
const AJUDA_DO_GRUPO: Partial<Record<GrupoDoMenu, string>> = {
  "A Clínica": "Contato fica sempre por último no menu.",
};
const AJUDA_FORA_DO_MENU = "Não aparecem no menu: ficam no ar só pelo endereço e pelo Google.";

export function AbaTextos({
  tipo = "post",
  aoPerderSessao,
  aoAbrirEditor,
  tomarFoco,
}: {
  tipo?: "post" | "pagina";
  aoPerderSessao: () => void;
  aoAbrirEditor: (post: PostDoPainel | PaginaDoPainel | null, semBanco: boolean, importado?: Importado) => void;
  /** Para onde vai o foco quando a lista termina de carregar (voltando do editor), ou null. */
  tomarFoco: () => string | null;
}) {
  const perfil = PERFIL[tipo];
  const primeiraCarga = useRef(true);
  /** O id que espera o foco, lido do painel na primeira carga e consumido depois do render da lista. */
  const focoPendente = useRef<string | null>(null);
  // Em ref, e nao so no estado: o editor precisa saber se ha banco, e ler o
  // estado aqui refaria `abrirEditor` e recarregaria a aba quando ele chega.
  const semBancoAgora = useRef(false);
  const [posts, setPosts] = useState<Resumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semBanco, setSemBanco] = useState(false);
  const [verTemas, setVerTemas] = useState(false);
  // Falha ao carregar e falha de uma acao sao avisos separados: recarregar a
  // lista depois de apagar nao pode apagar junto o aviso de que apagar falhou.
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  /** A pagina que esta mudando de posicao: uma por vez, como abrir. */
  const [movendo, setMovendo] = useState<string | null>(null);
  /** O botao que recebe o foco depois de mover (a linha muda de lugar na tela). */
  const focoAposMover = useRef<{ id: string; direcao: -1 | 1 } | null>(null);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const resposta = await fetch(perfil.api, { cache: "no-store" });

      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErroDaLista(
          resposta.status === 503 && typeof corpo?.erro === "string"
            ? `${corpo.erro} Avise quem cuida do site.`
            : perfil.naoCarrega,
        );
        return;
      }

      const corpo = await resposta.json();
      setPosts(corpo[perfil.lista] ?? []);
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
  }, [aoPerderSessao, tomarFoco, perfil]);

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
    (document.getElementById(alvo) ?? document.getElementById(perfil.idDoTitulo))?.focus();
  }, [posts, carregando, perfil]);

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
        const resposta = await fetch(`${perfil.api}/${id}`, { cache: "no-store" });
        if (resposta.status === 401 || resposta.status === 403) {
          if (reabrindo) {
            deixarRecado(armazemDaAba(), { tipo: "reabrir", id, ...(tipo === "pagina" ? { pagina: true as const } : {}) });
          }
          aoPerderSessao();
          return;
        }
        if (resposta.status === 404) {
          setAviso({
            tipo: "erro",
            texto: perfil.naoExiste,
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
                : perfil.naoAbre,
          });
          return;
        }
        const corpo = await resposta.json();
        aoAbrirEditor(corpo[perfil.item], semBancoAgora.current);
      } catch {
        setAviso({ tipo: "erro", texto: SEM_CONEXAO });
      } finally {
        setAbrindo(null);
      }
    },
    [aoAbrirEditor, aoPerderSessao, carregar, perfil, tipo],
  );

  useEffect(() => {
    // Mesmo motivo do efeito em Painel.tsx: o estado so muda fora do corpo do
    // efeito. O recado e lido na mesma microtarefa, e so uma vez: quem le apaga.
    queueMicrotask(() => {
      const recado = tomarRecadoDa(armazemDaAba(), perfil.recado);
      if (recado?.tipo === "salvo") setAviso({ tipo: "feito", texto: recado.mensagem });
      if (recado?.tipo === "reabrir") void abrirEditor(recado.id, true);
      void carregar();
    });
  }, [abrirEditor, carregar, perfil]);

  const aoApagado = useCallback(() => {
    setAviso({ tipo: "feito", texto: perfil.apagado });
    void carregar();
  }, [carregar, perfil]);

  const aoFalhar = useCallback((texto: string) => setAviso({ tipo: "erro", texto }), []);

  /**
   * Sobe ou desce uma pagina dentro do grupo do menu. A lista muda na tela na
   * hora e volta como estava se o servidor recusar; o pedido leva o grupo
   * inteiro, e o servidor recusa se ele mudou em outra janela (409), caso em
   * que a lista recarrega.
   */
  async function mover(grupo: GrupoDoMenu, ids: string[], pagina: ResumoDaPagina, direcao: -1 | 1) {
    if (movendo) return;
    const nova = moverNaLista(ids, pagina.id, direcao);
    if (!nova) return;
    const antes = posts;
    setPosts((lista) =>
      lista.map((p) => (p.categoria === grupo && nova.includes(p.id) ? { ...p, ordem: nova.indexOf(p.id) } : p)),
    );
    setMovendo(pagina.id);
    setAviso(null);
    focoAposMover.current = { id: pagina.id, direcao };
    try {
      const resposta = await fetch(`${perfil.api}/ordem`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupo, ids: nova }),
      });
      if (resposta.status === 401 || resposta.status === 403) {
        setPosts(antes);
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setPosts(antes);
        setAviso({
          tipo: "erro",
          texto:
            (resposta.status === 409 || resposta.status === 503) && typeof corpo?.erro === "string"
              ? corpo.erro
              : "Não foi possível mudar a ordem agora. O menu continua como estava; tente de novo em alguns minutos.",
        });
        if (resposta.status === 409) void carregar();
        return;
      }
      const posicao = nova.indexOf(pagina.id) + 1;
      setAviso({
        tipo: "feito",
        texto: `“${rotuloNoMenu(pagina)}” agora é a ${posicao}ª de ${nova.length} em ${grupo}.${
          pagina.publicado ? " O menu do site já mudou." : " Ela aparece nessa posição quando for publicada."
        }`,
      });
    } catch {
      setPosts(antes);
      setAviso({ tipo: "erro", texto: `${SEM_CONEXAO} O menu continua como estava.` });
    } finally {
      setMovendo(null);
    }
  }

  // Depois de mover, o foco fica na seta que ela usou (ou na outra, se a
  // pagina chegou na ponta e essa seta nao serve mais): a linha trocou de
  // lugar na tela, e sem isto o foco de teclado se perdia.
  useEffect(() => {
    const alvo = focoAposMover.current;
    if (!alvo || movendo) return;
    focoAposMover.current = null;
    const usada = document.getElementById(`${alvo.direcao < 0 ? "subir" : "descer"}-${alvo.id}`);
    const outra = document.getElementById(`${alvo.direcao < 0 ? "descer" : "subir"}-${alvo.id}`);
    (usada?.getAttribute("aria-disabled") === "true" ? outra : usada)?.focus();
  }, [posts, movendo]);

  /** Um .md (ou .html) vira um texto novo (ou pagina nova), aberto como rascunho no editor. */
  async function importar(arquivo: File) {
    const problema = conferirArquivo(arquivo.name, arquivo.size);
    if (problema) {
      setAviso({ tipo: "erro", texto: problema.erro });
      return;
    }
    try {
      aoAbrirEditor(null, semBancoAgora.current, importarArquivo(arquivo.name, lerTextoDoArquivo(await arquivo.arrayBuffer())));
    } catch {
      setAviso({ tipo: "erro", texto: "Não foi possível ler esse arquivo. Confira se é um .md ou .html de texto e tente de novo." });
    }
  }

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
          id={perfil.idDoTitulo}
          tabIndex={-1}
          className="font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong outline-none"
        >
          {perfil.titulo}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {tipo === "post" && (
          <button
            onClick={() => setVerTemas((v) => !v)}
            aria-expanded={verTemas}
            aria-controls="painel-temas"
            className="min-h-[48px] rounded-md border-[1.5px] border-accent/45 px-5 text-accent hover:border-accent"
          >
            {verTemas ? "Fechar temas do blog" : "Editar temas do blog"}
          </button>
          )}
          <label className="inline-flex min-h-[48px] cursor-pointer items-center rounded-md border-[1.5px] border-accent/45 px-5 text-accent hover:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
            {perfil.importar}
            <input
              type="file"
              accept=".md,.markdown,.html,.htm,text/markdown,text/html"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = "";
              }}
            />
          </label>
          {/* Unico botao preenchido da tela — a acao dominante do loop de retorno */}
          <button
          onClick={() => void abrirEditor(null)}
          className="min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-6 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift"
        >
            {perfil.novo}
          </button>
        </div>
      </div>

      {tipo === "post" && verTemas && (
        <div id="painel-temas">
          <GestaoDeTemas aoPerderSessao={aoPerderSessao} aoMudarTextos={() => void carregar()} />
        </div>
      )}

      {carregando ? (
        // ui-ux-pro-max ux: Animation/Loading States — sem isto, o estado vazio
        // piscava "voce ainda nao escreveu nenhum texto" antes da lista chegar.
        <p role="status" className="mt-10 text-[1.0625rem] text-muted">
          {perfil.carregando}
        </p>
      ) : posts.length === 0 ? (
        // ui-ux-pro-max ux: estado vazio que ensina o proximo passo, nunca em branco
        <p className="mt-10 rounded-lg border border-rule bg-surface px-6 py-10 text-center text-[1.0625rem] leading-[1.7] text-muted">
          {perfil.vazio}
          <br />
          Comece pelo botão <strong className="text-ink-strong">{perfil.novo}</strong>.
        </p>
      ) : tipo === "pagina" ? (
        // As paginas na ordem do cabecalho do site, grupo por grupo; as setas
        // mudam a posicao dentro do grupo (o grupo se troca no editor).
        agruparPorMenu(posts as ResumoDaPagina[]).map(({ grupo, paginas }) => {
          const ids = paginas.map((p) => p.id);
          const idDoGrupo = `grupo-${grupo ? GRUPOS_DO_MENU.indexOf(grupo) : "fora"}`;
          const ajuda = grupo ? AJUDA_DO_GRUPO[grupo] : AJUDA_FORA_DO_MENU;
          return (
            <section key={grupo ?? "fora"} aria-labelledby={idDoGrupo} className="mt-10">
              <h2
                id={idDoGrupo}
                className="text-[0.75rem] tracking-[0.16em] text-muted uppercase"
                style={{ fontFamily: "var(--mono)" }}
              >
                {grupo ? `Menu · ${grupo}` : "Fora do menu"}
              </h2>
              {ajuda && <p className="mt-1 text-[0.875rem] text-muted">{ajuda}</p>}
              <ol className="mt-3 divide-y divide-rule border-t border-rule">
                {paginas.map((pagina, i) => (
                  <LinhaDePost
                    key={pagina.id}
                    tipo={tipo}
                    post={pagina}
                    abrindo={abrindo === pagina.id}
                    aoEditar={() => {
                      if (!abrindo) void abrirEditor(pagina.id);
                    }}
                    aoApagado={aoApagado}
                    aoFalhar={aoFalhar}
                    aoPerderSessao={aoPerderSessao}
                    mover={
                      grupo && paginas.length > 1
                        ? {
                            grupo,
                            podeSubir: i > 0,
                            podeDescer: i < paginas.length - 1,
                            ocupado: movendo !== null,
                            aoMover: (direcao) => void mover(grupo, ids, pagina, direcao),
                          }
                        : undefined
                    }
                  />
                ))}
              </ol>
            </section>
          );
        })
      ) : (
        <ul className="mt-8 divide-y divide-rule border-t border-rule">
          {posts.map((post) => (
            <LinhaDePost
              key={post.id}
              tipo={tipo}
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
  tipo,
  post,
  abrindo,
  aoEditar,
  aoApagado,
  aoFalhar,
  aoPerderSessao,
  mover,
}: {
  tipo: "post" | "pagina";
  post: Resumo;
  abrindo: boolean;
  aoEditar: () => void;
  aoApagado: () => void;
  aoFalhar: (texto: string) => void;
  aoPerderSessao: () => void;
  /** So nas paginas de um grupo do menu com mais de uma: as setas de posicao. */
  mover?: {
    grupo: GrupoDoMenu;
    podeSubir: boolean;
    podeDescer: boolean;
    /** Outra pagina mudando de lugar agora: as setas esperam. */
    ocupado: boolean;
    aoMover: (direcao: -1 | 1) => void;
  };
}) {
  const perfil = PERFIL[tipo];
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
      const resposta = await fetch(`${perfil.api}/${post.id}`, { method: "DELETE" });
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
          ? `${corpo.erro} ${perfil.oNome} não foi apagad${tipo === "pagina" ? "a" : "o"}. Avise quem cuida do site.`
          : `Não foi possível apagar ${tipo === "pagina" ? "a página" : "o texto"} agora. Continua aqui; tente de novo em alguns minutos.`,
      );
    } catch {
      aoFalhar(`Sem conexão com o servidor. ${perfil.oNome} não foi apagad${tipo === "pagina" ? "a" : "o"}; verifique a internet e tente de novo.`);
    } finally {
      // Sem isto, um erro deixava o botao preso em "Apagando…".
      setApagando(false);
      setConfirmando(false);
    }
  }

  // A pagina aparece pelo nome que tem no menu do site, que e' o que ela esta
  // ordenando; o titulo, quando e' outro (as do site antigo tem frase inteira
  // no titulo), vem embaixo.
  const nome = tipo === "pagina" ? rotuloNoMenu(post) : post.titulo;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
      {/* basis + flex-1: titulo longo quebra dentro da coluna em vez de
          empurrar os botoes para a linha de baixo so naquela linha */}
      <div className="min-w-0 flex-1 basis-[14rem]">
        <p className="font-display text-[1.125rem] leading-[1.35] font-medium text-ink-strong">{nome}</p>
        {nome !== post.titulo && <p className="mt-0.5 text-[0.875rem] text-muted">Título da página: {post.titulo}</p>}
        <p className="mt-1 text-[0.875rem] text-muted">
          {post.publicado ? (
            <>
              No ar ·{" "}
              <a
                href={perfil.endereco(post.slug)}
                target="_blank"
                rel="noreferrer"
                className="sublinha text-accent"
              >
                ver no site
              </a>
            </>
          ) : (
            <span className="text-[#8a6d1f]">{perfil.rascunho}</span>
          )}
          {/* Na lista de paginas o grupo ja e' o titulo da secao. */}
          {tipo === "post" && ` · ${post.categoria || perfil.semGrupo}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {mover && (
          // aria-disabled, e nao disabled: o botao continua focavel. Com
          // disabled, a seta da pagina que chegou na ponta perdia o foco e
          // ele caia no corpo da pagina.
          <div className="flex items-center gap-1" role="group" aria-label={`Posição de “${nome}” no menu`}>
            {([-1, 1] as const).map((direcao) => {
              const pode = direcao < 0 ? mover.podeSubir : mover.podeDescer;
              const inativo = !pode || mover.ocupado;
              const acao = direcao < 0 ? "Subir" : "Descer";
              return (
                <button
                  key={direcao}
                  type="button"
                  id={`${direcao < 0 ? "subir" : "descer"}-${post.id}`}
                  onClick={() => {
                    if (!inativo) mover.aoMover(direcao);
                  }}
                  aria-disabled={inativo}
                  aria-label={`${acao} “${nome}” no menu de ${mover.grupo}`}
                  title={pode ? `${acao} no menu` : direcao < 0 ? "Já é a primeira do grupo" : "Já é a última do grupo"}
                  className={`min-h-[44px] min-w-[44px] rounded-md border-[1.5px] px-3 text-[1rem] leading-none ${
                    pode ? "border-accent/45 text-accent hover:border-accent" : "border-rule text-muted/50"
                  } aria-disabled:cursor-not-allowed`}
                >
                  <span aria-hidden="true">{direcao < 0 ? "↑" : "↓"}</span>
                </button>
              );
            })}
          </div>
        )}
        <button
          id={`editar-${post.id}`}
          onClick={aoEditar}
          disabled={abrindo}
          aria-label={abrindo ? undefined : `${perfil.editar}: ${nome}`}
          className="min-h-[44px] rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent disabled:opacity-50"
        >
          {abrindo ? "Abrindo…" : perfil.editar}
        </button>
        <button
          onClick={() => void apagar()}
          onBlur={() => setConfirmando(false)}
          disabled={apagando}
          aria-describedby={confirmando ? `aviso-apagar-${post.id}` : undefined}
          aria-label={apagando ? undefined : `${confirmando ? "Confirmar e apagar" : perfil.apagar}: ${nome}`}
          className={`min-h-[44px] rounded-md px-4 text-[0.9375rem] ${
            confirmando
              ? "border-[1.5px] border-[#8c2f2f] text-[#8c2f2f]"
              : "text-muted hover:text-[#8c2f2f]"
          }`}
        >
          {apagando ? "Apagando…" : confirmando ? "Confirmar e apagar" : perfil.apagar}
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
            ? `${perfil.esteNome} sai do site e não pode ser recuperad${tipo === "pagina" ? "a" : "o"}. Para confirmar, clique outra vez em “Confirmar e apagar”.`
            : "Este rascunho é apagado e não pode ser recuperado. Para confirmar, clique outra vez em “Confirmar e apagar”."}
        </p>
      )}
    </li>
  );
}
