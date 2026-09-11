import Link from "next/link";
import type { ContatoDoSite } from "@/lib/site";
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

/**
 * Rotulo de metadado da coluna de contato. Mesma familia mono, mesma caixa e
 * mesmo tracking dos outros metadados do site.
 */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.6875rem] tracking-[0.16em] text-on-deep-muted uppercase"
      style={{ fontFamily: "var(--mono)" }}
    >
      {children}
    </p>
  );
}

export function SiteFooter({ contato }: { contato: ContatoDoSite }) {
  const { endereco, telefones, email, horario, mapsDirecoes, redes } = contato;

  return (
    <footer
      data-tone="deep"
      className="relative overflow-hidden bg-deep-calm"
    >
      <PageGrid tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        {/* O endereco abre o rodape, antes do menu e antes das redes.
            Procurar onde a clinica fica e' o segundo motivo de visita depois
            de marcar consulta, e o rodape e' o primeiro lugar onde se procura
            isso: ate aqui ele so tinha links, e o endereco vivia sozinho na
            secao 09 da home, oito secoes abaixo da dobra. */}
        <div className="grid gap-12 border-b border-white/[0.14] pb-12 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-6">
            <Rotulo>Onde estamos</Rotulo>

            {/* A ficha inteira leva ao mapa, como na secao de contato. */}
            <a
              href={mapsDirecoes}
              target="_blank"
              rel="noopener noreferrer"
              className="group/end mt-5 block rounded-sm"
            >
              <address className="font-display text-[1.25rem] leading-[1.45] font-medium text-paper not-italic lg:text-[1.375rem]">
                {endereco.rua}
                <br />
                {endereco.sala}
                <br />
                {endereco.local}
              </address>
              <span className="mt-4 inline-flex items-center gap-2 text-[0.875rem] text-accent-light transition-colors duration-[160ms] group-hover/end:text-paper">
                Como chegar
                <svg
                  width="13"
                  height="9"
                  viewBox="0 0 13 9"
                  aria-hidden="true"
                  className="transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/end:translate-x-1"
                >
                  <path
                    d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </span>
            </a>

            {endereco.referencia && (
              <p className="mt-5 max-w-[30rem] text-[0.9375rem] leading-[1.7] text-on-deep-muted">
                {endereco.referencia}
              </p>
            )}
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <Rotulo>Contato</Rotulo>

            <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-1">
              {telefones.map((phone, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <a
                    href={phone.href}
                    className="sublinha inline-flex min-h-[32px] items-center text-[1.0625rem] tracking-[0.02em] text-paper transition-colors duration-[160ms] hover:text-accent-light"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {phone.label}
                  </a>
                  {phone.nota && (
                    <span className="text-[0.8125rem] text-on-deep-muted">
                      {phone.nota}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <a
              href={`mailto:${email}`}
              className="sublinha mt-2 inline-flex min-h-[32px] items-center text-[1.0625rem] tracking-[0.02em] break-all text-paper transition-colors duration-[160ms] hover:text-accent-light"
              style={{ fontFamily: "var(--mono)" }}
            >
              {email}
            </a>

            <p className="mt-5 text-[0.9375rem] leading-[1.7] text-on-deep-muted">
              {horario}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-10 border-b border-white/[0.14] py-12 lg:flex-row lg:items-start lg:justify-between">
          <nav aria-label="Rodapé" className="max-w-[46rem]">
            {/* gap-y-1 com py-2 no proprio link: o espaco entre as linhas passa
                a fazer parte do alvo em vez de ficar entre eles. Os 10 links
                tinham 17px de altura de toque, abaixo do minimo de 24. */}
            <ul className="flex flex-wrap gap-x-8 gap-y-1">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="sublinha inline-flex min-h-[36px] items-center rounded-sm text-[0.9375rem] text-on-deep-muted transition-colors duration-[160ms] hover:text-paper"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <SocialLinks redes={redes} tone="dark" className="shrink-0" />
        </div>

        <div
          className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 text-[0.75rem] tracking-[0.12em] text-on-deep-muted uppercase"
          style={{ fontFamily: "var(--mono)" }}
        >
          <p>
            {/* O ©2020 congelado veio do site antigo e era o defeito n1 da
                AUDITORIA; ano fixo em rodape sinaliza site abandonado. */}
            © {new Date().getFullYear()} Podoposture
          </p>
          {/* Discreto de proposito: e o endereco que a medicao de visitas
              precisa ter publicado, nao um item de navegacao. */}
          <Link
            href="/privacidade"
            className="sublinha inline-flex min-h-[44px] items-center rounded-sm transition-colors duration-[160ms] hover:text-paper"
          >
            Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
