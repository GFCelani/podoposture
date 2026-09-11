"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PostDoPainel } from "@/lib/painel-tipos";
import { BrandMark } from "../brand-mark";
import { AbaTextos } from "./AbaTextos";
import { EditorDePost } from "./EditorDePost";
import { Entrar } from "./Entrar";
import { AbaInicio } from "./inicio/AbaInicio";
import { Numeros } from "./Numeros";

/**
 * O painel inteiro.
 *
 * A regra que organiza este componente: **a tela nunca e a fechadura**. Toda
 * resposta 401 ou 403 do servidor derruba a interface de volta para a senha,
 * venha ela de onde vier. O componente nao guarda "esta autenticado" em lugar
 * nenhum — ele so reage ao que o servidor responde.
 *
 * Depois de entrar, a primeira aba e "Seus textos", a LISTA do que ja existe, e
 * nao um formulario em branco: quem volta uma vez por mes quer primeiro ver o
 * que ja escreveu (ver design-system/JOURNEY.md, loop de retorno).
 *
 * Contrato de toda aba — props `{ aoPerderSessao: () => void }`:
 *
 * 1. A aba carrega os proprios dados ao montar. O painel nao busca nada por ela.
 * 2. 401 ou 403 de qualquer rota chama `aoPerderSessao()`, e nada mais.
 * 3. 503 (banco ou fonte de dados nao configurados) vira aviso DENTRO da aba.
 *    Nao e sessao perdida: mandar para a senha faria ela digitar a senha certa
 *    e voltar para o mesmo aviso, sem entender o que aconteceu.
 * 4. As props chegam estaveis (memorizadas aqui), entao podem ir no array de
 *    dependencias de um efeito sem recarregar a aba a cada troca de aba.
 * 5. Depois da primeira visita, a aba continua montada, so escondida, ate o
 *    painel sair da tela de abas. Assim uma edicao em curso nao some quando ela
 *    olha outra aba. Efeito que roda sozinho (intervalo, repeticao) precisa
 *    contar com isso.
 */

type Aba = "textos" | "inicio" | "numeros";

const ABAS: readonly { id: Aba; rotulo: string }[] = [
  { id: "textos", rotulo: "Seus textos" },
  { id: "inicio", rotulo: "Página inicial" },
  { id: "numeros", rotulo: "Números" },
];

type Tela =
  | { nome: "carregando" }
  | { nome: "entrar" }
  | { nome: "painel"; aba: Aba }
  | { nome: "editor"; post: PostDoPainel | null; abaDeOrigem: Aba };

const SESSAO_TERMINOU = "Sua sessão terminou. Digite a senha de novo para continuar de onde parou.";
const SESSAO_TERMINOU_NO_TEXTO =
  "Sua sessão terminou. O que você estava escrevendo continua guardado neste navegador: entre de novo e ele reabre sozinho.";
// A aba Pagina inicial guarda uma copia por secao e reabre a secao depois da
// senha; a frase generica calaria a promessa de que nada se perdeu.
const SESSAO_TERMINOU_NA_PAGINA_INICIAL =
  "Sua sessão terminou. O que você digitou continua guardado neste navegador: entre de novo para continuar de onde parou.";

export function Painel() {
  const [tela, setTela] = useState<Tela>({ nome: "carregando" });
  const [visitadas, setVisitadas] = useState<Aba[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  // Para onde voltar depois da senha: quem perdeu a sessao olhando os numeros
  // nao deveria reaparecer na lista de textos.
  const abaDeVolta = useRef<Aba>("textos");

  const abrirPainel = useCallback((aba: Aba) => {
    setVisitadas([aba]);
    setTela({ nome: "painel", aba });
  }, []);

  /**
   * Pergunta ao servidor se a sessao vale. A sonda tem rota propria e nao toca
   * no banco: sessao e banco sao perguntas diferentes, e cada aba responde a
   * sua (ver contrato acima).
   */
  const conferirSessao = useCallback(async (): Promise<void> => {
    try {
      const resposta = await fetch("/api/painel/sessao", { cache: "no-store" });
      if (resposta.ok) {
        setAviso(null);
        abrirPainel(abaDeVolta.current);
        return;
      }
      if (resposta.status === 503) {
        setAviso("O painel ainda não foi configurado neste servidor. Avise quem cuida do site.");
      } else if (resposta.status !== 401 && resposta.status !== 403) {
        setAviso("Não foi possível abrir o painel agora. Tente de novo em alguns minutos.");
      }
      setTela({ nome: "entrar" });
    } catch {
      setAviso("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      setTela({ nome: "entrar" });
    }
  }, [abrirPainel]);

  useEffect(() => {
    // O estado so muda depois da resposta de rede, nunca durante o efeito. A
    // microtarefa deixa isso visivel para a regra react-hooks/set-state-in-effect,
    // do mesmo jeito que o EditorDePost faz ao recuperar o rascunho.
    queueMicrotask(() => void conferirSessao());
  }, [conferirSessao]);

  // A mensagem fica no painel, e nao em quem perdeu a sessao: quem perdeu e
  // desmontado no mesmo instante, e um aviso guardado la nunca apareceria.
  const perderSessao = useCallback((aba: Aba, mensagem: string) => {
    abaDeVolta.current = aba;
    setAviso(mensagem);
    setTela({ nome: "entrar" });
  }, []);

  const perderSessaoEmTextos = useCallback(() => perderSessao("textos", SESSAO_TERMINOU), [perderSessao]);
  const perderSessaoEmInicio = useCallback(() => perderSessao("inicio", SESSAO_TERMINOU_NA_PAGINA_INICIAL), [perderSessao]);
  const perderSessaoEmNumeros = useCallback(() => perderSessao("numeros", SESSAO_TERMINOU), [perderSessao]);
  const abrirEditor = useCallback((post: PostDoPainel | null) => {
    setTela({ nome: "editor", post, abaDeOrigem: "textos" });
  }, []);

  async function sair() {
    await fetch("/api/painel/sair", { method: "POST" }).catch(() => {});
    abaDeVolta.current = "textos";
    setAviso(null);
    setVisitadas([]);
    setTela({ nome: "entrar" });
  }

  function trocarAba(aba: Aba) {
    setVisitadas((v) => (v.includes(aba) ? v : [...v, aba]));
    setTela({ nome: "painel", aba });
  }

  if (tela.nome === "carregando") {
    return (
      <div className="mx-auto max-w-[26rem] px-6 py-24">
        <p role="status" className="text-[1.0625rem] text-muted">
          Carregando…
        </p>
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
        <Entrar aoEntrar={() => void conferirSessao()} />
      </>
    );
  }

  if (tela.nome === "editor") {
    // O editor ocupa a tela inteira, fora do cabecalho e das abas, de
    // proposito: um clique numa aba ou em "Sair" no meio do texto desmontaria
    // o editor sem passar pelo aviso do navegador de alteracao nao salva.
    const { abaDeOrigem } = tela;
    return (
      <EditorDePost
        post={tela.post}
        aoSalvar={() => abrirPainel(abaDeOrigem)}
        aoCancelar={() => abrirPainel(abaDeOrigem)}
        aoPerderSessao={() => perderSessao(abaDeOrigem, SESSAO_TERMINOU_NO_TEXTO)}
      />
    );
  }

  const { aba } = tela;

  // Setas, Home e End movem entre as abas, como pede o padrao de abas do WAI-ARIA;
  // Tab sai da fileira e entra no conteudo da aba aberta.
  function aoTeclarNaAba(e: React.KeyboardEvent<HTMLButtonElement>) {
    const atual = ABAS.findIndex((a) => a.id === aba);
    let destino: number;
    if (e.key === "ArrowRight") destino = (atual + 1) % ABAS.length;
    else if (e.key === "ArrowLeft") destino = (atual - 1 + ABAS.length) % ABAS.length;
    else if (e.key === "Home") destino = 0;
    else if (e.key === "End") destino = ABAS.length - 1;
    else return;
    e.preventDefault();
    const proxima = ABAS[destino].id;
    trocarAba(proxima);
    document.getElementById(`aba-${proxima}`)?.focus();
  }

  return (
    <div className="mx-auto max-w-[52rem] px-6 py-12 lg:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BrandMark className="h-8 w-auto" />
          <span
            className="text-[0.6875rem] tracking-[0.18em] text-muted uppercase"
            style={{ fontFamily: "var(--mono)" }}
          >
            Painel do site
          </span>
        </div>
        <button
          onClick={() => void sair()}
          className="sublinha min-h-[44px] text-[0.9375rem] text-accent hover:text-accent-deep"
        >
          Sair
        </button>
      </header>

      {/* frontend-refs: estado-por-elevacao-nao-matiz — a aba aberta se marca
          por peso e fio escuro; o azul fica reservado a link e foco.
          ui-ux-pro-max ux: Navigation/Active State */}
      <div
        role="tablist"
        aria-label="Partes do painel"
        className="mt-6 flex overflow-x-auto border-b border-rule"
      >
        {ABAS.map(({ id, rotulo }) => {
          const selecionada = id === aba;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`aba-${id}`}
              aria-selected={selecionada}
              aria-controls={`quadro-${id}`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => trocarAba(id)}
              onKeyDown={aoTeclarNaAba}
              className={`-mb-px min-h-[44px] shrink-0 border-b-2 px-4 text-[0.9375rem] transition-colors duration-[160ms] ${
                selecionada
                  ? "border-ink-strong font-medium text-ink-strong"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      {ABAS.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`quadro-${id}`}
          aria-labelledby={`aba-${id}`}
          hidden={id !== aba}
          tabIndex={0}
          className="mt-10"
        >
          {visitadas.includes(id) && id === "textos" && (
            <AbaTextos aoPerderSessao={perderSessaoEmTextos} aoAbrirEditor={abrirEditor} />
          )}
          {visitadas.includes(id) && id === "inicio" && (
            <AbaInicio aoPerderSessao={perderSessaoEmInicio} />
          )}
          {visitadas.includes(id) && id === "numeros" && (
            <Numeros aoPerderSessao={perderSessaoEmNumeros} />
          )}
        </div>
      ))}
    </div>
  );
}
