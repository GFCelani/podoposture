import Link from "next/link";

type Variant = "primary" | "secondary" | "tertiary";

/**
 * Tres niveis, e so o primario usa o verde de acao.
 * Contraste medido sobre --paper #FAF9F6:
 *   primario  ink #0D2536 sobre acao #96BF0D .......... 7.31
 *   primario  hover papel sobre acao-deep #4B6007 ..... 6.70
 *   secundario accent #0E71B4 sobre papel ............. 4.94
 *   secundario hover papel sobre accent ............... 4.94
 *   terciario accent sobre papel ...................... 4.94
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "inline-flex items-center gap-3 bg-action px-7 py-3.5 text-ink transition-colors duration-200 hover:bg-action-deep hover:text-paper",
  secondary:
    "inline-flex items-center gap-3 border border-accent px-7 py-3.5 text-accent transition-colors duration-200 hover:bg-accent hover:text-paper",
  tertiary:
    "group inline-flex items-baseline gap-2.5 text-accent transition-colors duration-200 hover:text-action-deep",
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
        className={
          variant === "tertiary"
            ? "shrink-0 transition-transform duration-200 group-hover:translate-x-1"
            : "shrink-0"
        }
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

  const cls = `${VARIANTS[variant]} text-[0.9375rem]${className ? ` ${className}` : ""}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
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
