"use client";

import { useEffect, useState } from "react";

/**
 * Verdadeiro quando o hero saiu da tela. Header e flutuante usam isto para
 * so aparecerem depois da primeira dobra: na dobra manda o CTA do hero, e
 * so um chamado de contato fica visivel por vez.
 */
export function usePassouHero(): boolean {
  const [passou, setPassou] = useState(false);

  useEffect(() => {
    // A home compoe as secoes a mao e o hero e' o primeiro <section>; as 88
    // paginas internas passam pelo PageShell, cujo primeiro filho e' um
    // <header>. Sem o marcador, "main > section" caia na faixa social do
    // rodape: o disco nascia visivel no topo, por cima do texto, e desaparecia
    // ao chegar no fim — o oposto do que esta escrito aqui em cima.
    const hero = document.querySelector("[data-hero], main > section");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setPassou(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return passou;
}

/**
 * Verdadeiro enquanto o elemento do seletor esta em cena.
 *
 * Serve a mesma regra do disco flutuante: quando o convite de fecho aparece,
 * ele ja e' o chamado da tela, e o disco se cala em vez de disputar com ele.
 */
export function useElementoNaTela(seletor: string): boolean {
  const [naTela, setNaTela] = useState(false);

  useEffect(() => {
    const alvo = document.querySelector(seletor);
    if (!alvo) return;
    const io = new IntersectionObserver(
      ([entry]) => setNaTela(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(alvo);
    return () => io.disconnect();
  }, [seletor]);

  return naTela;
}
