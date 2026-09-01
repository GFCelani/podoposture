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
    const hero = document.querySelector("main > section");
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
