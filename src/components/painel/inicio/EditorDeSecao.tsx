"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DESCRITORES,
  conferirCampo,
  validarSecao,
  type AcaoDaEscrita,
  type AlvoDoDescarte,
  type CampoImagem,
  type ChaveDeSecao,
  type ErrosDeCampo,
  type EstadoDaSecao,
  type PaginaDeDestino,
} from "@/lib/conteudo-tipos";
import { ErroAoEnviarImagem, enviarImagem } from "@/lib/preparar-imagem";

import { CampoDoEditor, ContextoDoEditor, type AcoesDoEditor } from "./CamposDaSecao";
import {
  CANAL_DA_PAGINA_INICIAL,
  apagarCopiaLocal,
  aplicarCopia,
  armazemDoNavegador,
  atualizarErros,
  camposDaSecao,
  camposRelacionados,
  ehObjeto,
  enderecoDaPrevia,
  explicacaoDePublicar,
  explicacaoDeVoltarAoOriginal,
  gravarCaminho,
  guardarCopiaLocal,
  idDoCampo,
  larguraDoEnvio,
  lerCaminho,
  lerCopiaLocal,
  mensagemDeFalha,
  paraEdicao,
  publicadoDiferenteDoPadrao,
  semErrosEm,
  type DadosEmEdicao,
} from "./edicao";

/**
 * O editor de uma secao da pagina inicial.
 *
 * O fluxo segue o friction budget do design-system/JOURNEY.md ("Pagina
 * inicial"), que e contrato:
 *
 * 1. **Publicar so depois de ver.** O botao de publicar nao existe ate a pagina
 *    de como vai ficar ser aberta com o texto que esta na tela; mudou depois,
 *    some de novo. A home e a pagina mais vista, e um titulo maior que o espaco
 *    so aparece com a pagina inteira na frente. A pagina mostra so o rascunho
 *    DESTA secao: o que ela aprova e o que vai ao ar.
 * 2. **Publicar pede confirmacao** (segundo clique), e o aviso diz onde a
 *    mudanca vai aparecer. Ate publicar: secao → campo → ver como vai ficar →
 *    publicar (na propria aba de como vai ficar, ou aqui) → confirmar, 5
 *    interacoes.
 * 3. **Nada escrito se perde, e nada de outra janela e apagado.** Copia no
 *    navegador enquanto digita (com o que o servidor tinha quando ela comecou),
 *    gravada na hora se a sessao cair ou o editor sair da tela, e aviso do
 *    navegador antes de fechar a aba. Cada gravacao leva a versao que o editor
 *    carregou: se outra janela publicou no meio, nada e gravado e o que ela
 *    mudou e juntado com a versao nova.
 * 4. **Um unico botao preenchido.** Antes de ver como vai ficar ele e "Ver como
 *    vai ficar", que e o proximo passo; depois, "Publicar no site". Os dois
 *    nunca aparecem preenchidos juntos.
 */

/** Nome fixo: clicar de novo recarrega a mesma aba em vez de empilhar abas. */
const NOME_DA_ABA_DA_PREVIA = "podoposture-previa";
const ID_DO_AVISO = "inicio-aviso";

const PREENCHIDO =
  "min-h-[48px] rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 font-medium text-ink-strong shadow-tag transition-[transform,box-shadow] duration-[260ms] hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const CONTORNO =
  "min-h-[48px] rounded-md border-[1.5px] border-accent/45 px-6 text-[0.9375rem] text-accent hover:border-accent disabled:opacity-50";
const DISCRETO = "min-h-[48px] rounded-md px-3 text-[0.9375rem] text-muted hover:text-[#8c2f2f] disabled:opacity-50";
const CONFIRMANDO = "min-h-[48px] rounded-md border-[1.5px] border-[#8c2f2f] px-4 text-[0.9375rem] text-[#8c2f2f]";
const NOTA = "mt-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink";

type Confirmacao = "publicar" | "descartar" | "original";

function baseDaSecao(chave: ChaveDeSecao, secao: EstadoDaSecao<unknown>): DadosEmEdicao {
  return paraEdicao(chave, secao.rascunho ?? secao.publicado ?? secao.padrao);
}

export function EditorDeSecao({
  chave,
  estado,
  destinos,
  semBanco,
  aoAtualizar,
  aoPublicar,
  aoVoltar,
  aoPerderSessao,
}: {
  chave: ChaveDeSecao;
  estado: EstadoDaSecao<unknown>;
  destinos: readonly PaginaDeDestino[];
  semBanco: boolean;
  aoAtualizar: (secao: EstadoDaSecao<unknown>) => void;
  aoPublicar: (mensagem: string) => void;
  aoVoltar: () => void;
  aoPerderSessao: () => void;
}) {
  const descritor = DESCRITORES[chave];
  const campos = camposDaSecao(chave);

  // Lido na inicializacao, e nao num efeito: o editor so monta depois do clique
  // numa secao ja carregada, entao nunca renderiza no servidor, e ler aqui evita
  // mostrar o texto salvo por um instante e trocar pela copia em seguida.
  const [inicio] = useState(() => {
    const salvo = baseDaSecao(chave, estado);
    const copia = lerCopiaLocal(armazemDoNavegador(), chave);
    // So os campos que ela mexeu: o que ela nao tocou segue a versao de agora
    // do servidor, mesmo que a copia seja de antes de outra publicacao.
    const recuperado = copia ? aplicarCopia(chave, salvo, copia.dados, copia.base) : null;
    const usarCopia = recuperado !== null && JSON.stringify(recuperado) !== JSON.stringify(salvo);
    const mudouDepois = usarCopia && copia?.base !== undefined && JSON.stringify(copia.base) !== JSON.stringify(salvo);
    return { salvo, dados: usarCopia && recuperado ? recuperado : salvo, recuperado: usarCopia, mudouDepois };
  });

  /** O que o servidor tem para esta secao, no formato do formulario. */
  const [salvo, setSalvo] = useState<DadosEmEdicao>(inicio.salvo);
  const [dados, setDados] = useState<DadosEmEdicao>(inicio.dados);
  const [recuperado, setRecuperado] = useState(inicio.recuperado);
  const [mudouNoServidor, setMudouNoServidor] = useState(inicio.mudouDepois);
  const [erros, setErros] = useState<ErrosDeCampo>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Confirmacao | null>(null);
  const [andamento, setAndamento] = useState<"previa" | Confirmacao | null>(null);
  const [enviandoEm, setEnviandoEm] = useState<string | null>(null);
  /** O texto (JSON) que estava na tela quando a pagina de como vai ficar abriu. */
  const [previaDe, setPreviaDe] = useState<string | null>(null);
  /** Aba bloqueada pelo navegador: a pagina sai por um link, e ela conta como vista quando o link e clicado. */
  const [linkDaPrevia, setLinkDaPrevia] = useState<string | null>(null);
  const emCurso = useRef(false);
  const raiz = useRef<HTMLDivElement>(null);

  const textoAtual = useMemo(() => JSON.stringify(dados), [dados]);
  const alterado = useMemo(() => textoAtual !== JSON.stringify(salvo), [textoAtual, salvo]);
  const slugs = useMemo(() => new Set(destinos.map((p) => p.slug)), [destinos]);
  const podePublicar = previaDe === textoAtual;
  const temRascunhoNoServidor = estado.rascunho !== null;
  const ocupado = andamento !== null || enviandoEm !== null;

  /* -------- copia no navegador -------- */

  // O ultimo estado, para quem roda fora da renderizacao: a copia gravada ao
  // desmontar e o fim do envio de foto, que acontece segundos depois do clique.
  const ultimo = useRef({ dados: inicio.dados, salvo: inicio.salvo, alterado: false });
  /** Publicada ou descartada: sair do editor nao pode recriar a copia. */
  const copiaResolvida = useRef(false);

  useEffect(() => {
    ultimo.current = { dados, salvo, alterado };
  }, [dados, salvo, alterado]);

  useEffect(() => {
    const armazem = armazemDoNavegador();
    if (!alterado) {
      apagarCopiaLocal(armazem, chave);
      return;
    }
    const id = setTimeout(() => guardarCopiaLocal(armazem, chave, dados, new Date(), salvo), 600);
    return () => clearTimeout(id);
  }, [alterado, chave, dados, salvo]);

  useEffect(
    () => () => {
      // "Sair" e a troca para o editor de texto desmontam esta secao sem passar
      // pelo aviso do navegador, e a copia automatica espera 600 ms: a ultima
      // frase digitada se perdia. Ao sair da tela, a copia e gravada na hora.
      if (copiaResolvida.current || !ultimo.current.alterado) return;
      guardarCopiaLocal(armazemDoNavegador(), chave, ultimo.current.dados, new Date(), ultimo.current.salvo);
    },
    [chave],
  );

  useEffect(() => {
    if (!alterado) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  /**
   * Grava a copia AGORA. A automatica espera 600 ms de pausa, e quem digita a
   * ultima palavra e clica em seguida perderia justamente essa palavra.
   */
  function guardarJa() {
    if (alterado) guardarCopiaLocal(armazemDoNavegador(), chave, dados, new Date(), salvo);
  }

  function perderSessao() {
    guardarJa();
    aoPerderSessao();
  }

  function voltar() {
    guardarJa();
    aoVoltar();
  }

  /* -------- publicado pela aba de como vai ficar -------- */

  const aoPublicarPelaPrevia = useRef<(secao: EstadoDaSecao<unknown>) => void>(() => {});
  useEffect(() => {
    aoPublicarPelaPrevia.current = (secao) => {
      aoAtualizar(secao);
      if (previaDe !== null && previaDe === textoAtual) {
        copiaResolvida.current = true;
        apagarCopiaLocal(armazemDoNavegador(), chave);
        aoPublicar(`A seção “${descritor.rotulo}” foi publicada. Quem abrir o site a partir de agora já vê a versão nova.`);
        return;
      }
      // Ela mudou algo depois de ver: o que foi publicado e a versao vista, e
      // o que esta na tela continua aqui, sem ir para o site.
      setSalvo(baseDaSecao(chave, secao));
      setPreviaDe(null);
      setLinkDaPrevia(null);
      setSucesso(null);
      setAviso(
        "A versão que você viu na outra aba foi publicada. O que você mudou depois continua aqui, sem ir para o site: veja de novo como vai ficar para publicar.",
      );
    };
  });

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    let canal: BroadcastChannel;
    try {
      canal = new BroadcastChannel(CANAL_DA_PAGINA_INICIAL);
    } catch {
      return;
    }
    canal.onmessage = (evento: MessageEvent) => {
      const mensagem: unknown = evento.data;
      if (!ehObjeto(mensagem) || mensagem.tipo !== "publicada" || mensagem.chave !== chave || !ehObjeto(mensagem.secao)) {
        return;
      }
      aoPublicarPelaPrevia.current(mensagem.secao as EstadoDaSecao<unknown>);
    };
    return () => canal.close();
  }, [chave]);

  /* -------- escrever nos campos -------- */

  function focarPrimeiroErro() {
    requestAnimationFrame(() => {
      const alvo =
        raiz.current?.querySelector<HTMLElement>("[data-com-erro]") ?? document.getElementById(ID_DO_AVISO);
      alvo?.focus();
    });
  }

  function mudar(caminho: string, valor: unknown) {
    const novos = gravarCaminho(dados, caminho, valor);
    setDados(novos);
    setSucesso(null);
    setConfirmando(null);
    // Erro na tela some assim que o campo fica certo; erro novo so ao sair do campo.
    if (Object.keys(erros).length > 0) {
      setErros(atualizarErros(erros, validarSecao(chave, novos).erros, caminho, [], false));
    }
  }

  function sair(caminho: string) {
    setErros(
      atualizarErros(erros, validarSecao(chave, dados).erros, caminho, camposRelacionados(chave, caminho), true),
    );
  }

  function reestruturar(caminho: string, valor: unknown) {
    setDados(gravarCaminho(dados, caminho, valor));
    setErros(semErrosEm(erros, caminho));
    setSucesso(null);
    setConfirmando(null);
  }

  function restaurar(caminho: string, valor: unknown) {
    reestruturar(caminho, valor);
    requestAnimationFrame(() => document.getElementById(idDoCampo(chave, caminho))?.focus());
  }

  async function enviarFoto(arquivo: File, caminho: string, campo: CampoImagem) {
    if (enviandoEm !== null) return;
    setEnviandoEm(caminho);
    setConfirmando(null);
    const caminhoDoArquivo = `${caminho}.src`;
    const caminhoDoAlt = `${caminho}.alt`;
    const antes = lerCaminho(dados, caminho);
    const tinhaFoto = ehObjeto(antes) && typeof antes.src === "string" && antes.src !== "";
    const descricaoAntes = ehObjeto(antes) && typeof antes.alt === "string" ? antes.alt : "";
    try {
      // Reduzir, converter (JPEG onde o navegador nao gera WebP) e enviar mora em
      // src/lib/preparar-imagem.ts, o mesmo do editor de post.
      const enviada = await enviarImagem(arquivo, larguraDoEnvio(chave));
      // A regra da largura minima e a do contrato, conferida ja no envio: sem
      // isto a foto estreita so seria recusada no fim, ao publicar.
      const erroDaFoto = conferirCampo(campo, { src: enviada.url, alt: "foto" }, caminho).erros[caminhoDoArquivo];
      // Foto trocada leva junto a descricao da foto anterior, e a validacao so
      // confere se ha descricao: a foto do consultorio ia ao ar lida como
      // "recepcao com poltronas". Se ela nao reescreveu a descricao durante o
      // envio, a descricao velha sai e o campo pede a da foto nova.
      const agora = lerCaminho(ultimo.current.dados, caminho);
      const descricaoAgora = ehObjeto(agora) && typeof agora.alt === "string" ? agora.alt : "";
      const pedirDescricao = tinhaFoto && descricaoAntes !== "" && descricaoAgora === descricaoAntes;
      // Pela forma funcional: durante o envio ela pode ter mexido em outro
      // campo, e o `dados` deste fechamento ainda e o de antes.
      setDados((atuais) => {
        const anterior = lerCaminho(atuais, caminho);
        const base = ehObjeto(anterior) ? anterior : {};
        return gravarCaminho(atuais, caminho, {
          ...base,
          src: enviada.url,
          largura: enviada.largura,
          altura: enviada.altura,
          ...(pedirDescricao ? { alt: "" } : {}),
        });
      });
      setErros((atuais) => {
        const saida = { ...atuais };
        delete saida[caminhoDoArquivo];
        if (erroDaFoto) saida[caminhoDoArquivo] = erroDaFoto;
        if (pedirDescricao) saida[caminhoDoAlt] = "A descrição era da foto anterior. Descreva a foto nova em uma frase.";
        return saida;
      });
      setSucesso(null);
      if (pedirDescricao) {
        requestAnimationFrame(() => document.getElementById(idDoCampo(chave, caminhoDoAlt))?.focus());
      }
    } catch (erro) {
      if (erro instanceof ErroAoEnviarImagem && erro.sessaoPerdida) {
        perderSessao();
        return;
      }
      const mensagem =
        erro instanceof ErroAoEnviarImagem
          ? erro.message
          : "Não foi possível enviar a foto. Tente de novo; se continuar, escolha outra foto.";
      setErros((atuais) => ({ ...atuais, [caminhoDoArquivo]: mensagem }));
    } finally {
      setEnviandoEm(null);
    }
  }

  /* -------- falar com o servidor -------- */

  /** A secao inteira validada, ou null com os erros ja na tela e o foco no primeiro. */
  function conferirTudo(): DadosEmEdicao | null {
    const validacao = validarSecao(chave, dados);
    if (validacao.ok) return validacao.dados as DadosEmEdicao;
    setErros(validacao.erros);
    setConfirmando(null);
    setSucesso(null);
    setAviso(validacao.erros[""] ?? "Confira os campos marcados em vermelho. O cursor já está no primeiro deles.");
    focarPrimeiroErro();
    return null;
  }

  /**
   * Um pedido a rota da secao. Devolve a secao como ficou, ou null com o aviso
   * ja escrito. 401/403 guarda a copia e devolve a tela para a senha. 409 (a
   * secao mudou em outra janela): nada foi gravado, e o que ela mudou e juntado
   * com a versao nova.
   */
  async function pedir(
    metodo: "PUT" | "DELETE",
    corpo: { dados: DadosEmEdicao; acao: AcaoDaEscrita } | null,
    alvo: AlvoDoDescarte | null,
  ): Promise<EstadoDaSecao<unknown> | null> {
    const endereco = `/api/painel/inicio/${encodeURIComponent(chave)}${alvo ? `?alvo=${alvo}` : ""}`;
    const referencia = salvo;
    let resposta: Response;
    try {
      resposta = await fetch(endereco, {
        method: metodo,
        headers: corpo ? { "Content-Type": "application/json" } : undefined,
        body: corpo ? JSON.stringify({ ...corpo, versao: estado.atualizadoEm }) : undefined,
      });
    } catch {
      setAviso(mensagemDeFalha(0, null));
      return null;
    }

    if (resposta.status === 401 || resposta.status === 403) {
      perderSessao();
      return null;
    }

    const lido: unknown = await resposta.json().catch(() => null);
    const secaoDaResposta = ehObjeto(lido) && ehObjeto(lido.secao) ? (lido.secao as EstadoDaSecao<unknown>) : null;

    if (resposta.status === 409) {
      if (secaoDaResposta) {
        aoAtualizar(secaoDaResposta);
        const versaoNova = baseDaSecao(chave, secaoDaResposta);
        setDados((atuais) => aplicarCopia(chave, versaoNova, atuais, referencia));
        setSalvo(versaoNova);
      }
      setPreviaDe(null);
      setLinkDaPrevia(null);
      setAviso(
        "Esta seção mudou em outra janela ou aparelho depois que você a abriu, e nada foi salvo agora para não apagar essa mudança. Juntamos o que você alterou com a versão mais nova: confira os campos e veja de novo como vai ficar.",
      );
      return null;
    }

    if (!resposta.ok) {
      const errosDoServidor = ehObjeto(lido) && ehObjeto(lido.erros) ? lido.erros : null;
      if (errosDoServidor) {
        const soTexto = Object.fromEntries(
          Object.entries(errosDoServidor).filter((par): par is [string, string] => typeof par[1] === "string"),
        );
        setErros(soTexto);
        focarPrimeiroErro();
      }
      setAviso(mensagemDeFalha(resposta.status, ehObjeto(lido) ? lido.erro : null));
      return null;
    }

    if (!secaoDaResposta) {
      setAviso(mensagemDeFalha(502, null));
      return null;
    }
    aoAtualizar(secaoDaResposta);
    return secaoDaResposta;
  }

  async function executar(qual: "previa" | Confirmacao, tarefa: () => Promise<void>) {
    // Trava por ref, e nao pelo estado: dois cliques no mesmo quadro ainda veem
    // o `andamento` antigo e mandariam dois pedidos.
    if (emCurso.current) return;
    emCurso.current = true;
    setAndamento(qual);
    setAviso(null);
    setSucesso(null);
    setConfirmando(null);
    try {
      await tarefa();
    } finally {
      emCurso.current = false;
      setAndamento(null);
    }
  }

  function verPrevia() {
    if (emCurso.current || enviandoEm !== null) return;
    const validos = conferirTudo();
    if (!validos) return;

    // A aba abre ainda dentro do clique. Aberta so depois da resposta, o
    // bloqueador de janelas do navegador a engoliria sem avisar ninguem.
    let janela: Window | null = null;
    try {
      janela = window.open("", NOME_DA_ABA_DA_PREVIA);
    } catch {
      janela = null;
    }
    try {
      if (janela) janela.document.body.textContent = "Preparando a página…";
    } catch {
      // aba ja numa pagina que nao aceita escrita: a navegacao abaixo resolve
    }

    const enviado = dados;
    void executar("previa", async () => {
      const secao = await pedir("PUT", { dados: validos, acao: "rascunho" }, null);
      if (!secao) {
        janela?.close();
        return;
      }
      const novo = baseDaSecao(chave, secao);
      setSalvo(novo);
      // So troca o formulario se ninguem mexeu durante o pedido; senao o que
      // foi digitado nesses segundos sumiria.
      setDados((atuais) => (atuais === enviado ? novo : atuais));
      setRecuperado(false);
      setMudouNoServidor(false);

      if (janela && !janela.closed) {
        janela.opener = null;
        janela.location.href = enderecoDaPrevia(chave);
        setPreviaDe(JSON.stringify(novo));
        setSucesso(
          "Rascunho salvo. A página abriu em outra aba: confira como vai ficar e publique por lá, ou volte aqui para publicar.",
        );
      } else {
        setLinkDaPrevia(JSON.stringify(novo));
        setSucesso("Rascunho salvo. Abra a página pelo link abaixo para ver como vai ficar.");
      }
    });
  }

  function publicar() {
    if (emCurso.current || enviandoEm !== null || !podePublicar) return;
    if (confirmando !== "publicar") {
      setConfirmando("publicar");
      return;
    }
    const validos = conferirTudo();
    if (!validos) return;
    void executar("publicar", async () => {
      const secao = await pedir("PUT", { dados: validos, acao: "publicar" }, null);
      if (!secao) return;
      copiaResolvida.current = true;
      apagarCopiaLocal(armazemDoNavegador(), chave);
      aoPublicar(
        `A seção “${descritor.rotulo}” foi publicada. Quem abrir o site a partir de agora já vê a versão nova.`,
      );
    });
  }

  function descartar() {
    if (emCurso.current || enviandoEm !== null) return;
    if (confirmando !== "descartar") {
      setConfirmando("descartar");
      return;
    }
    const limpar = () => {
      setErros({});
      setRecuperado(false);
      setMudouNoServidor(false);
      setPreviaDe(null);
      setLinkDaPrevia(null);
      apagarCopiaLocal(armazemDoNavegador(), chave);
    };

    if (!temRascunhoNoServidor) {
      setConfirmando(null);
      setDados(salvo);
      limpar();
      setAviso(null);
      setSucesso("Alterações descartadas. O editor mostra de novo o que está no site.");
      return;
    }
    void executar("descartar", async () => {
      const secao = await pedir("DELETE", null, "rascunho");
      if (!secao) return;
      const novo = baseDaSecao(chave, secao);
      setSalvo(novo);
      setDados(novo);
      limpar();
      setSucesso("Rascunho descartado. O editor mostra de novo o que está no site.");
    });
  }

  function voltarAoOriginal() {
    if (emCurso.current || enviandoEm !== null) return;
    if (confirmando !== "original") {
      setConfirmando("original");
      return;
    }
    const enviado = dados;
    const manterFormulario = alterado;
    void executar("original", async () => {
      const secao = await pedir("DELETE", null, "publicado");
      if (!secao) return;
      const novo = baseDaSecao(chave, secao);
      setSalvo(novo);
      // Com alteracao nao salva na tela, ela fica: voltar ao original mexe no
      // site, nao apaga o que ela esta escrevendo.
      if (!manterFormulario) setDados((atuais) => (atuais === enviado ? novo : atuais));
      setSucesso(
        secao.rascunho !== null
          ? "O texto original voltou ao site. O rascunho continua guardado aqui, sem ir para o site."
          : "O texto original voltou ao site.",
      );
    });
  }

  /* -------- tela -------- */

  const acoes: AcoesDoEditor = {
    chave,
    erros,
    destinos,
    slugs,
    bloqueado: ocupado,
    enviandoEm,
    mudar,
    sair,
    reestruturar,
    restaurar,
    enviarFoto: (arquivo, caminho, campo) => void enviarFoto(arquivo, caminho, campo),
  };

  const padrao = ehObjeto(estado.padrao) ? estado.padrao : {};
  const rotuloDoDescarte = temRascunhoNoServidor ? "Descartar rascunho" : "Descartar alterações";
  const podeDescartar = temRascunhoNoServidor || alterado;
  // So quando o que esta no ar difere do original: senao o botao prometia
  // mudar o site e nao mudava nada.
  const podeVoltarAoOriginal = publicadoDiferenteDoPadrao(estado);

  let explicacaoDaConfirmacao: string | null = null;
  if (confirmando === "publicar") {
    explicacaoDaConfirmacao = explicacaoDePublicar(chave);
  } else if (confirmando === "descartar") {
    explicacaoDaConfirmacao = `${
      temRascunhoNoServidor ? "O rascunho salvo e as alterações desta tela serão apagados." : "As alterações desta tela serão apagadas."
    } O que está no site não muda. Para confirmar, clique outra vez em “Confirmar descarte”.`;
  } else if (confirmando === "original") {
    explicacaoDaConfirmacao = explicacaoDeVoltarAoOriginal(chave);
  }

  return (
    <ContextoDoEditor value={acoes}>
      <div ref={raiz}>
        <button onClick={voltar} className="sublinha min-h-[44px] text-[0.9375rem] text-accent">
          ← Voltar para a lista
        </button>

        <h1
          id="inicio-editor-titulo"
          tabIndex={-1}
          className="mt-6 font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong outline-none"
        >
          {descritor.rotulo}
        </h1>
        <p className="mt-3 text-[1.0625rem] leading-[1.7] text-ink">{descritor.ajuda}</p>
        <p className="mt-1 text-[0.875rem] text-muted">
          {descritor.global ? `Vale para o site inteiro · ${descritor.aparece}` : descritor.aparece}
        </p>

        {chave === "hero" && (
          <>
            <p className={NOTA}>
              O título foi medido para caber ao lado das figuras: cada linha tem um limite de caracteres e
              quebra exatamente onde você quebrar. Antes de publicar, confira como vai ficar numa tela de
              notebook ou computador, não só no celular.
            </p>
            {/* Aviso honesto: public/og.png e uma captura fixa do topo, e o painel nao a refaz. */}
            <p className={NOTA}>
              A imagem que aparece quando alguém compartilha o site no WhatsApp ou nas redes continua a de
              antes: ela não muda com o que você publicar aqui.
            </p>
          </>
        )}

        {chave === "contato" && (
          // Aviso honesto: telefones escritos a mao no HTML de pages.json e de
          // posts.json nao seguem este cadastro.
          <p className={NOTA}>
            Trocar um número aqui muda o cabeçalho, o rodapé, os botões e a página Contato. Os telefones que
            estão escritos dentro dos textos antigos do blog e das páginas internas não mudam sozinhos.
          </p>
        )}

        {recuperado && (
          <p role="status" className={NOTA}>
            Recuperamos o que você estava editando neste navegador.
            {mudouNoServidor &&
              " Esta seção mudou no site depois disso: os campos que você não tinha mexido já vêm com a versão nova. Confira antes de publicar."}{" "}
            Para ficar com o que está salvo, use “{rotuloDoDescarte}” no fim da página.
          </p>
        )}

        <div className="mt-10 space-y-8">
          {Object.entries(campos).map(([nome, campo]) => (
            <CampoDoEditor key={nome} campo={campo} caminho={nome} valor={dados[nome]} original={padrao[nome]} />
          ))}
        </div>

        <div className="mt-12 border-t border-rule pt-8">
          {semBanco ? (
            <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
              O banco de dados ainda não está ligado neste servidor. O que aparece aqui é o texto original do
              site, e ver como vai ficar e publicar só funcionam depois que o banco for configurado. O que
              você mudar fica guardado neste navegador. Avise quem cuida do site.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={verPrevia}
                  disabled={ocupado}
                  aria-describedby={podePublicar ? undefined : "inicio-dica-da-previa"}
                  className={podePublicar ? CONTORNO : PREENCHIDO}
                >
                  {andamento === "previa" ? "Salvando o rascunho…" : "Ver como vai ficar"}
                </button>

                {podePublicar && (
                  <button
                    type="button"
                    onClick={publicar}
                    onBlur={() => setConfirmando((c) => (c === "publicar" ? null : c))}
                    disabled={ocupado}
                    aria-describedby={confirmando === "publicar" ? "inicio-confirmacao" : undefined}
                    className={PREENCHIDO}
                  >
                    {andamento === "publicar"
                      ? "Publicando…"
                      : confirmando === "publicar"
                        ? "Confirmar e publicar"
                        : "Publicar no site"}
                  </button>
                )}

                {podeDescartar && (
                  <button
                    type="button"
                    onClick={descartar}
                    onBlur={() => setConfirmando((c) => (c === "descartar" ? null : c))}
                    disabled={ocupado}
                    aria-describedby={confirmando === "descartar" ? "inicio-confirmacao" : undefined}
                    className={confirmando === "descartar" ? CONFIRMANDO : DISCRETO}
                  >
                    {andamento === "descartar"
                      ? "Descartando…"
                      : confirmando === "descartar"
                        ? "Confirmar descarte"
                        : rotuloDoDescarte}
                  </button>
                )}

                {podeVoltarAoOriginal && (
                  <button
                    type="button"
                    onClick={voltarAoOriginal}
                    onBlur={() => setConfirmando((c) => (c === "original" ? null : c))}
                    disabled={ocupado}
                    aria-describedby={confirmando === "original" ? "inicio-confirmacao" : undefined}
                    className={confirmando === "original" ? CONFIRMANDO : DISCRETO}
                  >
                    {andamento === "original"
                      ? "Voltando ao original…"
                      : confirmando === "original"
                        ? "Confirmar e voltar ao original"
                        : "Voltar o site ao texto original"}
                  </button>
                )}
              </div>

              {!podePublicar && (
                <p id="inicio-dica-da-previa" className="mt-3 text-[0.875rem] leading-[1.6] text-muted">
                  {previaDe !== null
                    ? "Você mudou algo depois de ver como ia ficar. Veja de novo para poder publicar."
                    : "O botão de publicar aparece depois que você vê como vai ficar."}
                </p>
              )}

              {/* Abaixo dos botoes, e nao acima: aviso que empurra o botao para
                  baixo faz o segundo clique cair em outro lugar. */}
              {explicacaoDaConfirmacao && (
                <p
                  id="inicio-confirmacao"
                  role="alert"
                  className="mt-4 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]"
                >
                  {explicacaoDaConfirmacao}
                </p>
              )}
            </>
          )}

          {/* ui-ux-pro-max ux: Accessibility/Error Messages — perto dos botoes,
              onde ela esta quando clica */}
          {aviso && (
            <p
              id={ID_DO_AVISO}
              role="alert"
              tabIndex={-1}
              className="mt-4 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f] outline-none"
            >
              {aviso}
            </p>
          )}
          {/* ui-ux-pro-max ux: Feedback/Confirmation Messages */}
          {sucesso && (
            <p role="status" className="mt-4 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink-strong">
              {sucesso}
            </p>
          )}
          {linkDaPrevia !== null && (
            <a
              href={enderecoDaPrevia(chave)}
              target="_blank"
              rel="noopener"
              onClick={() => {
                setPreviaDe(linkDaPrevia);
                setLinkDaPrevia(null);
              }}
              className="sublinha mt-2 inline-flex min-h-[44px] items-center text-[0.9375rem] text-accent"
            >
              Ver como vai ficar em outra aba
            </a>
          )}
        </div>
      </div>
    </ContextoDoEditor>
  );
}
