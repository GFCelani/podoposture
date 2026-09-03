import Link from "next/link";
import { PageGrid } from "./layers";
import { SocialLinks } from "./social-links";

/** Os 10 itens do menu de rodape do site atual, na mesma ordem. */
const FOOTER_LINKS = [
  { label: "Início", href: "/home" },
  { label: "Osteopatia", href: "/osteopatia" },
  { label: "Posturologia", href: "/posturologia" },
  { label: "Palmilhas Personalizadas", href: "/palmilhas-personalizadas" },
  { label: "Flexo-distração", href: "/flexo-distração" },
  { label: "Acupuntura", href: "/acupuntura" },
  { label: "RPG", href: "/rpg" },
  { label: "Nosso Blog", href: "/nosso-blog" },
  { label: "Quem Somos", href: "/quem-somos" },
  { label: "Contato", href: "/contato" },
];

export function SiteFooter() {
  return (
    <footer
      data-tone="deep"
      className="relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-10 border-b border-white/[0.14] pb-12 lg:flex-row lg:items-start lg:justify-between">
          <nav aria-label="Rodapé" className="max-w-[46rem]">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="sublinha rounded-sm text-[0.9375rem] text-on-deep-muted transition-colors duration-[160ms] hover:text-paper"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <SocialLinks tone="dark" className="shrink-0" />
        </div>

        <p
          className="mt-10 text-[0.75rem] tracking-[0.12em] text-on-deep-muted uppercase"
          style={{ fontFamily: "var(--mono)" }}
        >
          {/* O ©2020 congelado veio do site antigo e era o defeito n1 da
              AUDITORIA; ano fixo em rodape sinaliza site abandonado. */}
          © {new Date().getFullYear()} Podoposture
        </p>
      </div>
    </footer>
  );
}
