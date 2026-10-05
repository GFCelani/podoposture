import { type CSSProperties } from "react";

import { hrefDoDestino, segmentosDoSubtitulo, type ConteudoHero } from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { FiguraCorpo } from "./figura-corpo";
import {
  Anotacao,
  LINHAS_DE_REFERENCIA,
  Pedacos,
  porLinha,
  TituloEmLinhas,
  unirItens,
} from "./hero";
import { MapaDeDor } from "./mapa-de-dor";

import "./hero-cabecalho-plano.css";
import "./hero-v4-impressa-comum.css";
import "./hero-v4-impressa.css";

/**
 * HERO NOVO, VARIANTE 4 — PRANCHA IMPRESSA.
 *
 * Referencia: o cartaz suico e a prancha anatomica de parede. Papel, grade de
 * doze colunas aparente (fios de 1px, o "papel milimetrado" da composicao),
 * titulo grande alinhado a grade, e as duas figuras impressas em tinta azul
 * escura direto no papel, sem painel e sem fundo de cor. As linhas de
 * referencia nascem nos rotulos, no vao entre o titulo e as figuras, e
 * atravessam o corpo: o rotulo le da esquerda para a direita ate a regiao.
 *
 * A ficha sob o titulo e' um formulario em duas colunas da grade: quem e onde
 * a esquerda, as duas acoes empilhadas a direita.
 *
 * As figuras sao as de producao (FiguraCorpo + MapaDeDor): so a tinta muda,
 * por variavel CSS no embrulho (o desenho pinta com var(--color-paper)).
 */
const BOTOES = [
  { variant: "primary", icone: "balao" },
  { variant: "secondary", icone: "pergunta" },
] as const;

/* Dois fios de construcao emolduram a prancha: a origem dos rotulos (860u)
   e a margem direita. A grade de doze colunas inteira nao batia com os
   elementos e lia como sobra de desenvolvimento. */
const FIOS = 2;

export function HeroImpressa({
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

  return (
    <section className="hv4" data-tone="light">
      <div aria-hidden="true" className="hv4-grade">
        {Array.from({ length: FIOS }, (_, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>

      <div className="hv4-palco">
        <div className="hv4-texto">
          <h1 className="hv4-titulo">
            <TituloEmLinhas linhas={conteudo.tituloLinhas} destaque={conteudo.destaque} />
          </h1>

          <span aria-hidden="true" className="hv4-regua" />

          <div className="hv4-ficha">
            <div className="hv4-assina hv4-entra" style={{ "--d": "260ms" } as CSSProperties}>
              <p className="hv4-credencial">
                <Pedacos pedacos={credencial} />
              </p>
              <p className="hv4-dado">
                {lugar.length > 0 && (
                  <span>
                    <Pedacos pedacos={lugar} />
                  </span>
                )}
                <span className="hv4-dado-anos">
                  <span aria-hidden="true" className="hv4-dado-fio" />
                  {anosDeExperiencia} anos de experiência clínica
                </span>
              </p>
            </div>

            <div className="hv4-acoes hv4-entra" style={{ "--d": "320ms" } as CSSProperties}>
              {conteudo.botoes.map((botao, i) => {
                const forma = BOTOES[i] ?? BOTOES[1];
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
        </div>

        <div className="hv4-campo">
          <div className="hv4-quadro">
            {LINHAS_DE_REFERENCIA.map(({ y, abordagem, marca }, i) => (
              <div
                key={y}
                aria-hidden="true"
                className="hv4-linha"
                style={
                  {
                    top: `${((y / 560) * 100).toFixed(2)}%`,
                    "--d": `${440 + i * 70}ms`,
                  } as CSSProperties
                }
              >
                <span className="hv4-rotulo">
                  <span>{abordagem}</span>
                  <span>{marca}</span>
                </span>
                <span className="hv4-linha-n">{i + 1}</span>
                <span className="hv4-linha-fio" />
              </div>
            ))}
            <div className="hv4-par">
              <div className="pd-fig pd-fig--frontal hv4-fig" style={{ "--d": "220ms" } as CSSProperties}>
                <FiguraCorpo vista="frontal" mapa className="hero-figura" />
                <MapaDeDor vista="frontal" />
              </div>
              <div className="pd-fig pd-fig--perfil hv4-fig" style={{ "--d": "300ms" } as CSSProperties}>
                <FiguraCorpo vista="perfil" mapa fase={2.3} className="hero-figura" />
                <MapaDeDor vista="perfil" />
                <Anotacao ponto="ciatica" linhas={conteudo.convite} />
                <Anotacao ponto="lombar" linhas={conteudo.convite} />
              </div>
            </div>
            <span aria-hidden="true" className="hv4-solo" />
          </div>

          {/* Abaixo de 1200px as linhas saem (nao ha vao para o rotulo entre
              texto e figura) e as tres abordagens viram legenda sob o par. */}
          <ul aria-hidden="true" className="hv4-legenda">
            {LINHAS_DE_REFERENCIA.map(({ y, abordagem, marca }, i) => (
              <li key={y}>
                <span className="hv4-legenda-n">{i + 1}</span>
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
