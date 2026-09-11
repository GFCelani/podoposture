"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

import { MAPA_DE_DOR_PONTOS, type VistaDoMapa } from "./mapa-de-dor-pontos";

/**
 * Os pontos clicaveis do mapa de dor, por cima de uma figura do hero.
 *
 * Sao HTML, e nao circulos dentro do SVG, porque o rotulo precisa de corpo
 * constante: a figura vai de 405 a 686px de altura conforme a faixa, e texto
 * no viewBox escalaria com ela. O ponto fica em PORCENTAGEM do quadro da
 * figura (a mesma tecnica das linhas de referencia do hero), entao acompanha
 * o desenho em qualquer tamanho. Geometria em mapa-de-dor-pontos.ts, gerada;
 * visual em globals.css, secao HERO - mapa de dor.
 *
 * Mouse e teclado nao precisam de nada aqui: :hover e :focus-visible abrem o
 * rotulo, e o link abre no clique ou no Enter.
 *
 * Toque: nao existe hover, entao um toque so teria de abrir o rotulo E a
 * pagina ao mesmo tempo. PRIMEIRO toque arma o ponto (anel destaca, rotulo
 * aparece), SEGUNDO toque no mesmo ponto abre a pagina. Tocar em outro ponto
 * passa o destaque para ele, inclusive na outra figura; tocar fora, ou Esc,
 * desarma. O modo sai do evento (pointerType), nao do user agent: mouse num
 * aparelho hibrido continua abrindo de primeira.
 */
export function MapaDeDor({ vista }: { vista: VistaDoMapa }) {
  const { largura, pontos } = MAPA_DE_DOR_PONTOS[vista];
  const [armado, setArmado] = useState<string | null>(null);
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!armado) return;
    const fora = (e: Event) => {
      if (!lista.current?.contains(e.target as Node)) setArmado(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmado(null);
    };
    document.addEventListener("click", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [armado]);

  function aoClicar(e: MouseEvent<HTMLAnchorElement>, chave: string) {
    const tipo = (e.nativeEvent as PointerEvent).pointerType;
    const toque =
      tipo === "touch" || tipo === "pen" || !window.matchMedia("(hover: hover)").matches;
    if (!toque || armado === chave) return; // mouse, ou segundo toque: deixa abrir
    e.preventDefault();
    setArmado(chave);
  }

  return (
    <ul
      ref={lista}
      className="pd-lista"
      aria-label={`Mapa de dor, vista ${vista === "frontal" ? "frontal" : "de perfil"}: regiões tratadas na clínica`}
    >
      {pontos.map((p) => {
        const ciclo = {
          ["--dur" as string]: `${p.dur}s`,
          ["--fase" as string]: `${p.fase}s`,
        };
        return (
          <li key={p.chave}>
            <Link
              href={p.rota}
              aria-label={p.aria}
              data-lado={p.lado}
              className={armado === p.chave ? "pd-ponto pd-armado" : "pd-ponto"}
              style={
                {
                  "--x": `${((p.x / largura) * 100).toFixed(3)}%`,
                  "--y": `${((p.y / 560) * 100).toFixed(3)}%`,
                  "--fio-u": p.fioU,
                  "--alvo-u": p.alvoU,
                } as CSSProperties
              }
              onClick={(e) => aoClicar(e, p.chave)}
            >
              <span className="pd-anel" aria-hidden="true">
                <i className="sonar-onda pd-onda" style={{ ["--escala" as string]: 3.1, ...ciclo }} />
                <i className="sonar-ponto pd-nucleo" style={ciclo} />
              </span>
              <span className="pd-fio" aria-hidden="true" />
              <span className="pd-rotulo" aria-hidden="true">
                {p.rotulo.map((linha) => (
                  <span key={linha}>{linha}</span>
                ))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
