import Link from "next/link";

import { FloatingWhatsApp } from "./floating-whatsapp";
import { SeamRuler } from "./layers";
import { SiteFooter } from "./site-footer";
import { GLYPHS } from "./service-glyphs";
import { SiteHeader } from "./site-header";
import { SocialBand } from "./social-band";

/**
 * Casca das paginas internas.
 *
 * A home continua compondo suas secoes a mao em app/page.tsx. Todas as outras
 * rotas — 20 paginas + 68 posts + indice do blog — passam por aqui, para que
 * cabecalho, rodape e trilha sejam identicos sem duplicar codigo em 89 lugares.
 */
export function PageShell({
  titulo,
  subtitulo,
  trilha,
  glifo,
  children,
}: {
  titulo: string;
  subtitulo?: string | null;
  /** Ultimo item e a pagina atual, sem link. */
  trilha?: { nome: string; href?: string }[];
  /** Chave de GLYPHS ("/osteopatia"). Sem ela o cabecalho vai so com o titulo. */
  glifo?: string;
  children: React.ReactNode;
}) {
  const Emblema = glifo ? GLYPHS[glifo] : undefined;

  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        {/* data-hero: o observador do flutuante procurava "main > section", que
            nesta casca cai na faixa social do rodape — o disco aparecia no topo
            de toda pagina interna, cobrindo texto, e sumia justamente no fim. */}
        <header
          data-hero
          className="relative overflow-hidden border-b border-rule bg-surface"
        >
          <div className="mx-auto max-w-[1240px] px-6 pt-36 pb-12 md:px-8 md:pt-40 md:pb-16 lg:px-10 lg:pt-[220px] lg:pb-20">
            {trilha && trilha.length > 0 && (
              <nav aria-label="Trilha de navegação" className="mb-8">
                <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
                  <li>
                    <Link href="/" className="inline-flex min-h-[28px] items-center hover:text-accent">
                      Início
                    </Link>
                  </li>
                  {trilha.map((item, i) => (
                    <li key={item.nome} className="flex items-center gap-x-3">
                      <span aria-hidden="true" className="text-rule">
                        /
                      </span>
                      {item.href && i < trilha.length - 1 ? (
                        <Link href={item.href} className="inline-flex min-h-[28px] items-center hover:text-accent">
                          {item.nome}
                        </Link>
                      ) : (
                        <span aria-current="page" className="text-ink">
                          {item.nome}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {Emblema && (
              <span
                aria-hidden="true"
                className="mb-8 block h-14 w-14 text-accent md:h-16 md:w-16 lg:h-20 lg:w-20"
              >
                {Emblema({ className: "h-full w-full" })}
              </span>
            )}

            {/* 4.2vw so ultrapassa o piso de 2rem a partir de 762px, entao o
                titulo ficava congelado em 32px de 320 ate 768 — a faixa inteira
                de tablet com o corpo de telefone. A forma rem+vw cresce desde
                320 e chega ao teto por volta de 960. */}
            <h1 className="max-w-[24ch] font-display text-[clamp(2rem,1.35rem+3.25vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink-strong">
              {titulo}
            </h1>

            {subtitulo && (
              <p className="mt-6 max-w-[62ch] text-[1.0625rem] leading-[1.7] text-muted md:mt-7 md:text-[1.125rem]">
                {subtitulo}
              </p>
            )}
          </div>
        </header>

        {children}

        <SeamRuler />
        <SocialBand />
      </main>
      <SiteFooter />
      <FloatingWhatsApp />
    </>
  );
}
