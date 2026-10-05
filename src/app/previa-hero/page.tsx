import type { Metadata } from "next";

import { HeroImpressa } from "@/components/hero-v4-impressa";
import { lerBlogDaPaginaInicial, PaginaInicial } from "@/components/pagina-inicial";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";

/**
 * Previa do hero novo ("Prancha impressa"): a home inteira com o hero trocado e o
 * cabecalho em barra chapada, para iterar no contexto real antes de ir para
 * a home. Fora do indice.
 *
 * Para levar para a home: em app/page.tsx, passar
 * HeroDaPagina={HeroImpressa} classeDoCabecalho="cab-plano" ao PaginaInicial
 * (e ajustar e2e/hero.spec.ts, que mede o hero atual).
 */
export const metadata: Metadata = {
  title: "Prévia do hero",
  robots: { index: false, follow: false },
};

export default async function PreviaHero() {
  const [conteudo, blog] = await Promise.all([lerConteudoDoSite(), lerBlogDaPaginaInicial()]);
  return (
    <PaginaInicial
      conteudo={conteudo}
      blog={blog}
      HeroDaPagina={HeroImpressa}
      classeDoCabecalho="cab-plano"
    />
  );
}
