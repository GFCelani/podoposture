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
import type { Foto } from "@/lib/ilustracao-da-pagina";

import { ConviteConsulta } from "./convite-consulta";
import { PageGrid } from "./layers";
import { PageShell } from "./page-shell";
import { FotoEmMoldura } from "./pagina-interna";
import { Reveal } from "./reveal";

/**
 * "Como é o meu atendimento": o metodo da Dra. Claudia em oito etapas.
 *
 * O texto e' o da cliente, inteiro e na ordem (lib/atendimento.ts); aqui so
 * se decide a forma, e a forma e' a das outras paginas internas: o mesmo
 * topo com foto em moldura, os mesmos titulos (.pi-h2), o mesmo corpo
 * (.prosa), os mesmos fundos (papel e areia) e o mesmo respiro das faixas.
 *
 * Uma grade so, do topo ao fecho, e e' a do proprio topo: doze colunas, texto
 * em 1-7 e imagem em 9-12. Toda faixa abaixo repete essas duas colunas, entao
 * o titulo de cada etapa cai na mesma abscissa do titulo da pagina, e cada
 * foto na mesma coluna e na mesma largura da foto do topo. Etapa sem foto
 * deixa a coluna da direita vazia. Abaixo de 1024 tudo empilha: titulo,
 * texto e a foto por ultimo.
 *
 * Fotografias: so da clinica, nenhuma em outro lugar do site. Etapa para a
 * qual o acervo nao tem foto inedita fica sem imagem.
 */

const GALERIA = "/img/galeria";

const FOTO_DO_TOPO: Foto = {
  src: `${GALERIA}/bancada-do-consultorio.webp`,
  alt: "Bancada branca do consultório com abajur aceso, livros, um modelo de osso e dois quadros encostados na parede: um cérebro em aquarela e vértebras coloridas.",
  legenda: "A bancada do consultório.",
  largura: 960,
  altura: 1200,
};

/** A foto de cada etapa, pelo id da etapa. Sem entrada, sem foto. */
const FOTOS_DAS_ETAPAS: Partial<Record<string, Foto>> = {
  "compreender-a-sua-historia": {
    src: `${GALERIA}/mesa-da-consulta.webp`,
    alt: "Mesa de atendimento do consultório, com notebook e duas cadeiras brancas de frente para ela; ao lado, a bancada com o abajur aceso.",
    legenda: "A mesa do consultório, onde a consulta começa.",
    largura: 1200,
    altura: 750,
  },
  "avaliacao-postural-e-biomecanica": {
    src: `${GALERIA}/corredor-com-espelho.webp`,
    alt: "Faixa de marcha no piso do consultório, com a plataforma de pressão no meio, diante de um espelho de corpo inteiro.",
    legenda: "A faixa de marcha, com a plataforma de pressão e o espelho.",
    largura: 960,
    altura: 1200,
  },
  "plano-terapeutico": {
    src: `${GALERIA}/palmilhas-na-bancada.webp`,
    alt: "Par de palmilhas cinza sobre a bancada do consultório, diante de dois quadros com ilustrações da coluna vertebral.",
    legenda: "Palmilhas posturais sobre a bancada do consultório.",
    largura: 960,
    altura: 1200,
  },
  "acompanhamento-da-evolucao": {
    src: `${GALERIA}/baropodometria-na-tela.webp`,
    alt: "Tela de notebook com o mapa colorido da pressão dos dois pés, em duas medições lado a lado, com a porcentagem de carga de cada região.",
    legenda: "Duas medições da pressão plantar, lado a lado na tela.",
    largura: 1100,
    altura: 688,
  },
};

type Tom = "paper" | "surface";

export function ComoEOMeuAtendimento() {
  return (
    <PageShell
      tipo="institucional"
      titulo={TITULO_DO_ATENDIMENTO}
      subtitulo={ABERTURA_DO_ATENDIMENTO.join(" ")}
      subtituloLinhas={[...ABERTURA_DO_ATENDIMENTO]}
      trilha={[{ nome: TITULO_DO_ATENDIMENTO }]}
      midia={<FotoEmMoldura foto={FOTO_DO_TOPO} />}
    >
      <Introducao />
      {/* Papel e areia alternados; a introducao, logo abaixo do topo em
          areia, e' papel, entao a primeira etapa abre em areia. */}
      {ETAPAS_DO_ATENDIMENTO.map((etapa, i) => (
        <Etapa key={etapa.id} etapa={etapa} tom={i % 2 === 0 ? "surface" : "paper"} />
      ))}
      <Fecho />
      <ConviteConsulta />
    </PageShell>
  );
}

/* ------------------------------------------------------------ pecas */

/** Uma faixa da pagina, com a grade de duas colunas. */
function Faixa({
  tom,
  rotulo,
  rotuloId,
  fio = false,
  children,
}: {
  tom: Tom;
  rotulo?: string;
  rotuloId?: string;
  /** Fio no topo, para separar duas faixas seguidas em papel. */
  fio?: boolean;
  children: ReactNode;
}) {
  const fundo = tom === "surface" ? "border-y border-rule bg-surface" : fio ? "border-t border-rule" : "";
  return (
    <section
      aria-label={rotulo}
      aria-labelledby={rotuloId}
      className={`ja-faixa relative overflow-hidden ${fundo}`}
    >
      <PageGrid />
      <div className="ja-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">
        <div className="ja-grade">{children}</div>
      </div>
    </section>
  );
}

/** A foto de uma etapa: a mesma moldura e a mesma legenda da foto do topo. */
function FotoDaEtapa({ foto }: { foto: Foto }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-plate">
      <Image
        src={foto.src}
        alt={foto.alt}
        width={foto.largura}
        height={foto.altura}
        sizes="(min-width: 1024px) 380px, 360px"
        className="h-auto w-full rounded-md saturate-[0.9]"
      />
      <figcaption
        className="flex items-start gap-3 px-1 pt-3 pb-1 text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-muted"
        style={{ fontFamily: "var(--mono)" }}
      >
        <span aria-hidden="true" className="mt-[0.55em] h-px w-6 shrink-0 bg-rule" />
        {foto.legenda}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------- introducao */

function Introducao() {
  const [primeira, ...resto] = INTRODUCAO_DO_ATENDIMENTO;
  return (
    <Faixa tom="paper" rotulo="Introdução">
      <div className="ja-texto">
        <Reveal>
          <div className="pi-lead">
            <p>{primeira}</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="prosa ja-prosa ja-depois-do-lead">
            {resto.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Reveal>
      </div>
    </Faixa>
  );
}

/* ------------------------------------------------------------ etapa */

function Etapa({ etapa, tom }: { etapa: EtapaDoAtendimento; tom: Tom }) {
  const foto = FOTOS_DAS_ETAPAS[etapa.id];
  return (
    <Faixa tom={tom} rotuloId={etapa.id}>
      <div className="ja-texto">
        <Reveal variante="cortina">
          <h2 id={etapa.id} className="pi-h2">
            {etapa.titulo}
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <CorpoDaEtapa etapa={etapa} />
        </Reveal>
      </div>
      {foto && (
        <Reveal delay={160} className="ja-foto">
          <FotoDaEtapa foto={foto} />
        </Reveal>
      )}
    </Faixa>
  );
}

/** Os paragrafos na ordem do texto; a lista do passo 6 no lugar dela. */
function CorpoDaEtapa({ etapa }: { etapa: EtapaDoAtendimento }) {
  const p = etapa.paragrafos;
  const corte = etapa.lista ? (etapa.listaDepois ?? p.length) : p.length;
  return (
    <div className="prosa ja-prosa ja-corpo">
      {p.slice(0, corte).map((t) => (
        <p key={t}>{t}</p>
      ))}
      {etapa.lista && (
        <ul>
          {etapa.lista.map((r) => (
            <li key={r.texto}>{r.href ? <Link href={r.href}>{r.texto}</Link> : r.texto}</li>
          ))}
        </ul>
      )}
      {p.slice(corte).map((t) => (
        <p key={t}>{t}</p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ fecho */

function Fecho() {
  const [perguntas, proposta] = FECHO_DO_ATENDIMENTO;
  return (
    <Faixa tom="paper" rotulo="Fechamento" fio>
      <div className="ja-texto">
        <Reveal>
          <p aria-hidden="true" className="ja-separador">
            {SEPARADOR_DO_ATENDIMENTO}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="pi-lead ja-depois-do-separador">
            <p>{perguntas}</p>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <div className="prosa ja-prosa ja-depois-do-lead">
            <p>{proposta}</p>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="pi-citacao ja-citacao">
            <blockquote>
              <p>{CITACAO_DO_ATENDIMENTO}</p>
            </blockquote>
          </div>
        </Reveal>
        <Reveal delay={260}>
          <div className="ja-assinatura">
            <p className="font-display text-[1.375rem] leading-[1.2] font-semibold text-ink-strong md:text-[1.5rem]">
              {ASSINATURA_DO_ATENDIMENTO.nome}
            </p>
            <p
              className="mt-2 text-[0.75rem] leading-[1.8] tracking-[0.04em] text-muted"
              style={{ fontFamily: "var(--mono)" }}
            >
              {ASSINATURA_DO_ATENDIMENTO.especialidades}
            </p>
          </div>
        </Reveal>
      </div>
    </Faixa>
  );
}
