/**
 * Os quatro destinos sociais do site atual, verbatim.
 * LinkedIn e Pinterest estao malformados na origem (dominio duplicado e
 * "https" truncado para "ttps"). A arquitetura manda preservar destino, entao
 * seguem como estao; os dois estao listados no item 2 da AUDITORIA.
 */
export const SOCIALS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/1761419930738285",
    path: "M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.3-.13-2.47-.13-2.44 0-4.11 1.49-4.11 4.23V9.9H7.4V13h2.72v8h3.38Z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/podoposture/",
    path: "M12 3.6c2.74 0 3.06.01 4.14.06 1 .05 1.54.21 1.9.35.48.19.82.41 1.18.77.36.36.58.7.77 1.18.14.36.3.9.35 1.9.05 1.08.06 1.4.06 4.14s-.01 3.06-.06 4.14c-.05 1-.21 1.54-.35 1.9-.19.48-.41.82-.77 1.18-.36.36-.7.58-1.18.77-.36.14-.9.3-1.9.35-1.08.05-1.4.06-4.14.06s-3.06-.01-4.14-.06c-1-.05-1.54-.21-1.9-.35a3.2 3.2 0 0 1-1.18-.77 3.2 3.2 0 0 1-.77-1.18c-.14-.36-.3-.9-.35-1.9C3.61 15.06 3.6 14.74 3.6 12s.01-3.06.06-4.14c.05-1 .21-1.54.35-1.9.19-.48.41-.82.77-1.18.36-.36.7-.58 1.18-.77.36-.14.9-.3 1.9-.35C8.94 3.61 9.26 3.6 12 3.6Zm0 4.5a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Zm0 6.43a2.53 2.53 0 1 1 0-5.06 2.53 2.53 0 0 1 0 5.06Zm4.97-6.59a.91.91 0 1 1-1.82 0 .91.91 0 0 1 1.82 0Z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/linkedin.com/in/claudia-m-b-oliveira-79312937",
    path: "M6.94 8.4H3.9V21h3.04V8.4ZM5.42 3a1.76 1.76 0 1 0 0 3.53 1.76 1.76 0 0 0 0-3.53ZM21 13.79c0-3.2-1.71-4.69-3.99-4.69-1.84 0-2.66 1.01-3.12 1.72V8.4H9.85c.04.86 0 12.6 0 12.6h3.04v-7.04c0-.27.02-.54.1-.74.22-.55.72-1.11 1.56-1.11 1.1 0 1.54.84 1.54 2.06V21H21v-7.21Z",
  },
  {
    label: "Pinterest",
    href: "https://www.pinterest.com/ttps://br.pinterest.com/pin/571323902725564321/?autologin=true ",
    path: "M12 3a9 9 0 0 0-3.28 17.38c-.08-.72-.15-1.83.03-2.62.16-.71 1.06-4.5 1.06-4.5s-.27-.54-.27-1.34c0-1.26.73-2.2 1.63-2.2.77 0 1.14.58 1.14 1.27 0 .77-.49 1.93-.75 3-.21.9.45 1.63 1.34 1.63 1.6 0 2.84-1.7 2.84-4.14 0-2.16-1.56-3.68-3.78-3.68-2.57 0-4.09 1.93-4.09 3.93 0 .78.3 1.61.67 2.06.08.09.09.17.06.26-.07.28-.22.9-.25 1.02-.04.17-.13.2-.3.12-1.13-.52-1.83-2.16-1.83-3.48 0-2.83 2.06-5.44 5.94-5.44 3.12 0 5.54 2.22 5.54 5.19 0 3.1-1.95 5.59-4.66 5.59-.91 0-1.77-.47-2.06-1.03l-.56 2.14c-.2.78-.75 1.76-1.12 2.36A9 9 0 1 0 12 3Z",
  },
];

export function SocialLinks({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const colors =
    tone === "dark"
      ? "border-white/20 text-paper hover:border-accent-light hover:text-accent-light"
      : "border-rule text-ink hover:border-accent hover:text-accent";

  return (
    <ul className={`flex items-center gap-4${className ? ` ${className}` : ""}`}>
      {SOCIALS.map((social) => (
        <li key={social.label}>
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[color,border-color,transform,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-0.5 hover:shadow-tag ${colors}`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path d={social.path} fill="currentColor" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
