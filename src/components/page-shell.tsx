import Link from "next/link";

import { FloatingWhatsApp } from "./floating-whatsapp";
import { SeamRuler } from "./layers";
import { SiteFooter } from "./site-footer";
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
  children,
}: {
  titulo: string;
  subtitulo?: string | null;
  /** Ultimo item e a pagina atual, sem link. */
  trilha?: { nome: string; href?: string }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <header className="relative overflow-hidden border-b border-rule bg-surface">
          <div className="mx-auto max-w-[1240px] px-6 pt-28 pb-14 lg:px-10 lg:pt-36 lg:pb-20">
            {trilha && trilha.length > 0 && (
              <nav aria-label="Trilha de navegação" className="mb-8">
                <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
                  <li>
                    <Link href="/" className="hover:text-accent">
                      Início
                    </Link>
                  </li>
                  {trilha.map((item, i) => (
                    <li key={item.nome} className="flex items-center gap-x-3">
                      <span aria-hidden="true" className="text-rule">
                        /
                      </span>
                      {item.href && i < trilha.length - 1 ? (
                        <Link href={item.href} className="hover:text-accent">
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

            <h1 className="max-w-[24ch] font-display text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink-strong">
              {titulo}
            </h1>

            {subtitulo && (
              <p className="mt-7 max-w-[62ch] text-[1.125rem] leading-[1.7] text-muted">
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
