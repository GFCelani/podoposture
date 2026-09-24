"use client";

import Link from "next/link";
import { useState } from "react";

import { VARIANTS } from "./button-link";

/**
 * O mapa do Google so e' montado quando a pessoa pede.
 *
 * O iframe carregava sozinho e, com ele, os cookies do Google: o unico
 * cookie de terceiro do site, e o unico que pediria consentimento pela LGPD
 * (Guia de Cookies da ANPD, 2022). Com o clique, o pedido e' o proprio gesto
 * de abrir o mapa, e o site fica so com cookie necessario — por isso nao ha
 * banner. De quebra a pagina deixa de baixar o Maps inteiro para quem nunca
 * chega ate o disco.
 *
 * Ate o clique, o disco mostra `public/img/mapa-capa.svg` (gerado por
 * `scripts/gerar-capa-do-mapa.py`, dados do OpenStreetMap) no mesmo
 * enquadramento, com o pino no centro, onde o embed tambem poe a clinica.
 * A capa e o iframe ocupam a mesma caixa absoluta: trocar um pelo outro nao
 * mexe no layout.
 *
 * O disco inteiro mora aqui (anel, marcas, recorte e a linha de credito),
 * porque o credito muda junto com o que esta na tela: Google depois do
 * clique, OpenStreetMap antes. O porque do recorte e do enquadramento esta
 * no comentario do mapa em `contact.tsx`.
 */
export function MapaSobDemanda({
  src,
  titulo,
}: {
  src: string;
  titulo: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
      <div className="relative aspect-[4/3] w-full min-[390px]:aspect-square">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden rounded-full border border-dashed border-rule min-[390px]:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden min-[390px]:block"
        >
          {[
            "top-0 left-1/2 -translate-x-1/2 h-3 w-px",
            "bottom-0 left-1/2 -translate-x-1/2 h-3 w-px",
            "left-0 top-1/2 -translate-y-1/2 w-3 h-px",
            "right-0 top-1/2 -translate-y-1/2 w-3 h-px",
          ].map((pos) => (
            <span key={pos} className={`absolute bg-accent/35 ${pos}`} />
          ))}
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-lg border border-rule bg-surface shadow-plate min-[390px]:inset-5 min-[390px]:rounded-full">
          {aberto ? (
            <iframe
              // O botao some no clique; sem isto o foco cairia no <body>.
              ref={(quadro) => quadro?.focus()}
              title={titulo}
              src={src}
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute -inset-[180px] block h-[calc(100%+360px)] w-[calc(100%+360px)] border-0 saturate-[1.2]"
            />
          ) : (
            <>
              {/* Decorativa: o endereco esta escrito na ficha logo abaixo. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG estatico, nada a otimizar */}
              <img
                src="/img/mapa-capa.svg"
                alt=""
                width={600}
                height={600}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-[16%] flex justify-center">
                <button
                  type="button"
                  onClick={() => setAberto(true)}
                  className={VARIANTS.secondary}
                >
                  Ver no Google Maps
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <p
        className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.6875rem] tracking-[0.04em] text-muted"
        style={{ fontFamily: "var(--mono)" }}
      >
        {aberto ? (
          <>
            <span>Dados do mapa © Google</span>
            <a
              href="https://www.google.com/intl/pt-BR/help/terms_maps/"
              target="_blank"
              rel="noopener noreferrer"
              className="sublinha inline-flex min-h-[28px] items-center rounded-sm text-accent transition-colors duration-[160ms] hover:text-accent-deep"
            >
              Termos
            </a>
          </>
        ) : (
          <>
            {/* Curto de proposito: cabe numa linha como o credito do Google,
                e o disco nao muda de altura no clique. A forma "© OpenStreetMap"
                com link para a pagina de direitos e' a que o OSM aceita. */}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="sublinha inline-flex min-h-[28px] items-center rounded-sm transition-colors duration-[160ms] hover:text-ink"
            >
              Desenho © OpenStreetMap
            </a>
            <Link
              href="/cookies#mapa"
              className="sublinha inline-flex min-h-[28px] items-center rounded-sm text-accent transition-colors duration-[160ms] hover:text-accent-deep"
            >
              Cookies do mapa
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
