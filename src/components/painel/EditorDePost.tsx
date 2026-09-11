"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TurndownService from "turndown";

import { SecoesDeConteudo } from "@/components/secoes-de-conteudo";
import { chaveDaCopia, decidirCopia, escreverCopia, lerCopia, type CopiaDoPost } from "@/lib/copia-do-post";
import { markdownParaHtml, resumoAutomatico } from "@/lib/markdown";
import {
  CATEGORIAS,
  LIMITES_POST,
  errosComCampo,
  mensagemAoSalvar,
  mensagemDeFalhaAoSalvar,
  rascunhoPrecisaConfirmar,
  rotuloDaData,
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
 * 2. **Nada do que ela escreveu pode sumir — e nada que ela desistiu pode
 *    voltar.** Copia guardada no navegador enquanto digita, aviso antes de
 *    fechar a aba, e — se a sessao vencer — o texto e guardado na hora e
 *    reaberto depois da senha (ver `recado-do-editor.ts`). A copia sabe de que
 *    versao do texto nasceu (`copia-do-post.ts`): se o texto mudou depois em
 *    outro aparelho, o editor pergunta em vez de passar por cima. "Cancelar"
 *    com alteracao pede o segundo clique e apaga a copia, senao o que ela
 *    cancelou voltava sozinho semanas depois, pronto para ir ao ar.
 * 3. **Ela precisa ver como vai ficar.** A pre-visualizacao usa o MESMO
 *    componente e a mesma conversao de Markdown que a pagina publicada
 *    (`SecoesDeConteudo`, tipo post), com o topo do post — data, tema, titulo,
 *    resumo e capa — nas mesmas classes da pagina, entao o que ela ve e o que o
 *    visitante vai ver.
 */

// 44px: o mesmo alvo minimo do resto do painel. Com 36px, no tablet, quem
// mirava "Itálico" acertava "Negrito" ao lado.
const BOTAO_FORMATO =
  "min-h-[44px] rounded-md border border-rule px-3 text-[0.875rem] text-ink hover:border-accent hover:text-accent disabled:opacity-50";

/** O campo de arquivo fica escondido dentro do rotulo; o foco de teclado aparece no rotulo. */
const FOCO_NO_ROTULO =
  "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent";

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

function armazemDoNavegador(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Navegador com armazenamento bloqueado lanca ja no acesso a propriedade.
    return null;
  }
}

/** Id do texto novo, gerado ao abrir: repetir o envio nao cria um segundo texto. */
function novoId(): string | null {
  try {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null;
  } catch {
    return null;
  }
}

function ids(...lista: (string | false | null | undefined)[]): string | undefined {
  const juntos = lista.filter(Boolean).join(" ");
  return juntos || undefined;
}

type Saida = "topo" | "fim";

export function EditorDePost({
  post,
  semBanco,
  aoSalvar,
  aoCancelar,
  aoPerderSessao,
}: {
  post: PostDoPainel | null;
  semBanco: boolean;
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
  const versaoDoServidor = post?.atualizadoEm ?? null;
  const chaveDoRascunho = chaveDaCopia(post?.id);

  // Lido na inicializacao, e nao num efeito: o editor so monta depois de um
  // clique no painel, nunca no servidor, e ler aqui evita mostrar o texto salvo
  // por um instante e trocar pela copia em seguida.
  const [inicio] = useState(() => {
    let copia: CopiaDoPost | null = null;
    try {
      copia = lerCopia(armazemDoNavegador()?.getItem(chaveDoRascunho) ?? null);
    } catch {
      // copia ilegivel nao pode impedir de escrever
    }
    return decidirCopia(copia, inicial, versaoDoServidor);
  });
  const [idDoNovo] = useState(() => (post ? null : novoId()));
  const [hoje] = useState(() => new Date().toISOString());

  const [campos, setCampos] = useState<DadosDoPost>(inicio.tipo === "aplicar" ? inicio.copia.dados : inicial);
  const [recuperado, setRecuperado] = useState(inicio.tipo === "aplicar");
  /** Copia de uma versao anterior do texto, esperando ela decidir. */
  const [pendente, setPendente] = useState<CopiaDoPost | null>(inicio.tipo === "perguntar" ? inicio.copia : null);
  const [erros, setErros] = useState<ErrosPost>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<"publicar" | "rascunho" | null>(null);
  const [confirmandoRascunho, setConfirmandoRascunho] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState<Saida | null>(null);
  const [enviando, setEnviando] = useState<"capa" | "corpo" | null>(null);
  const [verPrevia, setVerPrevia] = useState(false);
  const emCurso = useRef(false);
  const enviandoAgora = useRef(false);
  const areaTexto = useRef<HTMLTextAreaElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  const alterado = JSON.stringify(campos) !== JSON.stringify(inicial);
  const travado = salvando !== null;

  useEffect(() => {
    // O editor substitui a lista inteira: sem mover o foco, quem usa teclado
    // ficava no vazio e o leitor de tela nao anunciava a troca de tela.
    titulo.current?.focus();
  }, []);

  /* -------- copia guardada no navegador -------- */

  useEffect(() => {
    // Com uma copia antiga esperando decisao, nada e gravado nem apagado.
    if (pendente) return;
    const armazem = armazemDoNavegador();
    if (!alterado) {
      // Voltou a ser igual ao salvo: a copia nao guarda mais nada que importe,
      // e uma copia velha esquecida e o que voltaria sozinho depois.
      try {
        armazem?.removeItem(chaveDoRascunho);
      } catch {
        /* nada a fazer */
      }
      return;
    }
    const id = setTimeout(() => {
      try {
        armazem?.setItem(chaveDoRascunho, escreverCopia(campos, versaoDoServidor));
      } catch {
        // sem espaco no navegador: o texto segue na tela, so nao ha copia
      }
    }, 600);
    return () => clearTimeout(id);
  }, [campos, alterado, chaveDoRascunho, pendente, versaoDoServidor]);

  useEffect(() => {
    if (!alterado) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  function apagarCopia() {
    try {
      armazemDoNavegador()?.removeItem(chaveDoRascunho);
    } catch {
      /* nada a fazer */
    }
  }

  function descartarCopia() {
    apagarCopia();
    setCampos(inicial);
    setRecuperado(false);
    setPendente(null);
    setErros({});
    setSucesso(
      post
        ? "A versão guardada neste navegador foi descartada. O editor mostra o que está salvo."
        : "A versão guardada neste navegador foi descartada.",
    );
  }

  function usarCopiaPendente() {
    if (!pendente) return;
    setCampos(pendente.dados);
    setPendente(null);
    setRecuperado(true);
    setSucesso(null);
  }

  /**
   * Sessao vencida: guarda o texto AGORA e deixa o recado para reabrir.
   *
   * O rascunho automatico espera 600 ms de pausa; quem digita a ultima frase e
   * clica em publicar logo em seguida perderia justamente essa frase.
   */
  function perderSessao() {
    if (alterado && !pendente) {
      try {
        armazemDoNavegador()?.setItem(chaveDoRascunho, escreverCopia(campos, versaoDoServidor));
      } catch {
        // sem espaco: o recado ainda reabre o texto salvo no servidor
      }
    }
    deixarRecado(armazemDaAba(), { tipo: "reabrir", id: post?.id ?? null });
    aoPerderSessao();
  }

  /** Voltar ou cancelar: com alteracao, o segundo clique confirma e a copia vai junto. */
  function sair(onde: Saida) {
    if (alterado && !pendente && confirmandoSaida !== onde) {
      setConfirmandoSaida(onde);
      return;
    }
    // A copia pendente e de outra sessao, e ela ainda nao decidiu: fica.
    if (!pendente) apagarCopia();
    aoCancelar();
  }

  /* -------- pre-visualizacao -------- */

  // So converte com a previa aberta: a cada tecla, um texto longo passaria pelo
  // Markdown inteiro para uma previa que ninguem esta olhando.
  const previa = useMemo(
    () => (verPrevia ? markdownParaHtml(campos.corpo) : ""),
    [verPrevia, campos.corpo],
  );
  const resumoDaPrevia = useMemo(
    () => (verPrevia ? campos.resumo || resumoAutomatico(campos.corpo) : ""),
    [verPrevia, campos.resumo, campos.corpo],
  );

  /* -------- escrever no texto -------- */

  function mudar<C extends keyof DadosDoPost>(campo: C, valor: DadosDoPost[C]) {
    const novos = { ...campos, [campo]: valor };
    setCampos(novos);
    setConfirmandoSaida(null);
    // Escrever por cima de uma copia antiga e decidir por ela: a copia deste
    // navegador passa a ser o que esta na tela.
    if (pendente) setPendente(null);
    // Aviso que ja esta na tela some assim que o campo fica certo. Aviso novo
    // so aparece ao sair do campo, nunca no meio da digitacao.
    if (erros[campo]) setErros((e) => errosComCampo(e, novos, campo));
  }

  // ui-ux-pro-max ux: Forms/Inline Validation — avisa ao sair do campo, e so
  // sobre ele
  function aoSairDo(campo: keyof DadosDoPost) {
    setErros((e) => errosComCampo(e, campos, campo));
  }

  /**
   * Insere no cursor. O texto e montado DENTRO da atualizacao, a partir do
   * corpo de agora: a imagem chega segundos depois do clique, e montar a partir
   * do corpo daquele clique apagava o que ela escreveu enquanto a imagem subia.
   * Devolve false quando a caixa de texto nao esta na tela (previa aberta).
   */
  function inserir(antes: string, depois = "", textoPadrao = ""): boolean {
    const area = areaTexto.current;
    if (!area) return false;
    const inicioNaTela = area.selectionStart;
    const fimNaTela = area.selectionEnd;
    let posicao = 0;
    setCampos((c) => {
      const ini = Math.min(inicioNaTela, c.corpo.length);
      const fim = Math.min(Math.max(fimNaTela, ini), c.corpo.length);
      const selecionado = c.corpo.slice(ini, fim) || textoPadrao;
      posicao = ini + antes.length + selecionado.length;
      return { ...c, corpo: c.corpo.slice(0, ini) + antes + selecionado + depois + c.corpo.slice(fim) };
    });
    if (pendente) setPendente(null);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(posicao, posicao);
    });
    return true;
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
    if (pendente) setPendente(null);
    setSucesso("Texto colado com a formatação preservada.");
    requestAnimationFrame(() => {
      const pos = ini + convertido.length;
      area.focus();
      area.setSelectionRange(pos, pos);
    });
  }

  /* -------- imagem -------- */

  async function enviarImagem(arquivo: File, comoCapa: boolean) {
    // Uma imagem por vez: escolher de novo no meio do envio disparava um
    // segundo envio, e a capa ficava com a que terminasse por ultimo.
    if (enviandoAgora.current) return;
    enviandoAgora.current = true;
    setEnviando(comoCapa ? "capa" : "corpo");
    setAviso(null);
    setSucesso(null);
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
        const trecho = `\n\n![descreva a imagem](${url})\n\n`;
        // Com a previa aberta a caixa nao existe: a imagem vai para o fim.
        if (!inserir(trecho)) setCampos((c) => ({ ...c, corpo: c.corpo + trecho }));
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
          : "Não foi possível enviar a imagem. O que você escreveu continua aqui; tente de novo e, se continuar, use uma foto menor.",
      );
    } finally {
      enviandoAgora.current = false;
      setEnviando(null);
    }
  }

  /* -------- salvar -------- */

  async function salvar(publicar: boolean) {
    if (emCurso.current || enviandoAgora.current) return;
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
    setConfirmandoSaida(null);

    emCurso.current = true;
    setSalvando(publicar ? "publicar" : "rascunho");
    setAviso(null);
    try {
      const resposta = await fetch(
        post ? `/api/painel/posts/${post.id}` : "/api/painel/posts",
        {
          method: post ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(post || !idDoNovo ? dados : { ...dados, id: idDoNovo }),
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

      apagarCopia();
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
    "mt-2 w-full min-h-[44px] rounded-md border-[1.5px] border-rule bg-paper px-4 py-2.5 text-[1.0625rem] text-ink outline-none focus:border-accent read-only:bg-surface";
  const erroDoCampo = "mt-2 text-[0.875rem] text-[#8c2f2f]";
  const alerta = "rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]";
  const nota = "rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink";

  const rotuloDaSaida = (onde: Saida) =>
    onde === "topo" ? "← Descartar alterações e voltar" : "Descartar alterações e sair";
  const explicacaoDaSaida = (onde: Saida) =>
    `Você mudou este texto e não salvou. Sair agora descarta essas mudanças, inclusive a cópia guardada neste navegador. Para confirmar, clique outra vez em “${rotuloDaSaida(onde).replace("← ", "")}”.`;

  return (
    <div className="mx-auto max-w-[52rem] px-6 py-12 lg:py-16">
      <button
        type="button"
        onClick={() => sair("topo")}
        onBlur={() => setConfirmandoSaida((c) => (c === "topo" ? null : c))}
        aria-describedby={confirmandoSaida === "topo" ? "aviso-saida-topo" : undefined}
        className={`min-h-[44px] text-[0.9375rem] ${
          confirmandoSaida === "topo" ? "rounded-md border-[1.5px] border-[#8c2f2f] px-3 text-[#8c2f2f]" : "sublinha text-accent"
        }`}
      >
        {confirmandoSaida === "topo" ? rotuloDaSaida("topo") : "← Voltar para a lista"}
      </button>
      {confirmandoSaida === "topo" && (
        <p id="aviso-saida-topo" role="alert" className={`mt-3 ${alerta}`}>
          {explicacaoDaSaida("topo")}
        </p>
      )}

      <h1
        ref={titulo}
        tabIndex={-1}
        className="mt-6 font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong outline-none"
      >
        {post ? "Editar texto" : "Escrever texto"}
      </h1>

      {semBanco && (
        <p className={`mt-6 ${nota}`}>
          O banco de dados ainda não está ligado neste servidor: por enquanto dá para escrever, mas não para
          guardar nem publicar. O que você escrever fica guardado neste navegador. Avise quem cuida do site.
        </p>
      )}

      {recuperado && (
        <div role="status" className={`mt-6 ${nota}`}>
          <p>Recuperamos o que você estava escrevendo da última vez neste navegador.</p>
          <button
            type="button"
            onClick={descartarCopia}
            className="sublinha mt-1 min-h-[44px] text-[0.9375rem] text-accent"
          >
            {post ? "Descartar e usar o que está salvo" : "Descartar e começar do zero"}
          </button>
        </div>
      )}

      {pendente && (
        <div role="status" className={`mt-6 ${nota}`}>
          <p>
            Há uma versão deste texto guardada neste navegador
            {pendente.guardadaEm ? ` em ${rotuloDaData(pendente.guardadaEm)}` : ""}, mas o texto foi salvo
            depois disso, talvez em outro aparelho. Abaixo está a versão salva. Se começar a escrever, a versão
            deste navegador é substituída.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-6">
            <button
              type="button"
              onClick={usarCopiaPendente}
              className="sublinha min-h-[44px] text-[0.9375rem] text-accent"
            >
              Usar a versão deste navegador
            </button>
            <button
              type="button"
              onClick={descartarCopia}
              className="sublinha min-h-[44px] text-[0.9375rem] text-muted hover:text-[#8c2f2f]"
            >
              Descartar a versão deste navegador
            </button>
          </div>
        </div>
      )}

      {/* ui-ux-pro-max ux: Accessibility/Error Messages */}
      {aviso && (
        <p role="alert" className={`mt-6 ${alerta}`}>
          {aviso}
        </p>
      )}
      {/* ui-ux-pro-max ux: Feedback/Confirmation Messages — regiao sempre na
          pagina: aviso que nasce ja com texto nem sempre e lido pelo leitor de tela */}
      <p role="status" className={sucesso ? "mt-6 rounded-md bg-surface px-4 py-3 text-[0.9375rem] text-ink" : "sr-only"}>
        {sucesso ?? ""}
      </p>

      <div className="mt-10 space-y-8">
        <div>
          <label htmlFor="campo-titulo" className={rotulo}>
            Título
          </label>
          <input
            id="campo-titulo"
            value={campos.titulo}
            maxLength={LIMITES_POST.titulo}
            readOnly={travado}
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
          <p id="ajuda-resumo" className="mt-1 text-[0.875rem] text-muted">
            É o trecho que aparece na lista do blog e no Google. Se deixar em branco, usamos
            o começo do texto.
          </p>
          <textarea
            id="campo-resumo"
            value={campos.resumo}
            maxLength={LIMITES_POST.resumo}
            rows={2}
            readOnly={travado}
            onChange={(e) => mudar("resumo", e.target.value)}
            onBlur={() => aoSairDo("resumo")}
            aria-invalid={erros.resumo ? true : undefined}
            aria-describedby={ids("ajuda-resumo", erros.resumo && "erro-resumo")}
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
            disabled={travado}
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
            <label
              className={`inline-flex min-h-[44px] items-center rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent ${FOCO_NO_ROTULO} ${
                enviando !== null || travado ? "cursor-default opacity-60" : "cursor-pointer"
              }`}
            >
              {enviando === "capa" ? "Enviando…" : campos.capa ? "Trocar capa" : "Escolher capa"}
              <input
                id="campo-capa"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={enviando !== null || travado}
                aria-describedby={ids(enviando === "capa" && "status-capa", erros.capa && "erro-capa")}
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
                  type="button"
                  onClick={() => mudar("capa", "")}
                  disabled={enviando !== null || travado}
                  className="min-h-[44px] text-[0.9375rem] text-muted hover:text-[#8c2f2f] disabled:opacity-50"
                >
                  Remover
                </button>
              </>
            )}
          </div>
          {enviando === "capa" && (
            <p id="status-capa" role="status" className="mt-2 text-[0.875rem] text-muted">
              Enviando a imagem de capa. Pode levar alguns segundos.
            </p>
          )}
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
              type="button"
              onClick={() => setVerPrevia((v) => !v)}
              className="sublinha min-h-[44px] text-[0.9375rem] text-accent"
            >
              {verPrevia ? "Voltar a escrever" : "Ver como vai ficar"}
            </button>
          </div>

          <p id="ajuda-corpo" className="mt-1 text-[0.875rem] leading-[1.6] text-muted">
            Pode colar direto do Word — negrito, títulos e listas vêm junto.
          </p>

          {!verPrevia && (
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Escritos um a um, e nao por map sobre um array montado aqui:
                  o compilador do React nao consegue provar que closures
                  criados na renderizacao so tocam o ref dentro do handler. */}
              <button type="button" onClick={() => inserir("**", "**", "texto")} disabled={travado} className={BOTAO_FORMATO}>
                Negrito
              </button>
              <button type="button" onClick={() => inserir("_", "_", "texto")} disabled={travado} className={BOTAO_FORMATO}>
                Itálico
              </button>
              <button type="button" onClick={() => inserir("\n## ", "", "Título da seção")} disabled={travado} className={BOTAO_FORMATO}>
                Título
              </button>
              <button type="button" onClick={() => inserir("\n- ", "", "item")} disabled={travado} className={BOTAO_FORMATO}>
                Lista
              </button>
              <button type="button" onClick={() => inserir("\n> ", "", "citação")} disabled={travado} className={BOTAO_FORMATO}>
                Citação
              </button>
              <label
                className={`inline-flex min-h-[44px] items-center rounded-md border border-rule px-3 text-[0.875rem] text-ink hover:border-accent hover:text-accent ${FOCO_NO_ROTULO} ${
                  enviando !== null || travado ? "cursor-default opacity-60" : "cursor-pointer"
                }`}
              >
                {enviando === "corpo" ? "Enviando…" : "Imagem"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={enviando !== null || travado}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void enviarImagem(f, false);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
          {/* Fora da barra: com a previa aberta a barra some, e o envio continua. */}
          {enviando === "corpo" && (
            <p role="status" className="mt-2 text-[0.875rem] text-muted">
              Enviando a imagem para o texto. Pode continuar escrevendo.
            </p>
          )}

          {verPrevia ? (
            // O mesmo componente da pagina publicada (home/f/[slug]) e o topo com
            // as mesmas classes da casca do post. Uma previa com estilo proprio
            // mostraria outra coisa, e ela publicaria confiando no que nao vai ao ar.
            <div className="mt-4 overflow-hidden rounded-lg border border-rule bg-paper">
              <div className="border-b border-rule bg-surface px-6 pt-10 pb-10 md:px-8">
                <p
                  className="mb-6 flex items-center gap-4 text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
                  style={{ fontFamily: "var(--mono)" }}
                >
                  <span>{rotuloDaData(post?.publicadoEm ?? hoje)}</span>
                  {campos.categoria && (
                    <>
                      <span aria-hidden="true" className="h-px w-8 bg-rule" />
                      <span>{campos.categoria}</span>
                    </>
                  )}
                </p>
                <p className="max-w-[24ch] [overflow-wrap:anywhere] font-display text-[clamp(2rem,1.35rem+3.25vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink-strong max-[359px]:text-[1.625rem]">
                  {campos.titulo || "Título do texto"}
                </p>
                {resumoDaPrevia && (
                  <p className="mt-6 max-w-[62ch] text-[1.0625rem] leading-[1.7] text-muted md:mt-7 md:text-[1.125rem]">
                    {resumoDaPrevia}
                  </p>
                )}
                {campos.capa && (
                  <figure className="relative mx-auto mt-12 max-w-[960px] rounded-lg border border-rule bg-paper p-2 shadow-plate">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={campos.capa} alt="" className="h-full w-full object-cover saturate-[0.9]" />
                    </div>
                  </figure>
                )}
              </div>
              {campos.corpo.trim() ? (
                <SecoesDeConteudo html={previa} tipo="post" />
              ) : (
                <p className="px-6 py-10 text-center text-[1.0625rem] leading-[1.7] text-muted">
                  Escreva o texto para ver como ele vai ficar.
                </p>
              )}
            </div>
          ) : (
            <textarea
              id="campo-corpo"
              ref={areaTexto}
              value={campos.corpo}
              rows={18}
              readOnly={travado}
              onChange={(e) => mudar("corpo", e.target.value)}
              onPaste={aoColar}
              onBlur={() => aoSairDo("corpo")}
              aria-invalid={erros.corpo ? true : undefined}
              aria-describedby={ids("ajuda-corpo", erros.corpo && "erro-corpo")}
              className="mt-4 w-full rounded-md border-[1.5px] border-rule bg-paper p-4 text-[1.0625rem] leading-[1.7] text-ink outline-none focus:border-accent read-only:bg-surface"
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
            type="button"
            onClick={() => void salvar(true)}
            disabled={salvando !== null || enviando !== null}
            aria-describedby={enviando !== null ? "aviso-envio" : undefined}
            className="min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50"
          >
            {salvando === "publicar" ? "Publicando…" : "Publicar no site"}
          </button>
          <button
            type="button"
            onClick={() => void salvar(false)}
            onBlur={() => setConfirmandoRascunho(false)}
            disabled={salvando !== null || enviando !== null}
            aria-describedby={ids(confirmandoRascunho && "aviso-rascunho", enviando !== null && "aviso-envio")}
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
          <button
            type="button"
            onClick={() => sair("fim")}
            onBlur={() => setConfirmandoSaida((c) => (c === "fim" ? null : c))}
            disabled={salvando !== null}
            aria-describedby={confirmandoSaida === "fim" ? "aviso-saida-fim" : undefined}
            className={`min-h-[48px] px-2 text-[0.9375rem] disabled:opacity-50 ${
              confirmandoSaida === "fim" ? "rounded-md border-[1.5px] border-[#8c2f2f] px-4 text-[#8c2f2f]" : "text-muted"
            }`}
          >
            {confirmandoSaida === "fim" ? rotuloDaSaida("fim") : "Cancelar"}
          </button>
        </div>

        {enviando !== null && (
          <p id="aviso-envio" className="mt-3 text-[0.875rem] leading-[1.6] text-muted">
            Espere a imagem terminar de enviar para publicar ou guardar.
          </p>
        )}

        {/* Abaixo dos botoes, e nao acima: aviso que empurra o botao para baixo
            faz o segundo clique cair em outro lugar. */}
        {confirmandoRascunho && (
          <p id="aviso-rascunho" role="alert" className={`mt-4 ${alerta}`}>
            Este texto está no site. Guardar como rascunho tira ele do ar até você publicar de
            novo. Para confirmar, clique outra vez em “Tirar do site e guardar”.
          </p>
        )}
        {confirmandoSaida === "fim" && (
          <p id="aviso-saida-fim" role="alert" className={`mt-4 ${alerta}`}>
            {explicacaoDaSaida("fim")}
          </p>
        )}
      </div>
    </div>
  );
}
