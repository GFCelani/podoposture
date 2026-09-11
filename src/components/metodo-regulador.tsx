import { hrefDoDestino, type ConteudoMetodo } from "@/lib/conteudo-tipos";

import { ButtonLink } from "./button-link";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/*
 * O texto vem do painel (padrao em conteudo-padrao.ts, copy da cliente com as
 * duas grafias intencionais). O botao aceita destino "nenhum": enquanto a
 * pagina do metodo nao existe, ele nasce inativo (aria-disabled, sem href; ver
 * ButtonLink).
 */

/**
 * Secao 06 da home, entre a abordagem (05) e as condicoes tratadas (07).
 *
 * Banda escura, como a 04: e' a peca propria da clinica, e o valor de fundo
 * e' a alavanca mais barata de presenca. Para nao repetir a composicao da 04
 * (texto a esquerda, figura a direita), aqui a figura mora SOB o titulo, na
 * coluna esquerda, e o corpo inteiro vai para a direita.
 *
 * A figura e' o que o texto descreve: varios fatores (seis fios que entram
 * pela esquerda) convergem numa leitura (o ponto com sonar) da qual sai um
 * caminho so (o traco que segue para a direita). Nao tem rotulo de proposito:
 * qualquer palavra ali seria copy que a cliente nao escreveu. O movimento e'
 * um pulso que percorre cada fio ate o ponto, em fases diferentes; com
 * movimento reduzido os fios ficam inteiros e parados, porque o repouso vive
 * no traco base, nao na animacao.
 */
export function MetodoRegulador({ conteudo, whatsapp }: { conteudo: ConteudoMetodo; whatsapp: string }) {
  const { titulo, abertura, corpo, botao } = conteudo;

  return (
    <section
      id="metodo-regulador"
      data-tone="deep"
      className="relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 lg:px-10 md:py-24 lg:py-28">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-5">
            <Reveal variante="cortina">
              <SectionMark n="06" tone="deep" />
              {/* Caixa alta e' a escrita da cliente, nao CSS: por isso o
                  tracking abre em vez de fechar, que e' o que versal pede
                  em corpo de display. O ® desce de tamanho e sobe de linha,
                  mas continua no texto. Por isso o painel recusa ® digitado
                  no titulo: sairia dobrado. */}
              <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[0.04em] text-paper">
                {titulo}
                <span className="align-super text-[0.5em] tracking-normal">®</span>
              </h2>
            </Reveal>

            <Reveal delay={200}>
              <Leitura className="mt-12 w-full max-w-[440px] lg:mt-16" />
            </Reveal>
          </div>

          <div className="mt-14 lg:col-span-6 lg:col-start-7 lg:mt-0">
            <Reveal delay={120}>
              <p className="max-w-[26ch] font-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.3] font-medium text-balance text-paper">
                {abertura}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div
                aria-hidden="true"
                className="mt-10 h-px w-full max-w-[420px] bg-paper/[0.14]"
              />
              <div className="mt-10 max-w-[58ch] space-y-6">
                {corpo.map((paragrafo, i) => (
                  <p
                    key={i}
                    className="text-[1.0625rem] leading-[1.75] text-on-deep-muted"
                  >
                    {paragrafo}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={360}>
              <div className="mt-11">
                <ButtonLink href={hrefDoDestino(botao.destino, whatsapp)} variant="secondary-deep">
                  {botao.rotulo}
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Seis fios convergindo num ponto, e um traco saindo dele.
 *
 * Tudo em <path>, inclusive o traco reto: pathLength so vale em <path> no
 * Chrome, e e' com pathLength="100" que o pulso (.leitura-pulso) anda em
 * porcentagem do fio, com a mesma duracao em fios de comprimentos
 * diferentes. Cada fio tem uma fase, entao os pulsos chegam ao ponto em
 * momentos diferentes: e' a leitura juntando fatores, nao um flash.
 */
const NO = { x: 252, y: 80 } as const;
const ORIGENS = [14, 40, 66, 94, 120, 146] as const;

function Leitura({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 420 160"
        aria-hidden="true"
        className="block h-auto w-full overflow-visible"
      >
        {/* fios em repouso, inteiros */}
        {ORIGENS.map((y) => (
          <path
            key={y}
            d={`M0 ${y} C 112 ${y}, 140 ${NO.y}, ${NO.x} ${NO.y}`}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity="0.28"
            strokeWidth="1.2"
          />
        ))}
        <path
          d={`M${NO.x} ${NO.y} H 404`}
          fill="none"
          stroke="var(--color-accent-light)"
          strokeOpacity="0.55"
          strokeWidth="1.6"
        />

        {/* pulsos: um segmento de 12% que percorre cada fio ate o ponto */}
        {ORIGENS.map((y, i) => (
          <path
            key={`p${y}`}
            d={`M0 ${y} C 112 ${y}, 140 ${NO.y}, ${NO.x} ${NO.y}`}
            pathLength="100"
            fill="none"
            stroke="var(--color-accent-light)"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="leitura-pulso"
            style={{
              ["--dur" as string]: `${6.5 + (i % 3) * 0.9}s`,
              ["--fase" as string]: `${-i * 1.15}s`,
            }}
          />
        ))}
        <path
          d={`M${NO.x} ${NO.y} H 404`}
          pathLength="100"
          fill="none"
          stroke="var(--color-paper)"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="leitura-pulso"
          style={{
            ["--dur" as string]: "4.2s",
            ["--fase" as string]: "-1.4s",
          }}
        />

        {/* origens e destino */}
        {ORIGENS.map((y) => (
          <circle
            key={`o${y}`}
            cx="0"
            cy={y}
            r="2.6"
            fill="var(--color-paper)"
            fillOpacity="0.7"
          />
        ))}
        <circle cx="410" cy={NO.y} r="4" fill="var(--color-accent-light)" />
      </svg>

      {/* o ponto da leitura, com o sonar das articulacoes do hero */}
      <span
        aria-hidden="true"
        className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(NO.x / 420) * 100}%`, top: `${(NO.y / 160) * 100}%` }}
      >
        <span
          className="sonar-onda absolute inset-0 rounded-full border border-accent-light"
          style={{ ["--escala" as string]: 4, ["--dur" as string]: "5s" }}
        />
        <span className="sonar-ponto absolute inset-0 rounded-full bg-accent-light" />
      </span>
    </div>
  );
}
