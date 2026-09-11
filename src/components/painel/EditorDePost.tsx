"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TurndownService from "turndown";

import { SecoesDeConteudo } from "@/components/secoes-de-conteudo";
import { markdownParaHtml } from "@/lib/markdown";
import {
  CATEGORIAS,
  LIMITES_POST,
  errosComCampo,
  mensagemAoSalvar,
  mensagemDeFalhaAoSalvar,
  rascunhoPrecisaConfirmar,
  validarPost,
  type DadosDoPost,
  type ErrosPost,
  type PostDoPainel,
} from "@/lib/painel-tipos";
import { ErroAoEnviarImagem, enviarImagem as enviarAoServidor } from "@/lib/preparar-imagem";
import { armazemDaAba, deixarRecado } from "@/lib/recado-do-editor";

/** Largura de coluna de texto do blog com folga para tela de alta densidade. */
const LARGURA_MAXIMA_DA_IMAGEM = 1600;

/**
 * Onde o texto e escrito.
 *
 * Tres decisoes vem do design-system/JOURNEY.md e nao sao negociaveis aqui:
 *
 * 1. **Colar do Word tem que funcionar.** E o cenario real: ela escreve no Word
 *    e cola. Numa caixa de texto comum, negrito, titulo e lista somem. O painel
 *    intercepta a colagem, le a versao formatada da area de transferencia e
 *    converte. Sem isto o painel e inutil para ela.
 * 2. **Nada do que ela escreveu pode sumir.** Rascunho guardado no proprio
 *    navegador enquanto digita, aviso antes de fechar a aba, e — se a sessao
 *    vencer — o texto e guardado na hora e reaberto depois da senha (ver
 *    `recado-do-editor.ts`). A frase de sessao vencida mora no painel, porque o
 *    editor e desmontado no mesmo instante e um aviso daqui nunca apareceria.
 * 3. **Ela precisa ver como vai ficar.** A pre-visualizacao usa o MESMO
 *    componente e a mesma conversao de Markdown que a pagina publicada
 *    (`SecoesDeConteudo`, tipo post), entao o que ela ve e o que o visitante
 *    vai ver.
 */

const BOTAO_FORMATO =
  "min-h-[36px] rounded-md border border-rule px-3 text-[0.875rem] text-ink hover:border-accent hover:text-accent";

const VAZIO: DadosDoPost = {
  titulo: "",
  resumo: "",
  categoria: CATEGORIAS[0],
  capa: "",
  corpo: "",
  publicado: false,
};

/** Word cola HTML cheio de sujeira; interessa so a estrutura. */
const conversor = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
// Imagem colada do Word aponta para o disco de quem copiou (file:///...) ou vem
// embutida em base64 gigante. Nenhuma das duas serve; ela usa o botao de imagem.
conversor.addRule("semImagem", { filter: ["img"], replacement: () => "" });
conversor.remove(["style", "script", "meta", "link"]);

export function EditorDePost({
  post,
  aoSalvar,
  aoCancelar,
  aoPerderSessao,
}: {
  post: PostDoPainel | null;
  aoSalvar: () => void;
  aoCancelar: () => void;
  aoPerderSessao: () => void;
}) {
  const inicial: DadosDoPost = post
    ? {
        titulo: post.titulo,
        resumo: post.resumo,
        categoria: post.categoria,
        capa: post.capa,
        corpo: post.corpo,
        publicado: post.publicado,
      }
    : VAZIO;

  const [campos, setCampos] = useState<DadosDoPost>(inicial);
  const [erros, setErros] = useState<ErrosPost>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [recuperado, setRecuperado] = useState(false);
  const [salvando, setSalvando] = useState<"publicar" | "rascunho" | null>(null);
  const [confirmandoRascunho, setConfirmandoRascunho] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [verPrevia, setVerPrevia] = useState(false);
  const emCurso = useRef(false);
  const areaTexto = useRef<HTMLTextAreaElement>(null);

  const chaveDoRascunho = `podoposture_rascunho:${post?.id ?? "novo"}`;
  const alterado = JSON.stringify(campos) !== JSON.stringify(inicial);

  /* -------- rascunho guardado no navegador -------- */

  useEffect(() => {
    // Lido aqui, e nao na inicializacao do estado: localStorage nao existe no
    // servidor, e ler la quebraria a renderizacao.
    try {
      const guardado = localStorage.getItem(chaveDoRascunho);
      if (!guardado) return;
      const dados = JSON.parse(guardado) as DadosDoPost;
      if (JSON.stringify(dados) === JSON.stringify(inicial)) return;
      queueMicrotask(() => {
        setCampos(dados);
        setRecuperado(true);
      });
    } catch {
      // rascunho ilegivel nao pode impedir de escrever
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDoRascunho]);

  useEffect(() => {
    if (!alterado) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(chaveDoRascunho, JSON.stringify(campos));
      } catch {
        // sem espaco no navegador: o texto segue na tela, so nao ha copia
      }
    }, 600);
    return () => clearTimeout(id);
  }, [campos, alterado, chaveDoRascunho]);

  useEffect(() => {
    if (!alterado) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  /**
   * Sessao vencida: guarda o texto AGORA e deixa o recado para reabrir.
   *
   * O rascunho automatico espera 600 ms de pausa; quem digita a ultima frase e
   * clica em publicar logo em seguida perderia justamente essa frase.
   */
  function perderSessao() {
    if (alterado) {
      try {
        localStorage.setItem(chaveDoRascunho, JSON.stringify(campos));
      } catch {
        // sem espaco: o recado ainda reabre o texto salvo no servidor
      }
    }
    deixarRecado(armazemDaAba(), { tipo: "reabrir", id: post?.id ?? null });
    aoPerderSessao();
  }

  /* -------- pre-visualizacao -------- */

  // So converte com a previa aberta: a cada tecla, um texto longo passaria pelo
  // Markdown inteiro para uma previa que ninguem esta olhando.
  const previa = useMemo(
    () => (verPrevia ? markdownParaHtml(campos.corpo) : ""),
    [verPrevia, campos.corpo],
  );

  /* -------- escrever no texto -------- */

  function mudar<C extends keyof DadosDoPost>(campo: C, valor: DadosDoPost[C]) {
    const novos = { ...campos, [campo]: valor };
    setCampos(novos);
    // Aviso que ja esta na tela some assim que o campo fica certo. Aviso novo
    // so aparece ao sair do campo, nunca no meio da digitacao.
    if (erros[campo]) setErros((e) => errosComCampo(e, novos, campo));
  }

  // ui-ux-pro-max ux: Forms/Inline Validation — avisa ao sair do campo, e so
  // sobre ele
  function aoSairDo(campo: keyof DadosDoPost) {
    setErros((e) => errosComCampo(e, campos, campo));
  }

  function inserir(antes: string, depois = "", textoPadrao = "") {
    const area = areaTexto.current;
    if (!area) return;
    const ini = area.selectionStart;
    const fim = area.selectionEnd;
    const selecionado = campos.corpo.slice(ini, fim) || textoPadrao;
    const novo =
      campos.corpo.slice(0, ini) + antes + selecionado + depois + campos.corpo.slice(fim);
    setCampos((c) => ({ ...c, corpo: novo }));
    requestAnimationFrame(() => {
      area.focus();
      const pos = ini + antes.length + selecionado.length;
      area.setSelectionRange(pos, pos);
    });
  }

  function aoColar(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // texto simples: deixa o navegador colar do jeito normal
    e.preventDefault();
    const convertido = conversor.turndown(html).trim();
    const area = e.currentTarget;
    const ini = area.selectionStart;
    const fim = area.selectionEnd;
    setCampos((c) => ({
      ...c,
      corpo: c.corpo.slice(0, ini) + convertido + c.corpo.slice(fim),
    }));
    setSucesso("Texto colado com a formatação preservada.");
    requestAnimationFrame(() => {
      const pos = ini + convertido.length;
      area.focus();
      area.setSelectionRange(pos, pos);
    });
  }

  /* -------- imagem -------- */

  async function enviarImagem(arquivo: File, comoCapa: boolean) {
    setEnviandoImagem(true);
    setAviso(null);
    try {
      // Reduzir, converter (WebP, ou JPEG no Safari) e enviar mora em
      // src/lib/preparar-imagem.ts, compartilhado com a aba da pagina inicial.
      const { url } = await enviarAoServidor(arquivo, LARGURA_MAXIMA_DA_IMAGEM);
      if (comoCapa) {
        setCampos((c) => ({ ...c, capa: url }));
        setErros((e) => {
          const semCapa = { ...e };
          delete semCapa.capa;
          return semCapa;
        });
        setSucesso("Imagem de capa definida.");
      } else {
        inserir(`\n\n![descreva a imagem](${url})\n\n`);
        setSucesso("Imagem inserida. Troque o texto entre colchetes pela descrição dela.");
      }
    } catch (erro) {
      if (erro instanceof ErroAoEnviarImagem && erro.sessaoPerdida) {
        perderSessao();
        return;
      }
      setAviso(
        erro instanceof ErroAoEnviarImagem
          ? erro.message
          : "Não foi possível enviar a imagem. Tente de novo; se continuar, use uma foto menor.",
      );
    } finally {
      setEnviandoImagem(false);
    }
  }

  /* -------- salvar -------- */

  async function salvar(publicar: boolean) {
    if (emCurso.current) return;
    const dados = { ...campos, publicado: publicar };
    const encontrados = validarPost(dados);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      setConfirmandoRascunho(false);
      setAviso("Confira os campos marcados abaixo.");
      const primeiro = Object.keys(encontrados)[0];
      // Com a previa aberta a caixa do texto nao existe, e o foco nao teria
      // para onde ir.
      if (primeiro === "corpo") setVerPrevia(false);
      requestAnimationFrame(() => document.getElementById(`campo-${primeiro}`)?.focus());
      return;
    }

    // ui-ux-pro-max ux: Interaction/Confirmation Dialogs — o mesmo gesto de
    // apagar: o segundo clique confirma, e o botao diz o que vai acontecer.
    if (!publicar && rascunhoPrecisaConfirmar(post) && !confirmandoRascunho) {
      setConfirmandoRascunho(true);
      return;
    }
    setConfirmandoRascunho(false);

    emCurso.current = true;
    setSalvando(publicar ? "publicar" : "rascunho");
    setAviso(null);
    try {
      const resposta = await fetch(
        post ? `/api/painel/posts/${post.id}` : "/api/painel/posts",
        {
          method: post ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        },
      );

      if (resposta.status === 401 || resposta.status === 403) {
        perderSessao();
        return;
      }

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        if (corpo?.erros) setErros(corpo.erros);
        setAviso(mensagemDeFalhaAoSalvar(resposta.status, corpo?.erro));
        return;
      }

      try {
        localStorage.removeItem(chaveDoRascunho);
      } catch {
        /* nada a fazer */
      }
      deixarRecado(armazemDaAba(), {
        tipo: "salvo",
        mensagem: mensagemAoSalvar(publicar, post?.publicado ?? false),
      });
      aoSalvar();
    } catch {
      setAviso("Sem conexão com o servidor. Seu texto continua guardado aqui; tente de novo quando a internet voltar.");
    } finally {
      emCurso.current = false;
      setSalvando(null);
    }
  }

  const rotulo = "block text-[0.9375rem] font-medium text-ink-strong";
  const entrada =
    "mt-2 w-full min-h-[44px] rounded-md border-[1.5px] border-rule bg-paper px-4 py-2.5 text-[1.0625rem] text-ink outline-none focus:border-accent";
  const erroDoCampo = "mt-2 text-[0.875rem] text-[#8c2f2f]";

  return (
    <div className="mx-auto max-w-[52rem] px-6 py-12 lg:py-16">
      <button onClick={aoCancelar} className="sublinha min-h-[44px] text-[0.9375rem] text-accent">
        ← Voltar para a lista
      </button>

      <h1 className="mt-6 font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong">
        {post ? "Editar texto" : "Escrever texto"}
      </h1>

      {recuperado && (
        <p className="mt-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
          Recuperamos o que você estava escrevendo da última vez neste navegador.
        </p>
      )}

      {/* ui-ux-pro-max ux: Accessibility/Error Messages */}
      {aviso && (
        <p role="alert" className="mt-6 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] text-[#8c2f2f]">
          {aviso}
        </p>
      )}
      {/* ui-ux-pro-max ux: Feedback/Confirmation Messages */}
      {sucesso && (
        <p role="status" className="mt-6 rounded-md bg-surface px-4 py-3 text-[0.9375rem] text-ink">
          {sucesso}
        </p>
      )}

      <div className="mt-10 space-y-8">
        <div>
          <label htmlFor="campo-titulo" className={rotulo}>
            Título
          </label>
          <input
            id="campo-titulo"
            value={campos.titulo}
            maxLength={LIMITES_POST.titulo}
            onChange={(e) => mudar("titulo", e.target.value)}
            onBlur={() => aoSairDo("titulo")}
            aria-invalid={erros.titulo ? true : undefined}
            aria-describedby={erros.titulo ? "erro-titulo" : undefined}
            className={entrada}
          />
          {erros.titulo && (
            <p id="erro-titulo" role="alert" className={erroDoCampo}>
              {erros.titulo}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="campo-resumo" className={rotulo}>
            Resumo <span className="font-normal text-muted">(opcional)</span>
          </label>
          <p className="mt-1 text-[0.875rem] text-muted">
            É o trecho que aparece na lista do blog e no Google. Se deixar em branco, usamos
            o começo do texto.
          </p>
          <textarea
            id="campo-resumo"
            value={campos.resumo}
            maxLength={LIMITES_POST.resumo}
            rows={2}
            onChange={(e) => mudar("resumo", e.target.value)}
            onBlur={() => aoSairDo("resumo")}
            aria-invalid={erros.resumo ? true : undefined}
            aria-describedby={erros.resumo ? "erro-resumo" : undefined}
            className={entrada}
          />
          {erros.resumo && (
            <p id="erro-resumo" role="alert" className={erroDoCampo}>
              {erros.resumo}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="campo-categoria" className={rotulo}>
            Tema
          </label>
          <select
            id="campo-categoria"
            value={campos.categoria}
            onChange={(e) => mudar("categoria", e.target.value)}
            onBlur={() => aoSairDo("categoria")}
            aria-invalid={erros.categoria ? true : undefined}
            aria-describedby={erros.categoria ? "erro-categoria" : undefined}
            className={entrada}
          >
            {CATEGORIAS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {erros.categoria && (
            <p id="erro-categoria" role="alert" className={erroDoCampo}>
              {erros.categoria}
            </p>
          )}
        </div>

        <div>
          <span className={rotulo}>Imagem de capa <span className="font-normal text-muted">(opcional)</span></span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent">
              {campos.capa ? "Trocar capa" : "Escolher capa"}
              <input
                id="campo-capa"
                type="file"
                accept="image/*"
                className="sr-only"
                aria-describedby={erros.capa ? "erro-capa" : undefined}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviarImagem(f, true);
                  e.target.value = "";
                }}
              />
            </label>
            {campos.capa && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={campos.capa} alt="" className="h-16 w-auto rounded-md border border-rule" />
                <button
                  onClick={() => mudar("capa", "")}
                  className="min-h-[44px] text-[0.9375rem] text-muted hover:text-[#8c2f2f]"
                >
                  Remover
                </button>
              </>
            )}
          </div>
          {erros.capa && (
            <p id="erro-capa" role="alert" className={erroDoCampo}>
              {erros.capa}
            </p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="campo-corpo" className={rotulo}>
              Texto
            </label>
            <button
              onClick={() => setVerPrevia((v) => !v)}
              className="sublinha min-h-[44px] text-[0.9375rem] text-accent"
            >
              {verPrevia ? "Voltar a escrever" : "Ver como vai ficar"}
            </button>
          </div>

          <p className="mt-1 text-[0.875rem] leading-[1.6] text-muted">
            Pode colar direto do Word — negrito, títulos e listas vêm junto.
          </p>

          {!verPrevia && (
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Escritos um a um, e nao por map sobre um array montado aqui:
                  o compilador do React nao consegue provar que closures
                  criados na renderizacao so tocam o ref dentro do handler. */}
              <button onClick={() => inserir("**", "**", "texto")} className={BOTAO_FORMATO}>
                Negrito
              </button>
              <button onClick={() => inserir("_", "_", "texto")} className={BOTAO_FORMATO}>
                Itálico
              </button>
              <button onClick={() => inserir("\n## ", "", "Título da seção")} className={BOTAO_FORMATO}>
                Título
              </button>
              <button onClick={() => inserir("\n- ", "", "item")} className={BOTAO_FORMATO}>
                Lista
              </button>
              <button onClick={() => inserir("\n> ", "", "citação")} className={BOTAO_FORMATO}>
                Citação
              </button>
              <label className="inline-flex min-h-[36px] cursor-pointer items-center rounded-md border border-rule px-3 text-[0.875rem] text-ink hover:border-accent hover:text-accent">
                {enviandoImagem ? "Enviando…" : "Imagem"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={enviandoImagem}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void enviarImagem(f, false);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {verPrevia ? (
            campos.corpo.trim() ? (
              // O mesmo componente da pagina publicada (home/f/[slug]). Uma
              // previa com estilo proprio mostraria outra coisa, e ela publicaria
              // confiando no que nao vai ao ar.
              <div className="mt-4 overflow-hidden rounded-lg border border-rule bg-paper">
                <SecoesDeConteudo html={previa} tipo="post" />
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-rule bg-surface px-6 py-10 text-center text-[1.0625rem] leading-[1.7] text-muted">
                Escreva o texto para ver como ele vai ficar.
              </p>
            )
          ) : (
            <textarea
              id="campo-corpo"
              ref={areaTexto}
              value={campos.corpo}
              rows={18}
              onChange={(e) => mudar("corpo", e.target.value)}
              onPaste={aoColar}
              onBlur={() => aoSairDo("corpo")}
              aria-invalid={erros.corpo ? true : undefined}
              aria-describedby={erros.corpo ? "erro-corpo" : undefined}
              className="mt-4 w-full rounded-md border-[1.5px] border-rule bg-paper p-4 text-[1.0625rem] leading-[1.7] text-ink outline-none focus:border-accent"
            />
          )}
          {erros.corpo && (
            <p id="erro-corpo" role="alert" className={erroDoCampo}>
              {erros.corpo}
            </p>
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-rule pt-8">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => void salvar(true)}
            disabled={salvando !== null}
            className="min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50"
          >
            {salvando === "publicar" ? "Publicando…" : "Publicar no site"}
          </button>
          <button
            onClick={() => void salvar(false)}
            onBlur={() => setConfirmandoRascunho(false)}
            disabled={salvando !== null}
            aria-describedby={confirmandoRascunho ? "aviso-rascunho" : undefined}
            className={`min-h-[48px] rounded-md border-[1.5px] px-6 text-[0.9375rem] disabled:opacity-50 ${
              confirmandoRascunho
                ? "border-[#8c2f2f] text-[#8c2f2f]"
                : "border-accent/45 text-accent hover:border-accent"
            }`}
          >
            {salvando === "rascunho"
              ? "Guardando…"
              : confirmandoRascunho
                ? "Tirar do site e guardar"
                : "Guardar como rascunho"}
          </button>
          <button onClick={aoCancelar} className="min-h-[48px] px-2 text-[0.9375rem] text-muted">
            Cancelar
          </button>
        </div>

        {/* Abaixo dos botoes, e nao acima: aviso que empurra o botao para baixo
            faz o segundo clique cair em outro lugar. */}
        {confirmandoRascunho && (
          <p
            id="aviso-rascunho"
            role="alert"
            className="mt-4 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]"
          >
            Este texto está no site. Guardar como rascunho tira ele do ar até você publicar de
            novo. Para confirmar, clique outra vez em “Tirar do site e guardar”.
          </p>
        )}
      </div>
    </div>
  );
}
