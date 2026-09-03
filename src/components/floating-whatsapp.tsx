"use client";

import { useElementoNaTela, usePassouHero } from "@/lib/use-passou-hero";

/**
 * Disco fixo de contato. Mesmo destino do CTA primario do hero.
 * So aparece depois que o hero sai da tela: na primeira dobra quem chama e'
 * o botao do hero, e nunca ha dois convites verdes ao mesmo tempo.
 *
 * A segunda condicao existe desde que as paginas informativas ganharam o
 * convite de fecho: com ele em cena, o disco se cala, senao os dois verdes
 * aparecem juntos — e chegam a se sobrepor no celular.
 *
 * O destino era o link curto do WhatsApp Business, diferente do numero escrito
 * em todo o resto do site. Agora e' o mesmo (21) 99203-5643 do bloco de
 * contato: um canal so, uma conversa so.
 *
 * Entrada: sobe girando de leve, com overshoot.
 * Repouso: anel que emana a cada 3s e o balao que acena a cada 7s.
 * Icone proprio: balao de conversa com fone, nao o glifo da Meta.
 */
export function FloatingWhatsApp() {
  const passou = usePassouHero();
  const conviteNaTela = useElementoNaTela("#convite-consulta");
  const visivel = passou && !conviteNaTela;

  return (
    <a
      href="https://wa.me/5521992035643"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar Sobre o Meu Caso"
      aria-hidden={visivel ? undefined : true}
      tabIndex={visivel ? undefined : -1}
      className={`disco-flutuante group/flu fixed right-5 bottom-5 z-50 grid h-14 w-14 place-items-center rounded-full border-[1.5px] border-action-deep/25 bg-action text-ink-strong shadow-lift transition-[transform,box-shadow,background-color,color,opacity] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:bg-action-deep hover:text-paper hover:shadow-lift lg:right-8 lg:bottom-8 lg:h-16 lg:w-16 ${
        visivel
          ? "disco-entra pointer-events-auto"
          : "pointer-events-none scale-75 opacity-0"
      }`}
    >
      {/* aneis que emanam, so quando o disco esta em cena */}
      {visivel && (
        <>
          <span aria-hidden="true" className="disco-anel" />
          <span
            aria-hidden="true"
            className="disco-anel"
            style={{ animationDelay: "1.5s" }}
          />
        </>
      )}

      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        className="disco-icone relative"
      >
        {/* balao de conversa */}
        <path
          d="M14 3.6c-5.6 0-10.1 4.1-10.1 9.2 0 1.9.6 3.6 1.7 5.1l-1.3 5 5.2-1.3c1.4.7 3 1.1 4.5 1.1 5.6 0 10.1-4.1 10.1-9.9S19.6 3.6 14 3.6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* fone dentro do balao */}
        <path
          d="M10.6 9.9c-.4.2-1 .7-1 1.7 0 2.1 1.9 4.4 3.9 5.6 1.6 1 2.9 1.2 3.6 1 .7-.3 1.2-.9 1.3-1.4.1-.3 0-.6-.3-.7l-1.9-1c-.3-.1-.5-.1-.7.1l-.6.6c-.2.2-.5.3-.7.1-.6-.4-1.7-1.3-2.3-2.3-.2-.3-.1-.5.1-.7l.5-.6c.2-.2.2-.5.1-.7l-.9-1.5c-.2-.4-.7-.4-1.1-.2Z"
          fill="currentColor"
        />
      </svg>
    </a>
  );
}
