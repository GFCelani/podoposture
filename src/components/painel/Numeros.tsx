"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  PERIODO_PADRAO,
  comparacaoEmPalavras,
  contar,
  dataPorExtenso,
  diaCurto,
  diasDoIntervalo,
  formatarNumero,
  mediasAntesEDepois,
  mesCurto,
  mesPorExtenso,
  mesesSemBuraco,
  quandoFoi,
  rotuloDoPeriodo,
  type Buscas,
  type Contagem,
  type EstadoDaFonte,
  type Fonte,
  type Periodo,
  type RespostaDosNumeros,
  type TextoLido,
  type Visitas,
} from "@/lib/numeros-tipos";
import { BarrasHorizontais, ColunasMensais, LinhaDiaria, type ItemDeBarra, type Ponto } from "./Barras";

/**
 * Aba "Numeros": quem leu o que ela escreveu, e de onde essa pessoa veio.
 *
 * Segue o contrato de aba de Painel.tsx. Le so a rota do painel, que le so o
 * nosso Postgres; a coleta nas fontes e trabalho do cron.
 *
 * A ordem dos blocos e a ordem das perguntas dela (design-system/JOURNEY.md,
 * aba "Numeros"): de quando e o numero, quantas pessoas, quais textos, de onde
 * vieram, o que buscaram, e se a mudanca do site custou gente. A resposta
 * curta cabe no primeiro quadro, sem rolar.
 *
 * Tres regras que atravessam a tela inteira:
 *
 * - Zero so aparece quando e zero medido. Fonte nao ligada, fonte ligada sem
 *   nenhum dia guardado e coleta que falhou sao estados com frase propria —
 *   "0 pessoas" onde nao se media faria ela achar que ninguem leu.
 * - Nenhum numero sem data: todo quadro diz de quando a quando.
 * - Nada anda sozinho. Sem intervalo de recarga: a aba fica montada e
 *   escondida quando ela troca de aba (contrato 5), e o numero muda uma vez
 *   por dia.
 */

const SEM_CONEXAO = "Sem conexão com o servidor. Verifique a internet e tente de novo.";

/** Rotulos dos botoes. Mais curtos que `rotuloDoPeriodo` para caberem numa linha no celular. */
const BOTOES_DE_PERIODO: readonly { periodo: Periodo; rotulo: string }[] = [
  { periodo: 7, rotulo: "7 dias" },
  { periodo: 30, rotulo: "30 dias" },
  { periodo: 90, rotulo: "3 meses" },
  { periodo: 365, rotulo: "1 ano" },
];

const NOME_DA_FONTE: Record<Fonte, string> = { vercel: "As visitas", busca: "As buscas no Google" };

/**
 * Passado disto sem coleta nova, o numero e velho. A coleta roda uma vez por
 * dia; 36 horas deixam folga para o atraso do agendador sem esconder uma noite
 * inteira perdida.
 */
const HORAS_ATE_FICAR_VELHO = 36;

type Carga = { resposta: RespostaDosNumeros; recebidaEm: number };

const CLASSE_ALERTA = "rounded-md bg-[#f7ecec] px-4 py-3 text-[0.9375rem] leading-[1.6] text-[#8c2f2f]";
const CLASSE_NOTA = "rounded-md border border-rule bg-surface px-4 py-3 text-[0.9375rem] leading-[1.6] text-ink";

export function Numeros({ aoPerderSessao }: { aoPerderSessao: () => void }) {
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_PADRAO);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // Troca rapida de periodo dispara dois pedidos; so o ultimo pode escrever na
  // tela, senao a resposta lenta de 7 dias apareceria com o botao de 1 ano marcado.
  const ultimoPedido = useRef(0);

  const carregar = useCallback(
    async (escolhido: Periodo): Promise<void> => {
      const este = ++ultimoPedido.current;
      setCarregando(true);
      try {
        const resposta = await fetch(`/api/painel/numeros?periodo=${escolhido}`, { cache: "no-store" });
        if (este !== ultimoPedido.current) return;

        if (resposta.status === 401 || resposta.status === 403) {
          aoPerderSessao();
          return;
        }
        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => ({}));
          const mensagem = typeof corpo?.erro === "string" ? corpo.erro : null;
          setErro(
            resposta.status === 503 && mensagem
              ? `${mensagem} Avise quem cuida do site.`
              : (mensagem ?? "Não foi possível carregar os números agora. Tente de novo em alguns minutos."),
          );
          return;
        }

        const corpo = (await resposta.json()) as RespostaDosNumeros;
        if (este !== ultimoPedido.current) return;
        setCarga({ resposta: corpo, recebidaEm: Date.now() });
        setErro(null);
      } catch {
        if (este === ultimoPedido.current) setErro(SEM_CONEXAO);
      } finally {
        if (este === ultimoPedido.current) setCarregando(false);
      }
    },
    [aoPerderSessao],
  );

  useEffect(() => {
    // Mesmo motivo do efeito em Painel.tsx: o estado so muda fora do corpo do efeito.
    queueMicrotask(() => void carregar(periodo));
  }, [carregar, periodo]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[1.75rem] leading-[1.2] font-semibold text-ink-strong">Números</h1>
        <SeletorDePeriodo periodo={periodo} aoEscolher={setPeriodo} />
      </div>

      {erro && (
        <p role="alert" className={`mt-6 ${CLASSE_ALERTA}`}>
          {erro}
        </p>
      )}

      {!carga ? (
        carregando && (
          <p role="status" className="mt-10 text-[1.0625rem] text-muted">
            Carregando os números…
          </p>
        )
      ) : (
        // Ao trocar o periodo, a tela anterior fica, esmaecida, ate a nova
        // chegar: piscar para "carregando" a cada clique faria a pagina pular.
        <div
          aria-busy={carregando}
          className={`transition-opacity duration-[160ms] ${carregando ? "opacity-60" : ""}`}
        >
          {carregando && (
            <p role="status" className="sr-only">
              Atualizando os números…
            </p>
          )}
          <Conteudo resposta={carga.resposta} agora={carga.recebidaEm} />
        </div>
      )}
    </>
  );
}

function SeletorDePeriodo({ periodo, aoEscolher }: { periodo: Periodo; aoEscolher: (p: Periodo) => void }) {
  // frontend-refs: estado-por-elevacao-nao-matiz — o periodo escolhido se marca
  // por fio escuro e peso; nenhum botao preenchido, porque a tela nao tem acao
  // dominante (e so leitura).
  return (
    <div role="group" aria-label="Período" className="flex flex-wrap gap-1">
      {BOTOES_DE_PERIODO.map((b) => {
        const escolhido = b.periodo === periodo;
        return (
          <button
            key={b.periodo}
            type="button"
            aria-pressed={escolhido}
            onClick={() => aoEscolher(b.periodo)}
            className={`min-h-[44px] rounded-md border px-3 text-[0.9375rem] transition-colors duration-[160ms] ${
              escolhido
                ? "border-ink-strong bg-surface font-medium text-ink-strong"
                : "border-rule text-muted hover:text-ink"
            }`}
          >
            {b.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- conteudo */

function Conteudo({ resposta, agora }: { resposta: RespostaDosNumeros; agora: number }) {
  if (resposta.semBanco) {
    return (
      <div className="mt-8 space-y-4">
        <p className={CLASSE_NOTA}>
          Os números ainda não foram ligados neste servidor: eles são guardados no mesmo banco dos
          textos, que ainda não foi configurado. Quando for, a primeira coleta roda às 6h da manhã
          seguinte. É com quem cuida do site.
        </p>
      </div>
    );
  }

  const { fontes, visitas, buscas, periodo, migracao } = resposta;
  const ano = new Date(agora).getUTCFullYear();

  return (
    <>
      <LinhaDeFrescor fontes={fontes} agora={agora} ano={ano} />
      <QuadroDePessoas visitas={visitas} estado={fontes.vercel} periodo={periodo} ano={ano} />
      {visitas && (
        <>
          <TextosMaisLidos textos={visitas.textos} visitas={visitas} ano={ano} />
          <DeOndeVieram origens={visitas.origens} visitas={visitas} ano={ano} />
        </>
      )}
      <QuadroDeBuscas buscas={buscas} estado={fontes.busca} periodo={periodo} ano={ano} />
      {buscas && buscas.meses.length > 0 && fontes.busca.primeiroDia && fontes.busca.ultimoDia && (
        <AntesEDepois
          buscas={buscas}
          migracao={migracao}
          primeiroDia={fontes.busca.primeiroDia}
          ultimoDia={fontes.busca.ultimoDia}
        />
      )}
      <Detalhes visitas={visitas} fontes={fontes} agora={agora} ano={ano} />
    </>
  );
}

/**
 * O aviso de uma fonte, quando o numero dela nao merece confianca: a ultima
 * coleta falhou, ou nenhuma coleta nova chega ha mais de um dia e meio.
 */
function avisoDaFonte(fonte: Fonte, estado: EstadoDaFonte, agora: number, ano: number): string | null {
  if (!estado.configurada || !estado.ultima) return null;
  const nome = NOME_DA_FONTE[fonte];
  const ate = estado.ultimoDia ? ` Os números abaixo vão até ${dataPorExtenso(estado.ultimoDia, ano)}.` : "";
  const hoje = new Date(agora);

  if (estado.ultima.situacao === "erro") {
    return `${nome} não foram atualizadas: a coleta de ${quandoFoi(estado.ultima.em, hoje)} falhou.${ate} Ela tenta de novo amanhã às 6h; se falhar outra vez, avise quem cuida do site.`;
  }
  const referencia = estado.ultimaComSucesso ?? estado.ultima;
  const horas = (agora - Date.parse(referencia.em)) / 3_600_000;
  if (horas > HORAS_ATE_FICAR_VELHO) {
    return `${nome} não são atualizadas desde ${quandoFoi(referencia.em, hoje)}.${ate} Avise quem cuida do site.`;
  }
  return null;
}

/** A primeira linha da aba: de quando sao os numeros, ou por que nao sao de agora. */
function LinhaDeFrescor({
  fontes,
  agora,
  ano,
}: {
  fontes: Record<Fonte, EstadoDaFonte>;
  agora: number;
  ano: number;
}) {
  const avisos = (["vercel", "busca"] as const)
    .map((f) => avisoDaFonte(f, fontes[f], agora, ano))
    .filter((a): a is string => a !== null);

  const partes: string[] = [];
  if (fontes.vercel.configurada && fontes.vercel.ultimoDia) {
    partes.push(`Visitas até ${dataPorExtenso(fontes.vercel.ultimoDia, ano)}`);
  }
  if (fontes.busca.configurada && fontes.busca.ultimoDia) {
    partes.push(`buscas no Google até ${dataPorExtenso(fontes.busca.ultimoDia, ano)}`);
  }
  const atualizacoes = [fontes.vercel.ultimaComSucesso?.em, fontes.busca.ultimaComSucesso?.em]
    .filter((em): em is string => Boolean(em))
    .sort();
  const ultimaAtualizacao = atualizacoes.at(-1);
  if (partes.length > 0 && ultimaAtualizacao) {
    partes.push(`atualizados ${quandoFoi(ultimaAtualizacao, new Date(agora))}`);
  }

  return (
    <div className="mt-6 space-y-3">
      {partes.length > 0 && (
        <p className="text-[0.9375rem] leading-[1.6] text-muted">
          {partes.map((p, i) => (i === 0 ? p : ` · ${p}`)).join("")}
        </p>
      )}
      {avisos.map((aviso) => (
        <p key={aviso} role="alert" className={CLASSE_ALERTA}>
          {aviso}
        </p>
      ))}
    </div>
  );
}

function Secao({ id, titulo, children, primeira = false }: { id: string; titulo: string; children: ReactNode; primeira?: boolean }) {
  return (
    <section aria-labelledby={id} className={primeira ? "mt-8" : "mt-14 border-t border-rule pt-10"}>
      <h2 id={id} className="font-display text-[1.25rem] leading-[1.3] font-semibold text-ink-strong">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Intervalo({ inicio, fim, ano }: { inicio: string; fim: string; ano: number }) {
  return (
    <p className="mt-1 text-[0.875rem] text-muted">
      De {dataPorExtenso(inicio, ano)} a {dataPorExtenso(fim, ano)}
    </p>
  );
}

/** Frase de estado de fonte sem numero: nao ligada, ou ligada e ainda vazia. */
function FonteSemNumero({ estado, naoLigada, semDia }: { estado: EstadoDaFonte; naoLigada: string; semDia: string }) {
  return <p className={`mt-4 ${CLASSE_NOTA}`}>{estado.configurada ? semDia : naoLigada}</p>;
}

/* ------------------------------------------------------ quantas pessoas */

function frasesDaOrigem(origem: Contagem): string {
  return origem.nome === "Digitou o endereço"
    ? "A maior parte digitou o endereço ou abriu um link sem origem, como os do WhatsApp."
    : `De onde veio mais gente: ${origem.nome} (${contar(origem.pessoas, ["pessoa", "pessoas"])}).`;
}

function QuadroDePessoas({
  visitas,
  estado,
  periodo,
  ano,
}: {
  visitas: Visitas | null;
  estado: EstadoDaFonte;
  periodo: Periodo;
  ano: number;
}) {
  if (!visitas) {
    return (
      <Secao id="numeros-pessoas" titulo="Quantas pessoas abriram o site" primeira>
        <FonteSemNumero
          estado={estado}
          naoLigada="A contagem de visitas ainda não foi ligada. Falta ativar a medição de visitas na Vercel e cadastrar a chave de leitura no servidor — é com quem cuida do site."
          semDia="A contagem de visitas está ligada, mas ainda não há nenhum dia guardado. A coleta roda todo dia às 6h da manhã."
        />
      </Secao>
    );
  }

  const valores = new Map(visitas.porDia.map((d) => [d.dia, d.pessoas]));
  const pontos: Ponto[] = diasDoIntervalo(visitas.intervalo).map((dia) => {
    const valor = valores.get(dia) ?? null;
    return {
      chave: dia,
      rotulo: dataPorExtenso(dia, ano),
      rotuloCurto: diaCurto(dia),
      valor,
      valorEscrito: valor === null ? "sem número guardado" : contar(valor, ["pessoa", "pessoas"]),
    };
  });
  const maisLido = visitas.textos[0];
  const origem = visitas.origens[0];

  return (
    <Secao id="numeros-pessoas" titulo="Quantas pessoas abriram o site" primeira>
      <Intervalo inicio={visitas.intervalo.inicio} fim={visitas.intervalo.fim} ano={ano} />

      {/* dataviz: numero de destaque na fonte do texto, com algarismos proporcionais */}
      <p className="mt-4 text-[3rem] leading-none font-semibold text-ink-strong">{formatarNumero(visitas.pessoas)}</p>
      <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink">
        {visitas.pessoas === 1 ? "pessoa abriu" : "pessoas abriram"} o site, somando{" "}
        {contar(visitas.visitas, ["página aberta", "páginas abertas"])}.
      </p>
      <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink">
        {visitas.anterior
          ? comparacaoEmPalavras(visitas.pessoas, visitas.anterior.pessoas, periodo, ["pessoa", "pessoas"])
          : `Ainda não há ${rotuloDoPeriodo(periodo)} anteriores guardados para comparar.`}
      </p>

      {(maisLido || origem) && (
        <ul className="mt-4 space-y-1 text-[1.0625rem] leading-[1.6] text-ink">
          {maisLido && (
            <li>
              O texto mais lido foi <strong className="font-medium text-ink-strong">“{maisLido.titulo}”</strong> (
              {contar(maisLido.pessoas, ["pessoa", "pessoas"])}).
            </li>
          )}
          {origem && <li>{frasesDaOrigem(origem)}</li>}
        </ul>
      )}

      <p className="mt-3 text-[0.875rem] leading-[1.6] text-muted">
        Cada dia conta as pessoas daquele dia: quem voltou em outro dia entra de novo na soma.
      </p>

      {pontos.length > 1 && (
        <div className="mt-6">
          <LinhaDiaria pontos={pontos} rotulo="Pessoas por dia" />
        </div>
      )}
    </Secao>
  );
}

/* ------------------------------------------------------------ rankings */

function itensDeTextos(textos: TextoLido[], medida: "pessoas" | "cliques"): ItemDeBarra[] {
  return textos.map((t) => ({
    chave: t.slug,
    rotulo: t.titulo,
    valor: t[medida],
    valorEscrito:
      medida === "pessoas" ? contar(t.pessoas, ["pessoa", "pessoas"]) : contar(t.cliques, ["clique", "cliques"]),
  }));
}

function TextosMaisLidos({ textos, visitas, ano }: { textos: TextoLido[]; visitas: Visitas; ano: number }) {
  return (
    <Secao id="numeros-textos" titulo="Seus textos mais lidos">
      <Intervalo inicio={visitas.intervalo.inicio} fim={visitas.intervalo.fim} ano={ano} />
      {textos.length === 0 ? (
        <p className="mt-4 text-[1.0625rem] leading-[1.6] text-muted">Nenhum texto do blog foi aberto neste período.</p>
      ) : (
        <div className="mt-5">
          <BarrasHorizontais itens={itensDeTextos(textos, "pessoas")} rotulo="Textos mais lidos, por pessoas" />
        </div>
      )}
    </Secao>
  );
}

function DeOndeVieram({ origens, visitas, ano }: { origens: Contagem[]; visitas: Visitas; ano: number }) {
  return (
    <Secao id="numeros-origens" titulo="De onde vieram">
      <Intervalo inicio={visitas.intervalo.inicio} fim={visitas.intervalo.fim} ano={ano} />
      {origens.length === 0 ? (
        <p className="mt-4 text-[1.0625rem] leading-[1.6] text-muted">Nenhuma visita guardada neste período.</p>
      ) : (
        <>
          <div className="mt-5">
            <BarrasHorizontais
              itens={origens.map((o) => ({
                chave: o.nome,
                rotulo: o.nome,
                valor: o.pessoas,
                valorEscrito: contar(o.pessoas, ["pessoa", "pessoas"]),
              }))}
              rotulo="De onde vieram as pessoas"
            />
          </div>
          <p className="mt-4 text-[0.875rem] leading-[1.6] text-muted">
            “Digitou o endereço” inclui quem abriu um link pelo aplicativo do WhatsApp ou de e-mail no
            celular: esses aplicativos não contam de onde a pessoa veio.
          </p>
        </>
      )}
    </Secao>
  );
}

/* -------------------------------------------------------------- buscas */

const POSICAO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function QuadroDeBuscas({
  buscas,
  estado,
  periodo,
  ano,
}: {
  buscas: Buscas | null;
  estado: EstadoDaFonte;
  periodo: Periodo;
  ano: number;
}) {
  if (!buscas) {
    return (
      <Secao id="numeros-buscas" titulo="O que as pessoas buscaram no Google">
        <FonteSemNumero
          estado={estado}
          naoLigada="As buscas no Google ainda não foram ligadas. Falta dar ao site acesso de leitura ao Search Console do endereço da clínica — é com quem cuida do site."
          semDia="O acesso às buscas no Google está ligado, mas ainda não há nenhum dia guardado. O Google libera os números com 2 a 3 dias de atraso."
        />
      </Secao>
    );
  }

  return (
    <Secao id="numeros-buscas" titulo="O que as pessoas buscaram no Google">
      <Intervalo inicio={buscas.intervalo.inicio} fim={buscas.intervalo.fim} ano={ano} />
      <p className="mt-4 text-[1.0625rem] leading-[1.6] text-ink">
        O site apareceu {contar(buscas.aparicoes, ["vez", "vezes"])} nos resultados do Google e recebeu{" "}
        <strong className="font-medium text-ink-strong">{contar(buscas.cliques, ["clique", "cliques"])}</strong>.
        {buscas.posicao !== null &&
          ` Em média, ele aparece na posição ${POSICAO.format(buscas.posicao)} — a primeira página do Google mostra cerca de 10 resultados.`}
      </p>
      <p className="mt-2 text-[1.0625rem] leading-[1.6] text-ink">
        {buscas.anterior
          ? comparacaoEmPalavras(buscas.cliques, buscas.anterior.cliques, periodo, ["clique", "cliques"])
          : `Ainda não há ${rotuloDoPeriodo(periodo)} anteriores guardados para comparar.`}
      </p>

      {buscas.consultas.length === 0 ? (
        <p className="mt-6 text-[1.0625rem] leading-[1.6] text-muted">Nenhuma busca trouxe o site neste período.</p>
      ) : (
        <>
          <h3 className="mt-8 text-[1rem] font-medium text-ink-strong">Buscas que mais trouxeram gente</h3>
          {/* Lista, e nao tabela: tres colunas nao cabem em 320px sem rolar para o lado. */}
          <ol className="mt-3 divide-y divide-rule border-y border-rule">
            {buscas.consultas.map((c) => (
              <li key={c.consulta} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 [overflow-wrap:anywhere] text-[1rem] text-ink-strong">“{c.consulta}”</span>
                <span className="shrink-0 text-[0.9375rem] text-ink tabular-nums">
                  {contar(c.cliques, ["clique", "cliques"])}
                  {c.posicao !== null && (
                    <span className="text-muted"> · posição {POSICAO.format(c.posicao)}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[0.875rem] leading-[1.6] text-muted">
            O Google não mostra as buscas feitas por pouquíssimas pessoas, então a lista não soma o total.
          </p>
        </>
      )}

      {buscas.textos.length > 0 && (
        <>
          <h3 className="mt-8 text-[1rem] font-medium text-ink-strong">Textos que mais recebem gente do Google</h3>
          <div className="mt-4">
            <BarrasHorizontais itens={itensDeTextos(buscas.textos, "cliques")} rotulo="Textos por cliques vindos do Google" />
          </div>
        </>
      )}
    </Secao>
  );
}

function AntesEDepois({
  buscas,
  migracao,
  primeiroDia,
  ultimoDia,
}: {
  buscas: Buscas;
  migracao: string | null;
  primeiroDia: string;
  ultimoDia: string;
}) {
  const meses = mesesSemBuraco(buscas.meses);
  const pontos: Ponto[] = meses.map((m) => ({
    chave: m.mes,
    rotulo: mesPorExtenso(m.mes),
    rotuloCurto: mesCurto(m.mes),
    valor: m.cliques,
    valorEscrito: m.cliques === null ? "sem número guardado" : contar(m.cliques, ["clique", "cliques"]),
  }));
  const marcaNoGrafico = migracao && meses.some((m) => m.mes === migracao) ? migracao : null;

  let frase: string;
  if (!migracao) {
    frase = "A data da mudança do site ainda não foi marcada. Quando for, o gráfico mostra onde ela cai e compara os meses de antes com os de depois.";
  } else {
    const { antes, depois } = mediasAntesEDepois(meses, migracao, primeiroDia, ultimoDia);
    const mesDaMudanca = mesPorExtenso(migracao);
    if (antes && depois) {
      frase = `Antes da mudança (${mesDaMudanca}), o site recebia em média ${contar(antes.media, ["clique", "cliques"])} do Google por mês; depois, ${contar(depois.media, ["clique", "cliques"])}. A conta usa só meses inteiros, sem o mês da mudança.`;
    } else if (antes) {
      frase = `Ainda não há um mês inteiro depois da mudança (${mesDaMudanca}) para comparar. Antes dela, a média era de ${contar(antes.media, ["clique", "cliques"])} do Google por mês.`;
    } else {
      frase = `Não há meses inteiros guardados de antes da mudança (${mesDaMudanca}) para comparar.`;
    }
  }

  return (
    <Secao id="numeros-mudanca" titulo="Antes e depois da mudança do site">
      <p className="mt-3 text-[1.0625rem] leading-[1.6] text-ink">{frase}</p>
      {pontos.length > 1 && (
        <div className="mt-6">
          <ColunasMensais
            pontos={pontos}
            marca={marcaNoGrafico}
            rotulo="Cliques vindos do Google por mês"
            rotuloDaMarca="Mudança do site"
          />
        </div>
      )}
    </Secao>
  );
}

/* ------------------------------------------------------------ detalhes */

function Detalhes({
  visitas,
  fontes,
  agora,
  ano,
}: {
  visitas: Visitas | null;
  fontes: Record<Fonte, EstadoDaFonte>;
  agora: number;
  ano: number;
}) {
  const barras = (contagens: Contagem[]): ItemDeBarra[] =>
    contagens.map((c) => ({
      chave: c.nome,
      rotulo: c.nome,
      valor: c.pessoas,
      valorEscrito: contar(c.pessoas, ["pessoa", "pessoas"]),
    }));

  return (
    <details className="mt-14 border-t border-rule pt-6">
      <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-[1rem] font-medium text-ink-strong">
        Detalhes: país, aparelho e coleta
      </summary>

      {visitas && visitas.paises.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[1rem] font-medium text-ink-strong">País</h3>
          <div className="mt-4">
            <BarrasHorizontais itens={barras(visitas.paises)} rotulo="Pessoas por país" />
          </div>
        </div>
      )}
      {visitas && visitas.aparelhos.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[1rem] font-medium text-ink-strong">Aparelho</h3>
          <div className="mt-4">
            <BarrasHorizontais itens={barras(visitas.aparelhos)} rotulo="Pessoas por aparelho" />
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-[1rem] font-medium text-ink-strong">Coleta</h3>
        <dl className="mt-3 space-y-4 text-[0.9375rem] leading-[1.6]">
          {(["vercel", "busca"] as const).map((fonte) => {
            const estado = fontes[fonte];
            return (
              <div key={fonte}>
                <dt className="text-ink-strong">{fonte === "vercel" ? "Visitas (Vercel)" : "Buscas (Google Search Console)"}</dt>
                <dd className="text-muted">
                  {!estado.configurada
                    ? "Não configurada neste servidor."
                    : !estado.ultima
                      ? "Configurada; nenhuma coleta registrada ainda."
                      : `Última coleta ${quandoFoi(estado.ultima.em, new Date(agora))}: ${
                          estado.ultima.situacao === "ok"
                            ? `deu certo, ${contar(estado.ultima.linhas, ["linha gravada", "linhas gravadas"])}`
                            : estado.ultima.situacao === "erro"
                              ? `falhou (${estado.ultima.erro ?? "sem detalhe"})`
                              : "a fonte estava sem credencial"
                        }.`}
                  {estado.primeiroDia && estado.ultimoDia && (
                    <> Guardado de {dataPorExtenso(estado.primeiroDia, ano)} a {dataPorExtenso(estado.ultimoDia, ano)}.</>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </details>
  );
}
