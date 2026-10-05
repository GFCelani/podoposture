import Image from "next/image";
import { type CSSProperties } from "react";

import { hrefDoDestino, segmentosDoSubtitulo, type ConteudoHero } from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { FiguraCorpo } from "./figura-corpo";
import {
  Anotacao,
  FORMA_DOS_BOTOES,
  LINHAS_DE_REFERENCIA,
  Pedacos,
  porLinha,
  TituloEmLinhas,
  unirItens,
} from "./hero";
import { MapaDeDor } from "./mapa-de-dor";

import "./hero-cabecalho-plano.css";
import "./hero-v5-sala-escura-comum.css";
import "./hero-v5-sala-escura.css";

/**
 * HERO NOVO, VARIANTE 5 — SALA ESCURA.
 *
 * Referencia: as paginas escuras de marcas de cuidado (Aesop, Le Labo) e o
 * plano de cinema. O fundo e' o grafite quente da paleta (ink-strong), nao o
 * azul. A fotografia da sala de atendimento cobre o hero inteiro em
 * monocromo quente (a luz da foto, a cor do grafite), com um empurrao lento
 * de camera na entrada. O texto fica ancorado embaixo a esquerda, como a
 * legenda de um plano; as figuras ficam de pe a direita, dentro da sala.
 *
 * Azul so onde ele e' informacao: o destaque do titulo e a coluna desenhada.
 * Verde so nos pontos e no botao.
 */
export function HeroSalaEscura({
  conteudo,
  whatsapp,
  anosDeExperiencia,
}: {
  conteudo: ConteudoHero;
  whatsapp: string;
  anosDeExperiencia: number;
}) {
  const segmentos = segmentosDoSubtitulo(conteudo.subtituloLinhas, conteudo.destaquesDoSubtitulo);
  const [credencial = [], ...demais] = porLinha(unirItens(segmentos, conteudo.subtituloLinhas));
  const lugar = demais.flat();
  const fundo = conteudo.fundo[0];

  return (
    <section className="hv5" data-tone="deep">
      <div aria-hidden="true" className="hv5-foto">
        <div className="hv5-foto-mov">
          {fundo && (
            <Image
              src={fundo.src}
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="100vw"
              className="hv5-img"
            />
          )}
        </div>
        <span className="hv5-veu" />
        <span className="hv5-grao" />
      </div>

      <div className="hv5-palco">
        <div className="hv5-texto">
          <h1 className="hv5-titulo">
            <TituloEmLinhas linhas={conteudo.tituloLinhas} destaque={conteudo.destaque} />
          </h1>

          <p className="hv5-credencial hv5-entra" style={{ "--d": "260ms" } as CSSProperties}>
            <Pedacos pedacos={credencial} />
          </p>
          <p className="hv5-dado hv5-entra" style={{ "--d": "300ms" } as CSSProperties}>
            {lugar.length > 0 && (
              <span>
                <Pedacos pedacos={lugar} />
              </span>
            )}
            <span className="hv5-dado-anos">
              <span aria-hidden="true" className="hv5-dado-fio" />
              {anosDeExperiencia} anos de experiência clínica
            </span>
          </p>

          <div className="hv5-acoes hv5-entra" style={{ "--d": "340ms" } as CSSProperties}>
            {conteudo.botoes.map((botao, i) => {
              const forma = FORMA_DOS_BOTOES[i] ?? FORMA_DOS_BOTOES[1];
              return (
                <ButtonLink
                  key={i}
                  href={hrefDoDestino(botao.destino, whatsapp)}
                  variant={forma.variant}
                  icone={forma.icone}
                >
                  {botao.rotulo}
                </ButtonLink>
              );
            })}
          </div>
        </div>

        <div className="hv5-campo">
          <div className="hv5-quadro">
            {LINHAS_DE_REFERENCIA.map(({ y, abordagem, marca }, i) => (
              <div
                key={y}
                aria-hidden="true"
                className="hv5-linha"
                style={
                  {
                    top: `${((y / 560) * 100).toFixed(2)}%`,
                    "--d": `${520 + i * 70}ms`,
                  } as CSSProperties
                }
              >
                <span className="hv5-rotulo">
                  <span>{abordagem}</span>
                  <span>{marca}</span>
                </span>
                <span className="hv5-linha-n">{i + 1}</span>
                <span className="hv5-linha-fio" />
              </div>
            ))}
            <div className="hv5-par">
              <div className="pd-fig pd-fig--frontal hv5-fig" style={{ "--d": "300ms" } as CSSProperties}>
                <FiguraCorpo vista="frontal" mapa className="hero-figura" />
                <MapaDeDor vista="frontal" />
              </div>
              <div className="pd-fig pd-fig--perfil hv5-fig" style={{ "--d": "380ms" } as CSSProperties}>
                <FiguraCorpo vista="perfil" mapa fase={2.3} className="hero-figura" />
                <MapaDeDor vista="perfil" />
                <Anotacao ponto="ciatica" linhas={conteudo.convite} />
                <Anotacao ponto="lombar" linhas={conteudo.convite} />
              </div>
            </div>
            <span aria-hidden="true" className="hv5-solo" />
          </div>

          {/* Abaixo de 1200px as linhas saem e as abordagens viram legenda. */}
          <ul aria-hidden="true" className="hv5-legenda">
            {LINHAS_DE_REFERENCIA.map(({ y, abordagem, marca }, i) => (
              <li key={y}>
                <span className="hv5-legenda-n">{i + 1}</span>
                <span>{abordagem}</span>
                <span>{marca}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
