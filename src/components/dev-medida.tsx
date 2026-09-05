"use client";

import { useEffect, useState } from "react";

/**
 * Etiqueta de desenvolvimento: mostra a medida da janela em pixels de CSS,
 * que e' a medida que decide qual faixa do layout entra. Serve para dizer,
 * sem adivinhar, se a tela em uso cai na faixa de telefone, de tablet ou de
 * laptop, e para pegar o caso comum de zoom do navegador acima de 100%, que
 * encolhe a janela em CSS e joga um monitor grande na faixa de telefone.
 *
 * So existe em `next dev`: em producao o componente nao renderiza nada.
 */
export function DevMedida() {
  const [medida, setMedida] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const ler = () => {
      const faixa =
        window.innerWidth >= 1280
          ? "xl"
          : window.innerWidth >= 1024
            ? "lg"
            : window.innerWidth >= 768
              ? "md"
              : window.innerWidth >= 640
                ? "sm"
                : "telefone";
      const janela = window.innerHeight <= 860 ? "baixa" : "alta";
      const zoom = Math.round(window.devicePixelRatio * 100) / 100;
      setMedida(
        `${window.innerWidth} x ${window.innerHeight} · ${faixa} · janela ${janela} · dpr ${zoom}`,
      );
    };

    ler();
    window.addEventListener("resize", ler);
    return () => window.removeEventListener("resize", ler);
  }, []);

  if (!medida) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 9999,
        padding: "6px 10px",
        borderRadius: 6,
        background: "rgb(6 44 66 / 0.92)",
        color: "#FCFDFE",
        font: "12px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.02em",
        pointerEvents: "none",
      }}
    >
      {medida}
    </div>
  );
}
