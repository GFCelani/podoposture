"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { LIMITE_NOME_DO_TEMA, erroNoNomeDoTema, normalizarNomeDoTema } from "@/lib/painel-tipos";

/**
 * Os temas do blog: criar, renomear e apagar.
 *
 * Mora dentro de "Meu blog", aberta pelo botao "Temas". A regra que importa
 * e a de apagar:
 *
 * - tema sem texto: dois cliques, como apagar um texto;
 * - tema com texto: a tela diz quantos sao e pede para onde eles vao — outro
 *   tema ou "Deixar sem tema" —, sem opcao marcada de antemao, e so depois
 *   pede a confirmacao. O servidor recusa apagar sem destino, e o banco recusa
 *   de novo (chave estrangeira): a tela e a primeira trava, nao a unica.
 *
 * Renomear leva todos os textos do tema junto, e o site e refeito.
 */

type Tema = { id: string; nome: string; textos: number };
type Aviso = { tipo: "erro" | "feito"; texto: string };

const SEM_CONEXAO = "Sem conexão com o servidor. Verifique a internet e tente de novo.";
const ENTRADA =
  "min-h-[44px] w-full rounded-md border border-rule bg-paper px-3 text-[1rem] text-ink-strong focus:border-accent focus:outline-none";
const BOTAO_CONTORNO =
  "min-h-[44px] rounded-md border-[1.5px] border-accent/45 px-4 text-[0.9375rem] text-accent hover:border-accent disabled:opacity-50";
const BOTAO_DISCRETO = "min-h-[44px] rounded-md px-4 text-[0.9375rem] text-muted hover:text-ink-strong disabled:opacity-50";
const AVISO_ERRO = "rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

async function lerErro(resposta: Response, reserva: string): Promise<string> {
  const corpo = await resposta.json().catch(() => ({}));
  return typeof corpo?.erro === "string" ? corpo.erro : reserva;
}

export function GestaoDeTemas({
  aoPerderSessao,
  aoMudarTextos,
}: {
  aoPerderSessao: () => void;
  /** Um tema com textos foi renomeado ou apagado: a lista de textos mostra o tema de cada um. */
  aoMudarTextos: () => void;
}) {
  const [temas, setTemas] = useState<Tema[] | null>(null);
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [novo, setNovo] = useState("");
  const [erroDoNovo, setErroDoNovo] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const idNovo = useId();

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/painel/temas", { cache: "no-store" });
      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        setErroDaLista(await lerErro(resposta, "Não foi possível carregar os temas. Tente de novo em alguns minutos."));
        return;
      }
      const corpo = await resposta.json();
      setTemas(Array.isArray(corpo.temas) ? corpo.temas : []);
      setErroDaLista(null);
    } catch {
      setErroDaLista(SEM_CONEXAO);
    }
  }, [aoPerderSessao]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    const nome = normalizarNomeDoTema(novo);
    const erro = erroNoNomeDoTema(nome);
    if (erro) {
      setErroDoNovo(erro);
      return;
    }
    setCriando(true);
    setAviso(null);
    try {
      const resposta = await fetch("/api/painel/temas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        setErroDoNovo(await lerErro(resposta, "Não foi possível criar o tema."));
        return;
      }
      setNovo("");
      setErroDoNovo(null);
      setAviso({ tipo: "feito", texto: `Tema “${nome}” criado.` });
      await carregar();
    } catch {
      setErroDoNovo(SEM_CONEXAO);
    } finally {
      setCriando(false);
    }
  }

  const depoisDeMudar = useCallback(
    async (texto: string, mexeuEmTextos: boolean) => {
      setAviso({ tipo: "feito", texto });
      await carregar();
      if (mexeuEmTextos) aoMudarTextos();
    },
    [carregar, aoMudarTextos],
  );

  return (
    <section aria-labelledby="temas-titulo" className="mt-8 rounded-lg border border-rule bg-surface px-5 py-6 md:px-7">
      <h2 id="temas-titulo" className="font-display text-[1.375rem] leading-[1.25] font-semibold text-ink-strong">
        Temas
      </h2>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-[1.6] text-muted">
        Os temas agrupam os textos no blog. Um tema só aparece no site quando tem pelo menos um texto publicado.
      </p>

      {aviso?.tipo === "erro" && (
        <p role="alert" className={`mt-5 ${AVISO_ERRO}`}>
          {aviso.texto}
        </p>
      )}
      <p
        role="status"
        className={
          aviso?.tipo === "feito"
            ? "mt-5 rounded-md border border-rule bg-paper px-4 py-3 text-[0.9375rem] text-ink-strong"
            : "sr-only"
        }
      >
        {aviso?.tipo === "feito" ? aviso.texto : ""}
      </p>

      <form onSubmit={(e) => void criar(e)} className="mt-6 flex flex-wrap items-end gap-3" noValidate>
        <div className="min-w-[16rem] flex-1">
          <label htmlFor={idNovo} className="block text-[0.9375rem] font-medium text-ink-strong">
            Novo tema
          </label>
          <input
            id={idNovo}
            value={novo}
            maxLength={LIMITE_NOME_DO_TEMA}
            onChange={(e) => {
              setNovo(e.target.value);
              if (erroDoNovo) setErroDoNovo(null);
            }}
            aria-invalid={erroDoNovo ? true : undefined}
            aria-describedby={erroDoNovo ? `${idNovo}-erro` : undefined}
            className={`mt-2 ${ENTRADA}`}
          />
        </div>
        <button type="submit" disabled={criando} className={BOTAO_CONTORNO}>
          {criando ? "Criando…" : "Adicionar tema"}
        </button>
        {erroDoNovo && (
          <p id={`${idNovo}-erro`} role="alert" className="w-full text-[0.875rem] text-[#8c2f2f]">
            {erroDoNovo}
          </p>
        )}
      </form>

      {erroDaLista ? (
        <p role="alert" className={`mt-6 ${AVISO_ERRO}`}>
          {erroDaLista}
        </p>
      ) : temas === null ? (
        <p role="status" className="mt-6 text-[0.9375rem] text-muted">
          Carregando os temas…
        </p>
      ) : temas.length === 0 ? (
        <p className="mt-6 text-[0.9375rem] text-muted">Nenhum tema ainda.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border-t border-rule">
          {temas.map((tema) => (
            <LinhaDoTema
              key={tema.id}
              tema={tema}
              outros={temas.filter((t) => t.id !== tema.id)}
              aoPerderSessao={aoPerderSessao}
              aoFalhar={(texto) => setAviso({ tipo: "erro", texto })}
              aoMudar={depoisDeMudar}
              aoRecarregar={carregar}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function LinhaDoTema({
  tema,
  outros,
  aoPerderSessao,
  aoFalhar,
  aoMudar,
  aoRecarregar,
}: {
  tema: Tema;
  outros: Tema[];
  aoPerderSessao: () => void;
  aoFalhar: (texto: string) => void;
  aoMudar: (texto: string, mexeuEmTextos: boolean) => Promise<void>;
  aoRecarregar: () => Promise<void>;
}) {
  const [modo, setModo] = useState<"ver" | "renomear" | "apagar">("ver");
  const [nome, setNome] = useState(tema.nome);
  const [erroDoNome, setErroDoNome] = useState<string | null>(null);
  /** Destino dos textos ao apagar: "" = ainda nao escolheu; "sem-tema"; ou o id de outro tema. */
  const [destino, setDestino] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const id = useId();

  const sair = () => {
    setModo("ver");
    setNome(tema.nome);
    setErroDoNome(null);
    setDestino("");
    setConfirmando(false);
  };

  async function renomear(evento: React.FormEvent) {
    evento.preventDefault();
    const limpo = normalizarNomeDoTema(nome);
    const erro = erroNoNomeDoTema(limpo);
    if (erro) {
      setErroDoNome(erro);
      return;
    }
    if (limpo === tema.nome) {
      sair();
      return;
    }
    setOcupado(true);
    try {
      const resposta = await fetch(`/api/painel/temas/${tema.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: limpo }),
      });
      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (!resposta.ok) {
        setErroDoNome(await lerErro(resposta, "Não foi possível renomear o tema."));
        return;
      }
      setModo("ver");
      await aoMudar(
        tema.textos > 0
          ? `Tema renomeado para “${limpo}”. ${plural(tema.textos, "texto passou", "textos passaram")} a mostrar o nome novo no site.`
          : `Tema renomeado para “${limpo}”.`,
        tema.textos > 0,
      );
    } catch {
      setErroDoNome(SEM_CONEXAO);
    } finally {
      setOcupado(false);
    }
  }

  async function apagar() {
    // Com textos, a escolha do destino vem antes de qualquer confirmacao.
    if (tema.textos > 0 && !destino) return;
    // ui-ux-pro-max ux: Interaction/Confirmation Dialogs — o segundo clique e a
    // confirmacao, e o botao diz o que vai acontecer.
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setOcupado(true);
    try {
      const corpo = tema.textos > 0 ? { destino: destino === "sem-tema" ? null : destino } : {};
      const resposta = await fetch(`/api/painel/temas/${tema.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (resposta.status === 401 || resposta.status === 403) {
        aoPerderSessao();
        return;
      }
      if (resposta.status === 409) {
        // Um texto entrou no tema em outra janela: a contagem mudou, e ela
        // precisa ver o numero novo e escolher o destino de novo.
        aoFalhar(await lerErro(resposta, "O tema ganhou textos enquanto você decidia. Escolha para onde eles vão."));
        setConfirmando(false);
        setDestino("");
        await aoRecarregar();
        return;
      }
      if (!resposta.ok && resposta.status !== 404) {
        aoFalhar(await lerErro(resposta, "Não foi possível apagar o tema. Ele continua aqui; tente de novo."));
        setConfirmando(false);
        return;
      }
      const movidos = tema.textos;
      const para =
        destino === "sem-tema" ? "ficaram sem tema" : `foram para “${outros.find((t) => t.id === destino)?.nome ?? ""}”`;
      await aoMudar(
        movidos > 0 ? `Tema “${tema.nome}” apagado. ${plural(movidos, "texto", "textos")} ${para}.` : `Tema “${tema.nome}” apagado.`,
        movidos > 0,
      );
    } catch {
      aoFalhar("Sem conexão com o servidor. O tema não foi apagado; verifique a internet e tente de novo.");
      setConfirmando(false);
    } finally {
      setOcupado(false);
    }
  }

  const oQueAcontece =
    destino === "sem-tema"
      ? `${plural(tema.textos, "texto fica", "textos ficam")} sem tema`
      : `${plural(tema.textos, "texto vai", "textos vão")} para “${outros.find((t) => t.id === destino)?.nome ?? ""}”`;

  return (
    <li className="py-4">
      {modo === "renomear" ? (
        <form onSubmit={(e) => void renomear(e)} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="min-w-[16rem] flex-1">
            <label htmlFor={`${id}-nome`} className="block text-[0.875rem] text-muted">
              Novo nome para “{tema.nome}”
            </label>
            <input
              id={`${id}-nome`}
              value={nome}
              autoFocus
              maxLength={LIMITE_NOME_DO_TEMA}
              onChange={(e) => {
                setNome(e.target.value);
                if (erroDoNome) setErroDoNome(null);
              }}
              aria-invalid={erroDoNome ? true : undefined}
              aria-describedby={erroDoNome ? `${id}-erro` : undefined}
              className={`mt-2 ${ENTRADA}`}
            />
          </div>
          <button type="submit" disabled={ocupado} className={BOTAO_CONTORNO}>
            {ocupado ? "Salvando…" : "Salvar nome"}
          </button>
          <button type="button" onClick={sair} disabled={ocupado} className={BOTAO_DISCRETO}>
            Cancelar
          </button>
          {erroDoNome && (
            <p id={`${id}-erro`} role="alert" className="w-full text-[0.875rem] text-[#8c2f2f]">
              {erroDoNome}
            </p>
          )}
          {tema.textos > 0 && !erroDoNome && (
            <p className="w-full text-[0.875rem] text-muted">
              {plural(tema.textos, "texto passa", "textos passam")} a mostrar o nome novo no site.
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="font-display text-[1.0625rem] leading-[1.35] font-medium text-ink-strong">{tema.nome}</p>
            <p className="mt-1 text-[0.875rem] text-muted">
              {tema.textos === 0 ? "Nenhum texto" : plural(tema.textos, "texto", "textos")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sair();
                setModo("renomear");
              }}
              disabled={ocupado || modo === "apagar"}
              className={BOTAO_CONTORNO}
            >
              Renomear
            </button>
            {modo === "ver" && (
              <button
                type="button"
                onClick={() => (tema.textos > 0 ? setModo("apagar") : void apagar())}
                onBlur={() => {
                  if (tema.textos === 0) setConfirmando(false);
                }}
                disabled={ocupado}
                aria-describedby={confirmando ? `${id}-aviso` : undefined}
                className={`min-h-[44px] rounded-md px-4 text-[0.9375rem] ${
                  confirmando ? "border-[1.5px] border-[#8c2f2f] text-[#8c2f2f]" : "text-muted hover:text-[#8c2f2f]"
                }`}
              >
                {ocupado ? "Apagando…" : confirmando ? "Confirmar exclusão" : "Apagar"}
              </button>
            )}
          </div>
          {modo === "ver" && confirmando && (
            <p id={`${id}-aviso`} role="alert" className={`w-full ${AVISO_ERRO}`}>
              O tema “{tema.nome}” é apagado. Nenhum texto usa ele. Para confirmar, clique outra vez em “Confirmar exclusão”.
            </p>
          )}
        </div>
      )}

      {modo === "apagar" && (
        <div role="group" aria-labelledby={`${id}-pergunta`} className="mt-4 rounded-md border-[1.5px] border-[#8c2f2f]/40 bg-paper px-4 py-4">
          <p id={`${id}-pergunta`} className="text-[0.9375rem] leading-[1.6] text-ink-strong">
            O tema “{tema.nome}” tem <strong>{plural(tema.textos, "texto", "textos")}</strong>. Para apagar o tema, escolha
            para onde {tema.textos === 1 ? "ele vai" : "eles vão"}. Nenhum texto é apagado.
          </p>
          <label htmlFor={`${id}-destino`} className="mt-4 block text-[0.875rem] text-muted">
            Mover os textos para
          </label>
          <select
            id={`${id}-destino`}
            value={destino}
            disabled={ocupado}
            onChange={(e) => {
              setDestino(e.target.value);
              setConfirmando(false);
            }}
            className={`mt-2 ${ENTRADA}`}
          >
            <option value="" disabled>
              Escolha um destino…
            </option>
            {outros.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
            <option value="sem-tema">Deixar sem tema</option>
          </select>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void apagar()}
              disabled={ocupado || !destino}
              aria-describedby={confirmando ? `${id}-confirmar` : undefined}
              className="min-h-[44px] rounded-md border-[1.5px] border-[#8c2f2f] px-4 text-[0.9375rem] text-[#8c2f2f] disabled:opacity-40"
            >
              {ocupado
                ? "Apagando…"
                : confirmando
                  ? "Confirmar: mover e apagar"
                  : `Mover ${plural(tema.textos, "texto", "textos")} e apagar o tema`}
            </button>
            <button type="button" onClick={sair} disabled={ocupado} className={BOTAO_DISCRETO}>
              Cancelar
            </button>
          </div>
          {confirmando && destino && (
            <p id={`${id}-confirmar`} role="alert" className={`mt-4 ${AVISO_ERRO}`}>
              {oQueAcontece}, e o tema “{tema.nome}” é apagado. Para confirmar, clique outra vez em “Confirmar: mover e
              apagar”.
            </p>
          )}
        </div>
      )}
    </li>
  );
}
