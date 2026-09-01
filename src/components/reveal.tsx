"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Entrada por scroll com stagger.
 * O estado de repouso para movimento reduzido nao vem daqui: vem da regra
 * [data-motion] em globals.css, que vale ja no primeiro quadro e nao depende
 * do observer disparar. Sem ela, conteudo abaixo da dobra ficaria invisivel
 * para quem pede movimento reduzido.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  variante = "sobe",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** "sobe" e o padrao; "cortina" revela de baixo para cima, para titulo. */
  variante?: "sobe" | "cortina";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Cortina: o observer NUNCA vai no elemento clipado. Chromium desconta o
     clip-path do alvo ao calcular a intersecao, e inset(0 0 100%) tem area
     visivel zero: o observer nao dispara e o reveal trava em deadlock.
     O wrapper observado fica sem clip; um filho carrega a cortina.
     Ver vault/intersection-observer-clip-path-deadlock */
  if (variante === "cortina") {
    return (
      <div ref={ref} className={className || undefined}>
        <div
          data-motion
          className={`reveal-cortina${shown ? " is-in" : ""}`}
          style={delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-motion
      className={`reveal${shown ? " is-in" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
