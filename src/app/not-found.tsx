import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { NAV_GROUPS } from "@/lib/nav";
import { BLOG_INDEX } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

/**
 * 404 com saida.
 *
 * O site herdou do GoDaddy URLs de menu que mudaram ao longo dos anos; quem
 * chegar por um link antigo cai aqui. Em vez do 404 padrao do Next, que e um
 * beco sem saida, esta pagina oferece os destinos reais.
 */
export default function NaoEncontrada() {
  return (
    <PageShell
      titulo="Não encontramos esta página"
      subtitulo="O endereço pode ter mudado. Abaixo estão as áreas do site — e, se preferir, fale direto com a clínica pelo WhatsApp."
    >
      <div className="mx-auto max-w-[1240px] px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_GROUPS.map((grupo) => (
            <nav key={grupo.label} aria-label={grupo.label}>
              <h2 className="font-mono text-[0.6875rem] tracking-[0.16em] text-muted uppercase">
                {grupo.label}
              </h2>
              <ul className="mt-5 space-y-3 border-t border-rule pt-5">
                {grupo.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-[0.9375rem] text-ink hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-16 border-t border-rule pt-10 text-[1.0625rem] text-ink">
          <Link href="/" className="text-accent underline underline-offset-4">
            Voltar ao início
          </Link>
          <span aria-hidden="true" className="mx-4 text-rule">
            /
          </span>
          <Link
            href={BLOG_INDEX}
            className="text-accent underline underline-offset-4"
          >
            Ver o blog
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
