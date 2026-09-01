import Link from "next/link";

type Variant = "primary" | "secondary" | "tertiary";

/**
 * Tres niveis, e so o primario usa o verde de acao, nos dois CTAs de WhatsApp.
 * Nenhum outro ponto do site preenche ou escreve em verde.
 *
 * Affordance: os dois niveis de caixa tem peso (borda de 1.5), profundidade
 * (sombra em repouso), reacao (sobe 1px e ganha sombra no hover) e retorno de
 * clique (afunda no active). O terciario nao desenha caixa: e' link, e leva
 * sublinhado permanente para nao depender do hover para se anunciar.
 *
 * Contraste medido sobre --paper #FAF9F6:
 *   primario   ink #0D2536 sobre acao #96BF0D .......... 7.31
 *   primario   hover papel sobre acao-deep #4B6007 ..... 6.70
 *   secundario accent #0E71B4 sobre papel ............. 4.94
 *   terciario  accent sobre papel ...................... 4.94
 */
const BASE =
  "group/btn inline-flex items-center gap-3 text-[0.9375rem] transition-[transform,box-shadow,background-color,color,border-color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)]";

const VARIANTS: Record<Variant, string> = {
  primary: `${BASE} rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 py-3.5 font-medium text-ink shadow-tag hover:-translate-y-0.5 hover:bg-action-deep hover:text-paper hover:shadow-lift active:translate-y-0 active:shadow-tag`,
  secondary: `${BASE} rounded-md border-[1.5px] border-accent/45 bg-paper px-7 py-3.5 text-accent shadow-tag hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-paper hover:shadow-lift active:translate-y-0 active:shadow-tag`,
  tertiary: `${BASE} sublinha items-baseline gap-2.5 text-accent hover:text-accent-deep`,
};

export function ButtonLink({
  href,
  children,
  variant = "secondary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const external = href.startsWith("http") || href.startsWith("tel:");

  const content = (
    <>
      {children}
      <svg
        width="13"
        height="9"
        viewBox="0 0 13 9"
        aria-hidden="true"
        className="shrink-0 transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/btn:translate-x-1"
      >
        <path
          d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    </>
  );

  const cls = `${VARIANTS[variant]}${className ? ` ${className}` : ""}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}
