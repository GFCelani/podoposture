"use client";

import { useLayoutEffect } from "react";

import { ajustarTitulo } from "@/lib/ajuste-do-titulo";

/**
 * Refaz o ajuste do titulo longo (lib/ajuste-do-titulo.ts) depois que a
 * fonte do titulo carrega e a cada mudanca de tamanho da janela. A primeira
 * vez e' o <script> que page-shell.tsx poe logo depois do topo, antes da
 * pintura.
 */
export function AjusteDoTitulo() {
  useLayoutEffect(() => {
    let quadro = 0;
    const agendar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(ajustarTitulo);
    };
    ajustarTitulo();
    void document.fonts.ready.then(agendar);
    window.addEventListener("resize", agendar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", agendar);
    };
  }, []);
  return null;
}
