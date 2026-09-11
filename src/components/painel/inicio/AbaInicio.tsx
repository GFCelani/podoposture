"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CHAVES_DE_SECAO,
  DESCRITORES,
  type ChaveDeSecao,
  type EstadoDaSecao,
  type RespostaDoInicio,
} from "@/lib/conteudo-tipos";
import { armazemDaAba } from "@/lib/recado-do-editor";

import { EditorDeSecao } from "./EditorDeSecao";
import {
  armazemDoNavegador,
  deixarSecaoParaReabrir,
  ehObjeto,
  estadoEmPalavras,
  lerCopiaLocal,
  resumoDaSecao,
  tomarSecaoParaReabrir,
  type MarcaDeEstado,
} from "./edicao";

/**
 * Aba "Pagina inicial": a lista das secoes e o editor de cada uma.
 *
 * Segue o contrato de aba de Painel.tsx. A lista mostra o comeco do texto que
 * esta no ar, e nao so o nome da secao: ela procura "onde esta aquela frase"
 * (design-system/JOURNEY.md, "Nao achar o texto").
 *
 * Sessao que cai com uma secao aberta deixa um recado no `sessionStorage`;
 * depois da senha o painel remonta esta aba, e ela reabre a mesma secao, onde o
 * editor recupera a copia do navegador.
 */

type Aviso = { tipo: "erro" | "feito"; texto: string };

const SEM_CONEXAO = "Sem conexão com o servidor. Verifique a internet e tente de novo.";
const FALHA_AO_CARREGAR = "Não foi possível carregar os textos da página inicial. Tente de novo em alguns minutos.";

const TOM_DA_MARCA: Record<MarcaDeEstado["tom"], string> = {
  original: "border-rule text-muted",
  alterado: "border-ink/40 text-ink-strong",
  pendente: "border-[#8a6d1f]/50 text-[#8a6d1f]",
};

function respostaValida(corpo: unknown): corpo is RespostaDoInicio {
  if (!ehObjeto(corpo) || !ehObjeto(corpo.secoes) || !Array.isArray(corpo.destinos)) return false;
  const secoes = corpo.secoes;
  return CHAVES_DE_SECAO.every((chave) => ehObjeto(secoes[chave]));
}

export function AbaInicio({ aoPerderSessao }: { aoPerderSessao: () => void }) {
  const [resposta, setResposta] = useState<RespostaDoInicio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroDaCarga, setErroDaCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [aberta, setAberta] = useState<ChaveDeSecao | null>(null);
  const [comCopia, setComCopia] = useState<ReadonlySet<ChaveDeSecao>>(() => new Set());

  const conferirCopias = useCallback(() => {
    const armazem = armazemDoNavegador();
    setComCopia(new Set(CHAVES_DE_SECAO.filter((chave) => lerCopiaLocal(armazem, chave) !== null)));
  }, []);

  const carregar = useCallback(
    async (reabrir: ChaveDeSecao | null): Promise<void> => {
      setCarregando(true);
      try {
        const r = await fetch("/api/painel/inicio", { cache: "no-store" });
        if (r.status === 401 || r.status === 403) {
          // A secao que ia reabrir continua esperando a proxima senha.
          if (reabrir) deixarSecaoParaReabrir(armazemDaAba(), reabrir);
          aoPerderSessao();
          return;
        }
        const corpo: unknown = await r.json().catch(() => null);
        if (!r.ok || !respostaValida(corpo)) {
          const doServidor = ehObjeto(corpo) && typeof corpo.erro === "string" ? corpo.erro : null;
          setErroDaCarga(doServidor ?? FALHA_AO_CARREGAR);
          return;
        }
        setResposta(corpo);
        setErroDaCarga(null);
        if (reabrir) setAberta(reabrir);
      } catch {
        setErroDaCarga(SEM_CONEXAO);
      } finally {
        setCarregando(false);
      }
    },
    [aoPerderSessao],
  );

  useEffect(() => {
    // Mesmo motivo do efeito em Painel.tsx: o estado so muda fora do corpo do
    // efeito. O recado de reabrir e lido uma vez so: quem le apaga.
    queueMicrotask(() => {
      conferirCopias();
      void carregar(tomarSecaoParaReabrir(armazemDaAba()));
    });
  }, [carregar, conferirCopias]);

  const atualizarSecao = useCallback((chave: ChaveDeSecao, secao: EstadoDaSecao<unknown>) => {
    setResposta((atual) =>
      atual ? { ...atual, secoes: { ...atual.secoes, [chave]: secao } as RespostaDoInicio["secoes"] } : atual,
    );
  }, []);

  function abrir(chave: ChaveDeSecao) {
    setAviso(null);
    setAberta(chave);
    requestAnimationFrame(() => document.getElementById("inicio-editor-titulo")?.focus());
  }

  function fechar(chave: ChaveDeSecao, avisoAoFechar: Aviso | null) {
    setAberta(null);
    setAviso(avisoAoFechar);
    conferirCopias();
    // O foco volta para a secao de onde ela saiu, e nao para o topo da aba.
    requestAnimationFrame(() => document.getElementById(`inicio-secao-${chave}`)?.focus());
  }

  if (aberta && resposta) {
    const chave = aberta;
    return (
      <EditorDeSecao
        key={chave}
        chave={chave}
        estado={resposta.secoes[chave]}
        destinos={resposta.destinos}
        semBanco={resposta.semBanco}
        aoAtualizar={(secao) => atualizarSecao(chave, secao)}
        aoPublicar={(mensagem) => fechar(chave, { tipo: "feito", texto: mensagem })}
        aoVoltar={() => fechar(chave, null)}
        aoPerderSessao={() => {
          deixarSecaoParaReabrir(armazemDaAba(), chave);
          aoPerderSessao();
        }}
      />
    );
  }

  const outras = CHAVES_DE_SECAO.filter((chave) => chave !== "contato");

  return (
    <>
      {erroDaCarga && (
        <div role="alert" className="mb-6 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] text-[#8c2f2f]">
          <p>{erroDaCarga}</p>
          <button
            type="button"
            onClick={() => void carregar(null)}
            disabled={carregando}
            className="sublinha mt-1 min-h-[44px] text-[0.9375rem] text-[#8c2f2f] disabled:opacity-50"
          >
            {carregando ? "Carregando…" : "Tentar de novo"}
          </button>
        </div>
      )}

      {aviso?.tipo === "erro" && (
        <p role="alert" className="mb-6 rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] text-[#8c2f2f]">
          {aviso.texto}
        </p>
      )}
      {aviso?.tipo === "feito" && (
        <p role="status" className="mb-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] text-ink-strong">
          {aviso.texto}
        </p>
      )}

      {resposta?.semBanco && (
        // frontend-refs: empty-state-microfunil — diz a causa e quem resolve
        <p className="mb-6 rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink">
          O banco de dados ainda não está ligado neste servidor. O que aparece aqui é o texto original do
          site, e salvar só vai funcionar depois que o banco for configurado. Avise quem cuida do site.
        </p>
      )}

      <h1 className="font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong">Página inicial</h1>
      <p className="mt-3 max-w-[40rem] text-[1.0625rem] leading-[1.7] text-ink">
        Escolha o que quer mudar. Nada vai para o site antes de você ver como fica e publicar, e cada seção
        pode voltar ao texto original.
      </p>

      {!resposta ? (
        carregando && (
          // ui-ux-pro-max ux: Animation/Loading States
          <p role="status" className="mt-10 text-[1.0625rem] text-muted">
            Carregando os textos da página inicial…
          </p>
        )
      ) : (
        <>
          <LinhaDeSecao
            chave="contato"
            estado={resposta.secoes.contato}
            temCopia={comCopia.has("contato")}
            destaque
            aoAbrir={() => abrir("contato")}
          />

          <h2 className="mt-12 font-display text-[1.25rem] leading-[1.3] font-semibold text-ink-strong">
            Seções da página inicial
          </h2>
          <p className="mt-1 text-[0.875rem] text-muted">Na ordem em que aparecem no site.</p>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {outras.map((chave) => (
              <li key={chave}>
                <LinhaDeSecao
                  chave={chave}
                  estado={resposta.secoes[chave]}
                  temCopia={comCopia.has(chave)}
                  destaque={false}
                  aoAbrir={() => abrir(chave)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function LinhaDeSecao({
  chave,
  estado,
  temCopia,
  destaque,
  aoAbrir,
}: {
  chave: ChaveDeSecao;
  estado: EstadoDaSecao<unknown>;
  temCopia: boolean;
  destaque: boolean;
  aoAbrir: () => void;
}) {
  const descritor = DESCRITORES[chave];
  const marcas = estadoEmPalavras(estado, temCopia);

  return (
    // ui-ux-pro-max ux: Accessibility/Keyboard Navigation — cada secao e um
    // botao de verdade, alcancavel com Tab e aberto com Enter
    <button
      type="button"
      id={`inicio-secao-${chave}`}
      onClick={aoAbrir}
      className={
        destaque
          ? "mt-8 block w-full rounded-lg border-[1.5px] border-accent/45 bg-surface px-5 py-5 text-left hover:border-accent"
          : "block w-full px-2 py-5 text-left hover:bg-surface"
      }
    >
      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-[1.125rem] leading-[1.35] font-medium text-ink-strong">
          {descritor.rotulo}
        </span>
        <span aria-hidden="true" className="text-[0.9375rem] text-accent">
          Editar →
        </span>
      </span>
      {descritor.global && (
        <span className="mt-1 block text-[0.875rem] font-medium text-ink">
          Vale para o site inteiro · {descritor.aparece}
        </span>
      )}
      {/* ui-ux-pro-max ux: Content/Truncation — resumo cortado em frase, nunca estoura a linha */}
      <span className="mt-2 block break-words text-[0.9375rem] leading-[1.6] text-ink">
        {resumoDaSecao(chave, estado.publicado ?? estado.padrao)}
      </span>
      <span className="mt-3 flex flex-wrap gap-2">
        {marcas.map((marca) => (
          <span
            key={marca.texto}
            className={`rounded-full border px-2.5 py-0.5 text-[0.8125rem] ${TOM_DA_MARCA[marca.tom]}`}
          >
            {marca.texto}
          </span>
        ))}
      </span>
    </button>
  );
}
