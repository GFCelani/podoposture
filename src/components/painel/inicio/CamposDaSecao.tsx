"use client";

import { createContext, useContext, useState } from "react";

import type {
  Campo,
  CampoDestino,
  CampoEmail,
  CampoGrupo,
  CampoImagem,
  CampoLinhas,
  CampoLista,
  CampoNumero,
  CampoParagrafo,
  CampoTelefone,
  CampoTexto,
  CampoUrlRede,
  ChaveDeSecao,
  ErrosDeCampo,
  PaginaDeDestino,
} from "@/lib/conteudo-tipos";

import {
  campoParaEdicao,
  codificarDestino,
  decodificarDestino,
  ehObjeto,
  idDoCampo,
  mesmoValor,
  moverItem,
  removerItem,
  situacaoDoTamanho,
  textoDoValor,
  valorVazio,
} from "./edicao";

/**
 * Os campos do editor, gerados a partir de DESCRITORES: um renderizador por
 * tipo de campo, e nenhum formulario escrito a mao por secao.
 *
 * Gerado de proposito. Com 13 secoes escritas a mao, cada campo novo no
 * descritor exigiria lembrar de por o campo na tela, e o esquecimento so
 * apareceria como "o texto nao muda" no site.
 *
 * Cada campo le e grava pelo caminho ("botoes.0.rotulo"), o mesmo caminho em
 * que `validarSecao` devolve o erro: e isso que liga a mensagem ao campo certo.
 */

export type AcoesDoEditor = {
  chave: ChaveDeSecao;
  erros: ErrosDeCampo;
  destinos: readonly PaginaDeDestino[];
  slugs: ReadonlySet<string>;
  /** Um pedido ou envio em curso: os botoes que disparam outro ficam parados. */
  bloqueado: boolean;
  /** Caminho da foto sendo enviada, ou null. */
  enviandoEm: string | null;
  mudar: (caminho: string, valor: unknown) => void;
  sair: (caminho: string) => void;
  /** Troca que muda posicao ou tamanho de lista: os erros por indice deixam de valer. */
  reestruturar: (caminho: string, valor: unknown) => void;
  restaurar: (caminho: string, valor: unknown) => void;
  enviarFoto: (arquivo: File, caminho: string, campo: CampoImagem) => void;
};

export const ContextoDoEditor = createContext<AcoesDoEditor | null>(null);

function useEditor(): AcoesDoEditor {
  const editor = useContext(ContextoDoEditor);
  if (!editor) throw new Error("Campo do editor fora de ContextoDoEditor.");
  return editor;
}

const ROTULO = "block text-[0.9375rem] font-medium text-ink-strong";
const AJUDA = "mt-1 text-[0.875rem] leading-[1.6] text-muted";
const ENTRADA =
  "mt-2 w-full min-h-[44px] rounded-md border-[1.5px] border-rule bg-paper px-4 py-2.5 text-[1.0625rem] text-ink outline-none focus:border-accent aria-[invalid=true]:border-[#8c2f2f]";
const ERRO = "mt-2 text-[0.875rem] text-[#8c2f2f]";
const BOTAO_PEQUENO =
  "min-h-[44px] rounded-md border border-rule px-3 text-[0.875rem] text-ink hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink";

function comoTexto(valor: unknown): string {
  if (typeof valor === "string") return valor;
  return typeof valor === "number" ? String(valor) : "";
}

function ids(...lista: (string | null | undefined | false)[]): string | undefined {
  const juntos = lista.filter(Boolean).join(" ");
  return juntos || undefined;
}

/** Caixa alta o bastante para o texto caber sem rolar dentro dela. */
function linhasDoParagrafo(max: number): number {
  if (max <= 160) return 3;
  return max <= 320 ? 5 : 7;
}

/* ------------------------------------------------------------ roteamento */

type PropsDoCampo<C extends Campo = Campo> = {
  campo: C;
  caminho: string;
  valor: unknown;
  /**
   * Valor do texto original no mesmo lugar. Dentro de lista, o item da mesma
   * posicao — so enquanto a lista tem o tamanho do original; depois de somar ou
   * tirar item, a posicao ja nao aponta para o mesmo item e fica undefined.
   */
  original?: unknown;
  rotulo: string;
};

export function CampoDoEditor({
  campo,
  caminho,
  valor,
  original,
  rotulo,
  nivel = 0,
}: Omit<PropsDoCampo, "rotulo"> & { rotulo?: string; nivel?: number }) {
  const props = { caminho, valor, original, rotulo: rotulo ?? campo.rotulo };
  switch (campo.tipo) {
    case "texto":
    case "paragrafo":
    case "email":
    case "telefone":
    case "url-rede":
    case "numero":
      return <CampoDeTexto campo={campo} {...props} />;
    case "linhas":
      return <CampoDeLinhas campo={campo} {...props} />;
    case "lista":
      return <CampoDeLista campo={campo} {...props} />;
    case "grupo":
      return <CampoDeGrupo campo={campo} nivel={nivel} {...props} />;
    case "imagem":
      return <CampoDeImagem campo={campo} {...props} />;
    case "destino":
      return <CampoDeDestino campo={campo} {...props} />;
  }
}

/* ------------------------------------------------------------ pecas comuns */

function MensagemDeErro({ id, erro }: { id: string; erro: string | undefined }) {
  if (!erro) return null;
  return (
    <p id={id} role="alert" className={ERRO}>
      {erro}
    </p>
  );
}

/**
 * Contador que avisa ANTES de passar (JOURNEY: "avisa antes de passar, nao
 * depois"). O numero muda a cada tecla e fica fora da regiao viva; so a
 * mudanca de situacao e anunciada, senao o leitor de tela falaria a cada letra.
 */
function Contador({ id, texto, max }: { id: string; texto: string; max: number }) {
  const { usados, restam, perto, passou } = situacaoDoTamanho(texto, max);
  const cor = passou ? "text-[#8c2f2f]" : perto ? "text-[#8a6d1f]" : "text-muted";
  let detalhe = "";
  if (passou) detalhe = ` · passou ${-restam} do limite`;
  else if (perto) detalhe = restam === 0 ? " · chegou ao limite" : restam === 1 ? " · falta 1" : ` · faltam ${restam}`;
  return (
    <p id={id} className={`mt-1.5 text-[0.8125rem] ${cor}`}>
      {usados} de {max} caracteres{detalhe}
      <span className="sr-only" aria-live="polite">
        {passou ? " Passou do limite de caracteres." : perto ? " Perto do limite de caracteres." : ""}
      </span>
    </p>
  );
}

/**
 * O original escrito ao lado do campo alterado, com o botao que o traz de volta
 * (JOURNEY: voltar ao original em ate 2 interacoes, sem lembrar o que estava
 * escrito). So troca o formulario: o site muda quando ela publicar.
 */
function Original({ campo, caminho, valor, original }: Omit<PropsDoCampo, "rotulo">) {
  const editor = useEditor();
  if (original === undefined || mesmoValor(campo, valor, original)) return null;

  const foto = campo.tipo === "imagem" && ehObjeto(original) && typeof original.src === "string" ? original.src : null;
  const nome =
    campo.tipo === "imagem"
      ? "Foto original"
      : campo.tipo === "destino"
        ? "Destino original"
        : campo.tipo === "lista"
          ? "Lista original"
          : "Texto original";
  const texto = textoDoValor(campo, original);

  return (
    <div className="mt-3 rounded-md border border-dashed border-rule px-4 pt-3">
      <p className="text-[0.8125rem] text-muted">{nome}:</p>
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="mt-2 h-20 w-auto rounded border border-rule" />
      )}
      <p className="mt-1 break-words whitespace-pre-line text-[0.9375rem] leading-[1.6] text-ink">
        {texto || "(em branco)"}
      </p>
      <button
        type="button"
        onClick={() => editor.restaurar(caminho, campoParaEdicao(campo, original))}
        className="sublinha min-h-[44px] text-[0.9375rem] text-accent"
      >
        Usar o original neste campo
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- texto */

type CampoDigitado = CampoTexto | CampoParagrafo | CampoEmail | CampoTelefone | CampoUrlRede | CampoNumero;

function CampoDeTexto({ campo, caminho, valor, original, rotulo }: PropsDoCampo<CampoDigitado>) {
  const editor = useEditor();
  const id = idDoCampo(editor.chave, caminho);
  const erro = editor.erros[caminho];
  const texto = comoTexto(valor);

  const limite = campo.tipo === "texto" || campo.tipo === "paragrafo" ? campo.max : null;
  // CEP, sigla e numero curto nao precisam de contagem: o formato ja diz o tamanho.
  const comContador = limite !== null && limite > 10 && !(campo.tipo === "texto" && campo.formato);
  const opcional = (campo.tipo === "texto" || campo.tipo === "paragrafo") && campo.opcional;
  const ajuda =
    campo.tipo === "url-rede"
      ? `Endereço completo do perfil, como ${campo.exemplo}`
      : campo.ajuda;

  const idAjuda = `${id}-ajuda`;
  const idContador = `${id}-contador`;
  const idErro = `${id}-erro`;

  const comuns = {
    id,
    value: texto,
    autoComplete: "off",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const bruto = e.target.value;
      editor.mudar(caminho, campo.tipo === "numero" && /^\d+$/.test(bruto) ? Number(bruto) : bruto);
    },
    onBlur: () => editor.sair(caminho),
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": ids(ajuda && idAjuda, comContador && idContador, erro && idErro),
    "data-com-erro": erro ? "" : undefined,
    className: ENTRADA,
  };

  let entrada: React.ReactNode;
  if (campo.tipo === "paragrafo") {
    entrada = <textarea {...comuns} rows={linhasDoParagrafo(campo.max)} />;
  } else if (campo.tipo === "email") {
    entrada = <input {...comuns} type="email" inputMode="email" spellCheck={false} />;
  } else if (campo.tipo === "telefone") {
    entrada = <input {...comuns} type="tel" inputMode="tel" />;
  } else if (campo.tipo === "url-rede") {
    entrada = <input {...comuns} type="url" inputMode="url" spellCheck={false} />;
  } else if (campo.tipo === "numero") {
    // type="text" e nao "number": o de numero muda o valor quando a roda do
    // mouse passa por cima, e ela rolaria a pagina trocando os anos sem ver.
    entrada = <input {...comuns} type="text" inputMode="numeric" />;
  } else {
    entrada = (
      <input
        {...comuns}
        type="text"
        inputMode={campo.formato === "cep" ? "numeric" : undefined}
        autoCapitalize={campo.formato === "uf" ? "characters" : undefined}
      />
    );
  }

  return (
    <div>
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
        {opcional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      {ajuda && (
        <p id={idAjuda} className={AJUDA}>
          {ajuda}
        </p>
      )}
      {entrada}
      {comContador && limite !== null && <Contador id={idContador} texto={texto} max={limite} />}
      <MensagemDeErro id={idErro} erro={erro} />
      <Original campo={campo} caminho={caminho} valor={valor} original={original} />
    </div>
  );
}

/* ------------------------------------------------------------------ linhas */

let contextoDeMedida: CanvasRenderingContext2D | null | undefined;

/**
 * Largura da linha em relacao a linha de referencia, medida com a fonte do
 * titulo no canvas. Relativa, e nao em pixels: o canvas nem sempre usa o corte
 * optico de display, e antes de a fonte carregar mede com a de reserva — as
 * duas linhas sofrem o mesmo desvio, e a razao continua valendo.
 */
function larguraRelativa(linha: string, referencia: string): number | null {
  if (typeof document === "undefined" || !linha.trim()) return null;
  if (contextoDeMedida === undefined) {
    try {
      contextoDeMedida = document.createElement("canvas").getContext("2d");
    } catch {
      contextoDeMedida = null;
    }
  }
  const ctx = contextoDeMedida;
  if (!ctx) return null;
  const familia = getComputedStyle(document.body).getPropertyValue("--font-newsreader").trim() || "Georgia, serif";
  ctx.font = `500 64px ${familia}`;
  // tracking de -0.025em do h1 do topo
  const medir = (texto: string) => ctx.measureText(texto).width - 0.025 * 64 * Array.from(texto).length;
  const base = medir(referencia);
  return base > 0 ? medir(linha.trim()) / base : null;
}

/**
 * Linhas fixas: uma caixa por linha, porque a quebra escrita e a quebra que o
 * site mostra (o titulo do topo foi medido linha a linha).
 */
function CampoDeLinhas({ campo, caminho, valor, original, rotulo }: PropsDoCampo<CampoLinhas>) {
  const editor = useEditor();
  const id = idDoCampo(editor.chave, caminho);
  const erro = editor.erros[caminho];
  const linhas = Array.from({ length: campo.quantidade }, (_, i) =>
    comoTexto(Array.isArray(valor) ? valor[i] : ""),
  );

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      data-com-erro={erro ? "" : undefined}
      aria-describedby={ids(campo.ajuda && `${id}-ajuda`, erro && `${id}-erro`)}
    >
      <legend className={ROTULO}>{rotulo}</legend>
      {campo.ajuda && (
        <p id={`${id}-ajuda`} className={AJUDA}>
          {campo.ajuda}
        </p>
      )}
      <div className="mt-3 space-y-4">
        {linhas.map((linha, i) => {
          const caminhoDaLinha = `${caminho}.${i}`;
          const idDaLinha = idDoCampo(editor.chave, caminhoDaLinha);
          const erroDaLinha = editor.erros[caminhoDaLinha];
          const relativa = campo.medidaNaTela ? larguraRelativa(linha, campo.medidaNaTela.referencia) : null;
          const larga = campo.medidaNaTela !== undefined && relativa !== null && relativa > campo.medidaNaTela.folga;
          return (
            // Posicao e a identidade da linha: sao fixas e nunca mudam de ordem.
            <div key={i}>
              <label htmlFor={idDaLinha} className="block text-[0.875rem] text-muted">
                Linha {i + 1}
              </label>
              <input
                id={idDaLinha}
                type="text"
                autoComplete="off"
                value={linha}
                onChange={(e) =>
                  editor.mudar(
                    caminho,
                    linhas.map((l, j) => (j === i ? e.target.value : l)),
                  )
                }
                onBlur={() => editor.sair(caminhoDaLinha)}
                aria-invalid={erroDaLinha ? true : undefined}
                aria-describedby={ids(`${idDaLinha}-contador`, larga && `${idDaLinha}-largura`, erroDaLinha && `${idDaLinha}-erro`)}
                data-com-erro={erroDaLinha ? "" : undefined}
                className={`${ENTRADA} mt-1`}
              />
              <Contador id={`${idDaLinha}-contador`} texto={linha} max={campo.maxPorLinha} />
              {/* Aviso, e nao erro: a medida no navegador e aproximada, e so a
                  pagina de como vai ficar num notebook tira a duvida. */}
              {larga && (
                <p id={`${idDaLinha}-largura`} className="mt-1 text-[0.8125rem] leading-[1.5] text-[#8a6d1f]">
                  Esta linha pode ficar mais larga que o espaço ao lado das figuras (letras largas ou maiúsculas
                  ocupam mais). Confira como vai ficar num notebook, ou use palavras mais curtas.
                </p>
              )}
              <MensagemDeErro id={`${idDaLinha}-erro`} erro={erroDaLinha} />
            </div>
          );
        })}
      </div>
      <MensagemDeErro id={`${id}-erro`} erro={erro} />
      <Original campo={campo} caminho={caminho} valor={valor} original={original} />
    </fieldset>
  );
}

/* ------------------------------------------------------------------- lista */

function focarDepois(achar: () => HTMLElement | null | undefined) {
  requestAnimationFrame(() => achar()?.focus());
}

function CampoDeLista({ campo, caminho, valor, original, rotulo }: PropsDoCampo<CampoLista>) {
  const editor = useEditor();
  const [confirmandoRemocao, setConfirmandoRemocao] = useState<number | null>(null);
  const id = idDoCampo(editor.chave, caminho);
  const erro = editor.erros[caminho];
  const itens: unknown[] = Array.isArray(valor) ? valor : [];
  const nomeDoItem = campo.rotuloDoItem.toLowerCase();
  // O original de cada item, para voltar um campo so sem desfazer a lista
  // inteira (JOURNEY: voltar ao original por campo). So com a lista do tamanho
  // do original: com item somado ou tirado, a posicao ja nao e o mesmo item.
  const originais = Array.isArray(original) && original.length === itens.length ? original : null;

  function mover(de: number, para: number, controle: "subir" | "descer") {
    editor.reestruturar(caminho, moverItem(itens, de, para));
    // O foco acompanha o item. Se o botao usado ficou desligado na posicao nova
    // (o item chegou ao topo ou ao fim), vai para o outro: foco em botao
    // desligado cai no inicio da pagina.
    const naPonta = controle === "subir" ? para === 0 : para === itens.length - 1;
    const alvo = naPonta ? (controle === "subir" ? "descer" : "subir") : controle;
    focarDepois(() => document.getElementById(`${id}-${para}-${alvo}`));
  }

  function remover(indice: number) {
    // Mesmo gesto de apagar da lista de textos: o segundo clique confirma, e o
    // botao diz o que vai acontecer.
    if (confirmandoRemocao !== indice) {
      setConfirmandoRemocao(indice);
      return;
    }
    setConfirmandoRemocao(null);
    editor.reestruturar(caminho, removerItem(itens, indice));
    focarDepois(() => document.getElementById(`${id}-adicionar`));
  }

  function adicionar() {
    editor.reestruturar(caminho, [...itens, valorVazio(campo.item)]);
    const novo = itens.length;
    focarDepois(() =>
      document.getElementById(`${id}-${novo}-item`)?.querySelector<HTMLElement>("input, textarea, select"),
    );
  }

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      data-com-erro={erro ? "" : undefined}
      aria-describedby={ids(campo.ajuda && `${id}-ajuda`, erro && `${id}-erro`)}
    >
      <legend className={ROTULO}>{rotulo}</legend>
      {campo.ajuda && (
        <p id={`${id}-ajuda`} className={AJUDA}>
          {campo.ajuda}
        </p>
      )}

      {itens.length === 0 ? (
        <p className="mt-3 text-[0.9375rem] text-muted">Nenhum {nomeDoItem} por enquanto.</p>
      ) : (
        <ol className="mt-3 space-y-4">
          {itens.map((item, i) => {
            const numero = `${campo.rotuloDoItem} ${i + 1}`;
            return (
              // Chave pela posicao: dois itens podem ter o mesmo texto.
              <li key={i} id={`${id}-${i}-item`} className="rounded-md border border-rule bg-paper p-4 sm:p-5">
                <CampoDoEditor
                  campo={campo.item}
                  caminho={`${caminho}.${i}`}
                  valor={item}
                  original={originais ? originais[i] : undefined}
                  rotulo={numero}
                  nivel={1}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    id={`${id}-${i}-subir`}
                    onClick={() => mover(i, i - 1, "subir")}
                    disabled={i === 0}
                    aria-label={`Subir ${numero}`}
                    className={BOTAO_PEQUENO}
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    id={`${id}-${i}-descer`}
                    onClick={() => mover(i, i + 1, "descer")}
                    disabled={i === itens.length - 1}
                    aria-label={`Descer ${numero}`}
                    className={BOTAO_PEQUENO}
                  >
                    Descer
                  </button>
                  {itens.length > campo.min && (
                    <button
                      type="button"
                      onClick={() => remover(i)}
                      onBlur={() => setConfirmandoRemocao(null)}
                      aria-label={confirmandoRemocao === i ? `Confirmar remoção de ${numero}` : `Remover ${numero}`}
                      aria-describedby={confirmandoRemocao === i ? `${id}-${i}-aviso` : undefined}
                      className={`min-h-[44px] rounded-md px-3 text-[0.875rem] ${
                        confirmandoRemocao === i
                          ? "border-[1.5px] border-[#8c2f2f] text-[#8c2f2f]"
                          : "text-muted hover:text-[#8c2f2f]"
                      }`}
                    >
                      {confirmandoRemocao === i ? "Confirmar remoção" : "Remover"}
                    </button>
                  )}
                </div>
                {confirmandoRemocao === i && (
                  <p id={`${id}-${i}-aviso`} role="alert" className="mt-3 text-[0.875rem] leading-[1.6] text-[#8c2f2f]">
                    Clique outra vez em “Confirmar remoção” para tirar este {nomeDoItem}. Ele só sai do site
                    quando você publicar.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {itens.length < campo.max ? (
        <button
          type="button"
          id={`${id}-adicionar`}
          onClick={adicionar}
          className="mt-4 min-h-[44px] rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent"
        >
          Adicionar {nomeDoItem}
        </button>
      ) : (
        campo.max > campo.min && (
          <p className="mt-4 text-[0.875rem] text-muted">
            Máximo de {campo.max}. Para pôr outro, remova um antes.
          </p>
        )
      )}
      <MensagemDeErro id={`${id}-erro`} erro={erro} />
      <Original campo={campo} caminho={caminho} valor={valor} original={original} />
    </fieldset>
  );
}

/* ------------------------------------------------------------------- grupo */

function CampoDeGrupo({
  campo,
  caminho,
  valor,
  original,
  rotulo,
  nivel,
}: PropsDoCampo<CampoGrupo> & { nivel: number }) {
  const editor = useEditor();
  const id = idDoCampo(editor.chave, caminho);
  const dados = ehObjeto(valor) ? valor : {};
  const originais = ehObjeto(original) ? original : undefined;
  const moldura = nivel === 0 ? "rounded-lg border border-rule px-4 pt-2 pb-5 sm:px-6" : "";

  return (
    <fieldset id={id} aria-describedby={campo.ajuda ? `${id}-ajuda` : undefined} className={moldura}>
      <legend className={`${ROTULO} ${nivel === 0 ? "px-2" : ""}`}>{rotulo}</legend>
      {campo.ajuda && (
        <p id={`${id}-ajuda`} className={AJUDA}>
          {campo.ajuda}
        </p>
      )}
      <div className="mt-4 space-y-6">
        {Object.entries(campo.campos).map(([nome, sub]) => (
          <CampoDoEditor
            key={nome}
            campo={sub}
            caminho={`${caminho}.${nome}`}
            valor={dados[nome]}
            original={originais?.[nome]}
            nivel={nivel + 1}
          />
        ))}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ imagem */

/**
 * Foto: a previa ja sai no recorte do lugar onde ela vai aparecer, porque a
 * foto boa no celular pode perder a cabeca do paciente num recorte 4:5.
 */
function CampoDeImagem({ campo, caminho, valor, original, rotulo }: PropsDoCampo<CampoImagem>) {
  const editor = useEditor();
  const id = idDoCampo(editor.chave, caminho);
  const foto = ehObjeto(valor) ? valor : {};
  const src = typeof foto.src === "string" ? foto.src : "";
  const alt = comoTexto(foto.alt);
  const largura = typeof foto.largura === "number" ? foto.largura : 0;
  const altura = typeof foto.altura === "number" ? foto.altura : 0;

  const caminhoDoArquivo = `${caminho}.src`;
  const caminhoDoAlt = `${caminho}.alt`;
  const idDoArquivo = idDoCampo(editor.chave, caminhoDoArquivo);
  const idDoAlt = idDoCampo(editor.chave, caminhoDoAlt);
  const erroDoArquivo = editor.erros[caminhoDoArquivo];
  const erroDoAlt = editor.erros[caminhoDoAlt];
  const enviando = editor.enviandoEm === caminho;

  const proporcao = campo.recorte
    ? String(campo.recorte.proporcao)
    : largura > 0 && altura > 0
      ? `${largura} / ${altura}`
      : "4 / 3";

  return (
    <fieldset id={id} tabIndex={-1}>
      <legend className={ROTULO}>{rotulo}</legend>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="w-full max-w-[16rem] shrink-0 overflow-hidden rounded-md border border-rule bg-surface"
          style={{ aspectRatio: proporcao }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center p-4 text-center text-[0.875rem] text-muted">
              Nenhuma foto escolhida
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p id={`${id}-recorte`} className={AJUDA}>
            {campo.recorte
              ? `${campo.recorte.descricao} ${
                  campo.recorte.proporcaoNoComputador ? "Ao lado, o recorte do celular." : "Ao lado, ela já aparece assim."
                }`
              : "A foto aparece inteira, sem recorte."}{" "}
            Vale foto do celular ou do computador.
          </p>
          <label
            className={`mt-3 inline-flex min-h-[44px] items-center rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent focus-within:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:border-accent ${
              editor.bloqueado ? "cursor-default opacity-50" : "cursor-pointer"
            }`}
          >
            {enviando ? "Enviando…" : src ? "Trocar foto" : "Escolher foto"}
            <input
              id={idDoArquivo}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={editor.bloqueado}
              aria-invalid={erroDoArquivo ? true : undefined}
              aria-describedby={ids(`${id}-recorte`, erroDoArquivo && `${idDoArquivo}-erro`)}
              data-com-erro={erroDoArquivo ? "" : undefined}
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) editor.enviarFoto(arquivo, caminho, campo);
                e.target.value = "";
              }}
            />
          </label>
          {enviando && (
            <p role="status" className="mt-2 text-[0.875rem] text-muted">
              Enviando a foto. Pode levar alguns segundos.
            </p>
          )}
          <MensagemDeErro id={`${idDoArquivo}-erro`} erro={erroDoArquivo} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor={idDoAlt} className={ROTULO}>
          Descrição da foto
        </label>
        <p id={`${idDoAlt}-ajuda`} className={AJUDA}>
          {campo.ajuda}
        </p>
        <textarea
          id={idDoAlt}
          rows={2}
          value={alt}
          onChange={(e) => editor.mudar(caminhoDoAlt, e.target.value)}
          onBlur={() => editor.sair(caminhoDoAlt)}
          aria-invalid={erroDoAlt ? true : undefined}
          aria-describedby={ids(`${idDoAlt}-ajuda`, `${idDoAlt}-contador`, erroDoAlt && `${idDoAlt}-erro`)}
          data-com-erro={erroDoAlt ? "" : undefined}
          className={ENTRADA}
        />
        <Contador id={`${idDoAlt}-contador`} texto={alt} max={campo.maxAlt} />
        <MensagemDeErro id={`${idDoAlt}-erro`} erro={erroDoAlt} />
      </div>

      <Original campo={campo} caminho={caminho} valor={valor} original={original} />
    </fieldset>
  );
}

/* ----------------------------------------------------------------- destino */

/**
 * Destino so por lista: um endereco digitado com acento trocado vira pagina
 * inexistente, e um campo livre aceitaria qualquer site.
 */
function CampoDeDestino({ campo, caminho, valor, original, rotulo }: PropsDoCampo<CampoDestino>) {
  const editor = useEditor();
  const id = idDoCampo(editor.chave, caminho);
  const erro = editor.erros[caminho];
  const atual = codificarDestino(valor, editor.slugs);
  const soPagina = campo.aceita.length === 1 && campo.aceita[0] === "pagina";

  const paginas = editor.destinos.map((p) => (
    <option key={p.slug} value={`pagina:${p.slug}`}>
      {p.rotulo}
    </option>
  ));

  return (
    <div>
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      {campo.ajuda && (
        <p id={`${id}-ajuda`} className={AJUDA}>
          {campo.ajuda}
        </p>
      )}
      <select
        id={id}
        value={atual}
        onChange={(e) => editor.mudar(caminho, decodificarDestino(e.target.value))}
        onBlur={() => editor.sair(caminho)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ids(campo.ajuda && `${id}-ajuda`, erro && `${id}-erro`)}
        data-com-erro={erro ? "" : undefined}
        className={ENTRADA}
      >
        {atual === "" && (
          <option value="" disabled>
            {soPagina ? "Escolha uma página" : "Escolha para onde leva"}
          </option>
        )}
        {campo.aceita.includes("whatsapp") && <option value="whatsapp">Conversa no WhatsApp</option>}
        {campo.aceita.includes("nenhum") && <option value="nenhum">Sem destino (botão apagado)</option>}
        {campo.aceita.includes("pagina") &&
          (soPagina ? paginas : <optgroup label="Páginas do site">{paginas}</optgroup>)}
      </select>
      <MensagemDeErro id={`${id}-erro`} erro={erro} />
      <Original campo={campo} caminho={caminho} valor={valor} original={original} />
    </div>
  );
}
