/**
 * CTA fixo de WhatsApp. Mesmo rotulo e destino do CTA da secao 05.
 * Presenca: anel verde que emana (.flutuante-pulso). Decorativo, some no
 * movimento reduzido; o botao continua.
 * No telefone vira disco so com o icone; o rotulo abre no desktop.
 * Icone: balao de conversa com fone, vetor proprio, nao o glifo da Meta.
 */
export function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/message/WFGOB3AVBI63J1"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar Sobre o Meu Caso"
      className="flutuante-entra flutuante-pulso btn-fill [--fill:var(--color-action-deep)] fixed right-5 bottom-5 z-50 inline-flex h-14 items-center gap-3 rounded-full border-[1.5px] border-action-deep/25 bg-action px-4 text-[0.875rem] font-medium text-ink-strong shadow-lift transition-[transform,box-shadow,color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-1 hover:text-paper active:translate-y-0 lg:right-8 lg:bottom-8 lg:px-5"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="flutuante-icone shrink-0"
      >
        <path
          d="M12 3.2c-4.9 0-8.8 3.6-8.8 8.1 0 1.6.5 3.1 1.4 4.4L3.4 20l4.5-1.1c1.2.6 2.6 1 4.1 1 4.9 0 8.8-3.6 8.8-8.3S16.9 3.2 12 3.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9.1 8.6c-.3.1-.8.5-.8 1.3 0 1.7 1.5 3.6 3.2 4.6 1.3.8 2.3 1 2.9.8.6-.2 1-.7 1.1-1.1.1-.3 0-.5-.2-.6l-1.5-.8c-.2-.1-.4-.1-.6.1l-.5.5c-.2.2-.4.2-.6.1-.5-.3-1.4-1-1.9-1.9-.1-.2-.1-.4.1-.6l.4-.5c.2-.2.2-.4.1-.6l-.7-1.2c-.2-.3-.6-.3-1-.1Z"
          fill="currentColor"
        />
      </svg>
      <span className="hidden lg:inline">Falar Sobre o Meu Caso</span>
    </a>
  );
}
