"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TurndownService from "turndown";

import { markdownParaHtml } from "@/lib/markdown";
import {
  CATEGORIAS,
  LIMITES_POST,
  validarPost,
  type DadosDoPost,
  type ErrosPost,
  type PostDoPainel,
} from "@/lib/painel-tipos";
import { ErroAoEnviarImagem, enviarImagem as enviarAoServidor } from "@/lib/preparar-imagem";

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
 *    vencer — uma mensagem que diz com todas as letras que o texto continua ali.
 * 3. **Ela precisa ver como vai ficar.** A pre-visualizacao usa a MESMA funcao
 *    que a pagina publica e a mesma classe de tipografia, entao o que ela ve e
 *    o que o visitante vai ver.
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
  const [salvando, setSalvando] = useState(false);
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

  /* -------- pre-visualizacao -------- */

  const previa = useMemo(() => markdownParaHtml(campos.corpo), [campos.corpo]);

  /* -------- escrever no texto -------- */

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
        setSucesso("Imagem de capa definida.");
      } else {
        inserir(`\n\n![descreva a imagem](${url})\n\n`);
        setSucesso("Imagem inserida. Troque o texto entre colchetes pela descrição dela.");
      }
    } catch (erro) {
      if (erro instanceof ErroAoEnviarImagem && erro.sessaoPerdida) {
        setAviso("Sua sessão expirou. O texto continua guardado neste navegador.");
        aoPerderSessao();
        return;
      }
      setAviso(
        erro instanceof ErroAoEnviarImagem ? erro.message : "Não foi possível enviar a imagem.",
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
      setAviso("Confira os campos marcados abaixo.");
      const primeiro = Object.keys(encontrados)[0];
      document.getElementById(`campo-${primeiro}`)?.focus();
      return;
    }

    emCurso.current = true;
    setSalvando(true);
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
        setAviso(
          "Sua sessão expirou. Seu texto está guardado neste navegador — entre de novo e ele volta.",
        );
        aoPerderSessao();
        return;
      }

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        if (corpo?.erros) setErros(corpo.erros);
        setAviso(corpo?.erro ?? "Não foi possível salvar.");
        return;
      }

      try {
        localStorage.removeItem(chaveDoRascunho);
      } catch {
        /* nada a fazer */
      }
      aoSalvar();
    } catch {
      setAviso("Sem conexão com o servidor. Seu texto continua guardado aqui.");
    } finally {
      emCurso.current = false;
      setSalvando(false);
    }
  }

  const rotulo = "block text-[0.9375rem] font-medium text-ink-strong";
  const entrada =
    "mt-2 w-full min-h-[44px] rounded-md border-[1.5px] border-rule bg-paper px-4 py-2.5 text-[1.0625rem] text-ink outline-none focus:border-accent";

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
            onChange={(e) => setCampos((c) => ({ ...c, titulo: e.target.value }))}
            // ui-ux-pro-max ux: Forms/Inline Validation — avisa ao sair do campo
            onBlur={() => setErros(validarPost(campos))}
            aria-invalid={erros.titulo ? true : undefined}
            className={entrada}
          />
          {erros.titulo && (
            <p role="alert" className="mt-2 text-[0.875rem] text-[#8c2f2f]">
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
            onChange={(e) => setCampos((c) => ({ ...c, resumo: e.target.value }))}
            className={entrada}
          />
        </div>

        <div>
          <label htmlFor="campo-categoria" className={rotulo}>
            Tema
          </label>
          <select
            id="campo-categoria"
            value={campos.categoria}
            onChange={(e) => setCampos((c) => ({ ...c, categoria: e.target.value }))}
            className={entrada}
          >
            {CATEGORIAS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={rotulo}>Imagem de capa <span className="font-normal text-muted">(opcional)</span></span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent">
              {campos.capa ? "Trocar capa" : "Escolher capa"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
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
                  onClick={() => setCampos((c) => ({ ...c, capa: "" }))}
                  className="min-h-[44px] text-[0.9375rem] text-muted hover:text-[#8c2f2f]"
                >
                  Remover
                </button>
              </>
            )}
          </div>
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
            <div className="mt-4 rounded-lg border border-rule bg-paper p-6 lg:p-10">
              <div className="prosa" dangerouslySetInnerHTML={{ __html: previa }} />
            </div>
          ) : (
            <textarea
              id="campo-corpo"
              ref={areaTexto}
              value={campos.corpo}
              rows={18}
              onChange={(e) => setCampos((c) => ({ ...c, corpo: e.target.value }))}
              onPaste={aoColar}
              onBlur={() => setErros(validarPost(campos))}
              aria-invalid={erros.corpo ? true : undefined}
              className="mt-4 w-full rounded-md border-[1.5px] border-rule bg-paper p-4 text-[1.0625rem] leading-[1.7] text-ink outline-none focus:border-accent"
            />
          )}
          {erros.corpo && (
            <p role="alert" className="mt-2 text-[0.875rem] text-[#8c2f2f]">
              {erros.corpo}
            </p>
          )}
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-rule pt-8">
        <button
          onClick={() => void salvar(true)}
          disabled={salvando}
          className="min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Publicar no site"}
        </button>
        <button
          onClick={() => void salvar(false)}
          disabled={salvando}
          className="min-h-[48px] rounded-md border-[1.5px] border-accent/45 px-6 text-[0.9375rem] text-accent hover:border-accent disabled:opacity-50"
        >
          Guardar como rascunho
        </button>
        <button onClick={aoCancelar} className="min-h-[48px] px-2 text-[0.9375rem] text-muted">
          Cancelar
        </button>
      </div>
    </div>
  );
}
