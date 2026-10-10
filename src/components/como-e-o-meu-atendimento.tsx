import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  ABERTURA_DO_ATENDIMENTO,
  ASSINATURA_DO_ATENDIMENTO,
  CITACAO_DO_ATENDIMENTO,
  ETAPAS_DO_ATENDIMENTO,
  FECHO_DO_ATENDIMENTO,
  INTRODUCAO_DO_ATENDIMENTO,
  SEPARADOR_DO_ATENDIMENTO,
  TITULO_DO_ATENDIMENTO,
  type EtapaDoAtendimento,
} from "@/lib/atendimento";

import {
  FiguraDaAbertura,
  FiguraDaRede,
  FiguraDasConexoes,
  FiguraDoExame,
  FiguraDoSinal,
} from "./atendimento-figuras";
import { ConviteConsulta } from "./convite-consulta";
import { PageGrid } from "./layers";
import { PageShell } from "./page-shell";
import { Reveal } from "./reveal";

/**
 * "Como é o meu atendimento": o metodo da Dra. Claudia em oito etapas.
 *
 * O texto e' o da cliente, inteiro e na ordem (lib/atendimento.ts); aqui so
 * se decide a forma. Ritmo, de cima para baixo:
 *
 *   topo        a casca das paginas internas, com o titulo e as duas
 *               frases de abertura; a direita, a figura do primeiro exemplo
 *               da introducao (a dor cervical e os fios ate mandibula e
 *               ombros).
 *   introducao  a primeira frase grande; o exemplo e o "por isso" ao lado.
 *   indice      as oito etapas em fila, cada uma levando a sua.
 *   jornada     uma banda por etapa, alternando papel, areia e azul
 *               profundo, com um formato proprio em cada (foto ao lado,
 *               placa desenhada, par de fotos, dois casos lado a lado,
 *               lista de recursos). O que as amarra e' o trilho: um fio
 *               vertical que corre pelas oito bandas na abscissa do
 *               numeral, enche conforme a leitura desce e acende o no' de
 *               cada etapa quando ela chega ao meio da tela. So transform
 *               e opacidade, ligados ao scroll por CSS; sem suporte, ou com
 *               movimento reduzido, o trilho ja nasce cheio e parado.
 *   fecho       o separador, os dois paragrafos finais, e a ultima frase
 *               em destaque com a assinatura, em banda profunda.
 *   convite     o mesmo de todas as paginas.
 *
 * Fotografias: so da clinica, e nenhuma aparece em outro lugar do site.
 * Onde o acervo nao tem a cena, a etapa leva ilustracao
 * (atendimento-figuras.tsx).
 */

type Foto = { src: string; alt: string; legenda: string; largura: number; altura: number };

const FOTOS = {
  mesa: {
    src: "/img/galeria/mesa-da-consulta.webp",
    alt: "Mesa de atendimento do consultório, com notebook e duas cadeiras brancas de frente para ela; ao lado, a bancada com o abajur aceso.",
    legenda: "A mesa do consultório, onde a consulta começa.",
    largura: 1200,
    altura: 750,
  },
  corredor: {
    src: "/img/galeria/corredor-com-espelho.webp",
    alt: "Faixa de marcha no piso do consultório, com a plataforma de pressão no meio, diante de um espelho de corpo inteiro.",
    legenda: "A faixa de marcha, com a plataforma de pressão e o espelho.",
    largura: 960,
    altura: 1200,
  },
  tela: {
    src: "/img/galeria/baropodometria-na-tela.webp",
    alt: "Tela de notebook com o mapa colorido da pressão dos dois pés, em duas medições lado a lado, com a porcentagem de carga de cada região.",
    legenda: "Distribuição das pressões plantares na tela, durante o exame.",
    largura: 1100,
    altura: 688,
  },
  relatorio: {
    src: "/img/galeria/relatorio-de-baropodometria.webp",
    alt: "Relatório impresso de baropodometria aberto sobre a mesa, com o mapa de pressão dos dois pés e a tabela de medidas do exame.",
    legenda: "Relatório de baropodometria: as medidas ficam registradas para comparar.",
    largura: 900,
    altura: 564,
  },
} satisfies Record<string, Foto>;

export function ComoEOMeuAtendimento() {
  return (
    <PageShell
      tipo="institucional"
      titulo={TITULO_DO_ATENDIMENTO}
      subtitulo={ABERTURA_DO_ATENDIMENTO.join(" ")}
      subtituloLinhas={[...ABERTURA_DO_ATENDIMENTO]}
      trilha={[{ nome: TITULO_DO_ATENDIMENTO }]}
      midia={<FiguraDaAbertura />}
    >
      <Introducao />
      <Indice />
      <div className="ja-jornada relative">
        <div className="ja-trilho" aria-hidden="true">
          <div className="ja-trilho-cheio" />
        </div>
        {ETAPAS_DO_ATENDIMENTO.map((etapa, i) => (
          <Etapa key={etapa.id} etapa={etapa} indice={i} />
        ))}
      </div>
      <Fecho />
      <ConviteConsulta />
    </PageShell>
  );
}

/* ------------------------------------------------------------ pecas */

const P = "text-[1.0625rem] leading-[1.75] md:text-[1.125rem]";

function Paragrafo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`${P} max-w-[62ch] ${className}`}>{children}</p>;
}

/** Primeiro paragrafo de cada etapa: um degrau acima do corpo. */
function Lead({ children, deep = false }: { children: ReactNode; deep?: boolean }) {
  return (
    <p
      className={`max-w-[44ch] text-[1.1875rem] leading-[1.6] font-medium tracking-[-0.005em] md:text-[1.3125rem] ${
        deep ? "text-paper" : "text-ink-strong"
      }`}
    >
      {children}
    </p>
  );
}

/** A frase que fecha a etapa, em display com fio de acento a esquerda. */
function Destaque({ children, deep = false }: { children: ReactNode; deep?: boolean }) {
  return (
    <p
      className={`max-w-[34ch] border-l-2 pl-5 font-display text-[clamp(1.3125rem,1.05rem+1vw,1.75rem)] leading-[1.3] font-medium tracking-[-0.01em] text-balance md:pl-7 ${
        deep ? "border-accent-light text-paper" : "border-accent text-ink-strong"
      }`}
    >
      {children}
    </p>
  );
}

function FotoEmMoldura({ foto, sizes, deep = false }: { foto: Foto; sizes: string; deep?: boolean }) {
  return (
    <figure>
      <div className="overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-plate">
        <Image
          src={foto.src}
          alt={foto.alt}
          width={foto.largura}
          height={foto.altura}
          sizes={sizes}
          className="h-auto w-full rounded-md saturate-[0.92]"
        />
      </div>
      <figcaption
        className={`mt-3 flex items-start gap-3 text-[0.6875rem] leading-[1.6] tracking-[0.08em] ${
          deep ? "text-on-deep-muted" : "text-muted"
        }`}
        style={{ fontFamily: "var(--mono)" }}
      >
        <span aria-hidden="true" className={`mt-[0.55em] h-px w-6 shrink-0 ${deep ? "bg-on-deep-muted/50" : "bg-rule"}`} />
        {foto.legenda}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------- introducao */

function Introducao() {
  const [primeira, exemplo, porIsso] = INTRODUCAO_DO_ATENDIMENTO;
  return (
    <section aria-label="Introdução" className="relative overflow-hidden">
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 md:py-24 lg:px-10 lg:py-28">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-6">
          <Reveal className="lg:col-span-7">
            <span aria-hidden="true" className="ja-ponto mb-8 block" />
            <p className="max-w-[24ch] font-display text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] leading-[1.15] font-medium tracking-[-0.018em] text-balance text-ink-strong">
              {primeira}
            </p>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-4 lg:col-start-9 lg:pt-3">
            <span aria-hidden="true" className="mb-6 block h-px w-full bg-rule" />
            <Paragrafo className="text-ink">{exemplo}</Paragrafo>
          </Reveal>
          <Reveal delay={200} className="lg:col-span-9 lg:col-start-3">
            <p className="max-w-[56ch] border-t border-rule pt-8 text-[1.1875rem] leading-[1.65] text-ink-strong md:text-[1.3125rem]">
              {porIsso}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- indice */

function Indice() {
  return (
    <nav aria-label="As etapas do atendimento" className="relative overflow-hidden border-y border-rule bg-surface">
      <PageGrid />
      <div className="relative mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-16 lg:px-10">
        <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2 sm:gap-y-8 lg:grid-cols-4 lg:gap-y-10">
          {ETAPAS_DO_ATENDIMENTO.map((etapa, i) => (
            <li key={etapa.id} className="flex">
              <Reveal delay={Math.min(280, 40 * i)} className="flex w-full">
                <a href={`#${etapa.id}`} className="ja-parada group flex w-full gap-4 py-3 sm:block sm:py-0">
                  <span aria-hidden="true" className="ja-parada-linha hidden sm:block">
                    <span className="ja-parada-no" />
                  </span>
                  <span
                    className="block shrink-0 pt-[0.2em] text-[0.8125rem] tracking-[0.06em] text-accent sm:mt-4"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {etapa.numero}
                  </span>
                  <span className="block text-[0.9375rem] leading-[1.45] text-ink transition-colors duration-[var(--dur-media)] group-hover:text-accent sm:mt-2">
                    {etapa.titulo}
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------ etapa */

type Tom = "paper" | "surface" | "deep";

/** Ritmo das bandas: papel, areia, profundo, e de novo, sem repetir vizinho. */
const TONS: readonly Tom[] = ["paper", "surface", "deep", "paper", "surface", "paper", "surface", "deep"];

function Etapa({ etapa, indice }: { etapa: EtapaDoAtendimento; indice: number }) {
  const tom = TONS[indice];
  const deep = tom === "deep";
  const fundo = deep ? "bg-deep-calm text-paper" : tom === "surface" ? "border-y border-rule bg-surface" : "";
  return (
    <section
      aria-labelledby={etapa.id}
      className={`ja-etapa relative overflow-hidden ${fundo}`}
      data-tone={deep ? "deep" : undefined}
    >
      <PageGrid tone={deep ? "deep" : "light"} />
      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 md:py-24 lg:px-10 lg:py-28">
        <div className="ja-etapa-grade">
          <div className="ja-lateral" aria-hidden="true">
            <div className="ja-lateral-in">
              <span className="ja-no">
                <span className="ja-no-cheio" />
              </span>
              <span className={`ja-numeral ${deep ? "text-accent-light" : "text-accent"}`}>{etapa.numero}</span>
            </div>
          </div>
          <div className="min-w-0">
            <Reveal variante="cortina">
              <h2
                id={etapa.id}
                className={`ja-titulo max-w-[22ch] font-display text-[clamp(1.75rem,1.25rem+2.1vw,2.875rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance ${
                  deep ? "text-paper" : "text-ink-strong"
                }`}
              >
                <span className={`ja-numeral-titulo md:sr-only ${deep ? "text-accent-light" : "text-accent"}`}>
                  {etapa.numero}
                </span>{" "}
                {etapa.titulo}
              </h2>
            </Reveal>
            <div className={`mt-10 md:mt-12 ${deep ? "text-on-deep-muted" : "text-ink"}`}>
              <CorpoDaEtapa etapa={etapa} indice={indice} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Um formato por etapa. A ordem dos paragrafos e' sempre a do texto. */
function CorpoDaEtapa({ etapa, indice }: { etapa: EtapaDoAtendimento; indice: number }) {
  const p = etapa.paragrafos;
  switch (indice) {
    /* 1. a historia: texto e a mesa da consulta lado a lado */
    case 0:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <Reveal delay={80} className="space-y-5 lg:col-span-5">
            <Lead>{p[0]}</Lead>
            <Paragrafo>{p[1]}</Paragrafo>
            <Paragrafo>{p[2]}</Paragrafo>
          </Reveal>
          <Reveal delay={180} className="lg:col-span-5 lg:pt-2">
            <FotoEmMoldura foto={FOTOS.mesa} sizes="(min-width: 1024px) 470px, 100vw" />
          </Reveal>
          <Reveal delay={120} className="lg:col-span-8">
            <Destaque>{p[3]}</Destaque>
          </Reveal>
        </div>
      );

    /* 2. o exame: texto e a placa do trajeto do nervo */
    case 1:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <div className="space-y-5 lg:col-span-6">
            <Reveal delay={80}>
              <Lead>{p[0]}</Lead>
            </Reveal>
            <Reveal delay={140} className="space-y-5">
              <Paragrafo>{p[1]}</Paragrafo>
              <Paragrafo>{p[2]}</Paragrafo>
              <Paragrafo>{p[3]}</Paragrafo>
            </Reveal>
          </div>
          <Reveal delay={200} className="mx-auto w-full max-w-[300px] lg:col-span-3 lg:col-start-8 lg:max-w-none">
            <FiguraDoExame />
          </Reveal>
        </div>
      );

    /* 3. postural e biomecanica: banda profunda, par de fotos */
    case 2:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <Reveal delay={80} className="lg:col-span-7">
            <Lead deep>{p[0]}</Lead>
          </Reveal>
          <Reveal delay={140} className="sm:grid sm:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] sm:items-end sm:gap-6 lg:col-span-10">
            <div className="mx-auto max-w-[340px] sm:max-w-none">
              <FotoEmMoldura foto={FOTOS.corredor} deep sizes="(min-width: 1024px) 380px, (min-width: 640px) 40vw, 340px" />
            </div>
            <div className="mt-10 sm:mt-0">
              <FotoEmMoldura foto={FOTOS.tela} deep sizes="(min-width: 1024px) 580px, (min-width: 640px) 60vw, 100vw" />
            </div>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-5">
            <Paragrafo>{p[1]}</Paragrafo>
          </Reveal>
          <Reveal delay={160} className="lg:col-span-5">
            <Paragrafo>{p[2]}</Paragrafo>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-8">
            <Destaque deep>{p[3]}</Destaque>
          </Reveal>
        </div>
      );

    /* 4. conexoes: a figura com a cadeia e os dois exemplos lado a lado */
    case 3:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <div className="space-y-10 lg:col-span-6">
            <Reveal delay={80} className="space-y-5">
              <Lead>{p[0]}</Lead>
              <Paragrafo>{p[1]}</Paragrafo>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2">
              {[p[2], p[3]].map((texto, k) => (
                <Reveal key={k} delay={140 + 80 * k} className="flex">
                  <div className="ja-caso w-full rounded-lg border border-rule bg-surface p-5 md:p-6">
                    <span aria-hidden="true" className="ja-caso-elo mb-4 block" />
                    <p className="text-[1rem] leading-[1.65] text-ink">{texto}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120}>
              <p className="flex max-w-[60ch] gap-4 text-[1rem] leading-[1.7] text-muted">
                <span aria-hidden="true" className="mt-[0.8em] h-px w-8 shrink-0 bg-accent/40" />
                <span>{p[4]}</span>
              </p>
            </Reveal>
          </div>
          <Reveal delay={200} className="mx-auto w-full max-w-[300px] lg:col-span-3 lg:col-start-8 lg:max-w-none">
            <FiguraDasConexoes />
          </Reveal>
        </div>
      );

    /* 5. sistema nervoso: frase grande, texto e a placa do sinal */
    case 4:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <Reveal delay={80} className="lg:col-span-8">
            <p className="max-w-[30ch] font-display text-[clamp(1.5rem,1.15rem+1.5vw,2.25rem)] leading-[1.25] font-medium tracking-[-0.012em] text-balance text-ink-strong">
              {p[0]}
            </p>
          </Reveal>
          <Reveal delay={140} className="space-y-5 lg:col-span-5">
            <Paragrafo>{p[1]}</Paragrafo>
            <Paragrafo>{p[2]}</Paragrafo>
            <Paragrafo>{p[3]}</Paragrafo>
          </Reveal>
          <div className="space-y-8 lg:col-span-5">
            <Reveal delay={200}>
              <FiguraDoSinal />
            </Reveal>
            <Reveal delay={160}>
              <p className="flex max-w-[60ch] gap-4 text-[1rem] leading-[1.7] text-muted">
                <span aria-hidden="true" className="mt-[0.8em] h-px w-8 shrink-0 bg-accent/40" />
                <span>{p[4]}</span>
              </p>
            </Reveal>
          </div>
        </div>
      );

    /* 6. o plano: a lista de recursos e' a peca da etapa */
    case 5:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <Reveal delay={80} className="space-y-5 lg:col-span-6">
            <Lead>{p[0]}</Lead>
            <Paragrafo>{p[1]}</Paragrafo>
          </Reveal>
          <Reveal delay={140} className="lg:col-span-10">
            <ul className="ja-recursos grid border-t border-rule md:grid-cols-2 md:gap-x-6">
              {etapa.lista?.map((recurso) => (
                <li key={recurso.texto} className="ja-recurso border-b border-rule">
                  {recurso.href ? (
                    <Link href={recurso.href} className="ja-recurso-in group ja-recurso-link">
                      <span className="ja-recurso-texto">{recurso.texto}</span>
                      <span aria-hidden="true" className="ja-recurso-seta">
                        →
                      </span>
                    </Link>
                  ) : (
                    <span className="ja-recurso-in">
                      <span className="ja-recurso-texto">{recurso.texto}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-8">
            <Destaque>{p[2]}</Destaque>
          </Reveal>
          <Reveal delay={160} className="lg:col-span-6">
            <Paragrafo>{p[3]}</Paragrafo>
          </Reveal>
        </div>
      );

    /* 7. acompanhamento: o relatorio do exame a esquerda, o texto a direita */
    case 6:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:gap-x-6">
          <Reveal delay={160} className="lg:order-1 lg:col-span-5 lg:pt-2">
            <FotoEmMoldura foto={FOTOS.relatorio} sizes="(min-width: 1024px) 470px, 100vw" />
          </Reveal>
          <Reveal delay={80} className="space-y-5 lg:order-2 lg:col-span-5">
            <Lead>{p[0]}</Lead>
            <Paragrafo>{p[1]}</Paragrafo>
            <Paragrafo>{p[2]}</Paragrafo>
          </Reveal>
          <Reveal delay={120} className="lg:order-3 lg:col-span-8">
            <Destaque>{p[3]}</Destaque>
          </Reveal>
        </div>
      );

    /* 8. integracao: texto e a rede */
    default:
      return (
        <div className="grid gap-y-10 lg:grid-cols-10 lg:items-center lg:gap-x-6">
          <Reveal delay={80} className="space-y-5 lg:col-span-5">
            <Lead deep>{p[0]}</Lead>
            <Paragrafo>{p[1]}</Paragrafo>
          </Reveal>
          <Reveal delay={180} className="lg:col-span-5">
            <FiguraDaRede />
          </Reveal>
        </div>
      );
  }
}

/* ------------------------------------------------------------ fecho */

function Fecho() {
  const [perguntas, proposta] = FECHO_DO_ATENDIMENTO;
  return (
    <>
      <section aria-label="Fechamento" className="relative overflow-hidden">
        <PageGrid />
        <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 md:py-24 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[760px] text-center">
            <Reveal>
              <p aria-hidden="true" className="ja-separador font-display text-[2.5rem] leading-none text-accent">
                {SEPARADOR_DO_ATENDIMENTO}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <p className="mx-auto mt-10 max-w-[28ch] font-display text-[clamp(1.5rem,1.15rem+1.5vw,2.25rem)] leading-[1.25] font-medium tracking-[-0.012em] text-balance text-ink-strong">
                {perguntas}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <p className={`${P} mx-auto mt-8 max-w-[56ch] text-ink`}>{proposta}</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-label="Assinatura" className="relative overflow-hidden bg-deep-calm text-paper" data-tone="deep">
        <PageGrid tone="deep" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 md:py-24 lg:px-10 lg:py-28">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
            <Reveal variante="cortina" className="lg:col-span-10 lg:col-start-2">
              <blockquote className="ja-citacao">
                <p className="font-display text-[clamp(1.75rem,1.2rem+2.6vw,3.25rem)] leading-[1.18] font-medium tracking-[-0.018em] text-balance text-paper">
                  {CITACAO_DO_ATENDIMENTO}
                </p>
              </blockquote>
            </Reveal>
            <Reveal delay={200} className="mt-12 lg:col-span-10 lg:col-start-2 md:mt-14">
              <div className="flex items-start gap-5">
                <span aria-hidden="true" className="mt-[0.9em] h-px w-14 shrink-0 bg-accent-light/60" />
                <div>
                  <p className="font-display text-[1.5rem] leading-[1.2] font-semibold text-paper md:text-[1.75rem]">
                    {ASSINATURA_DO_ATENDIMENTO.nome}
                  </p>
                  <p
                    className="mt-3 text-[0.75rem] leading-[1.8] tracking-[0.04em] text-on-deep-muted"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {ASSINATURA_DO_ATENDIMENTO.especialidades}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
