import Image from "next/image";

import type { ConteudoMarca } from "@/lib/conteudo-tipos";

import { BrandMark } from "./brand-mark";

/**
 * A marca do cabecalho e do rodape: o logo enviado pelo painel ("Logo e
 * icone") ou, sem ele, a marca desenhada de brand-mark.tsx.
 *
 * O logo enviado ocupa a MESMA caixa da marca desenhada — a altura que o
 * cabecalho ja mede e a largura da proporcao dela (o viewBox abaixo). Dentro da
 * caixa ele entra inteiro, encostado a esquerda. O cabecalho foi medido para
 * essa largura em 1024 px (ver site-header.tsx): um logo mais largo que a
 * marca nao empurra o menu, so aparece menor.
 *
 * No rodape (fundo escuro) vale a versao escura, se houver. Sem ela, o logo
 * claro entra todo em branco por filtro, como a propria marca faz la (letras
 * em papel): um logo azul sobre o azul-escuro nao passaria em contraste.
 */

/** A caixa da marca desenhada: o viewBox de brand-mark.tsx. */
const CAIXA_DA_MARCA = "2046 / 728.8";

export type LogosDoSite = Pick<ConteudoMarca, "logo" | "logoEscuro">;

export function MarcaDoSite({
  logos,
  tom = "paper",
  className,
}: {
  logos: LogosDoSite;
  /** "deep" = sobre banda escura (rodape). */
  tom?: "paper" | "deep";
  className?: string;
}) {
  const escura = tom === "deep" ? logos.logoEscuro[0] : undefined;
  const logo = escura ?? logos.logo[0];
  if (!logo) return <BrandMark tone={tom} className={className} />;

  const emBranco = tom === "deep" && !escura;
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block ${className ?? ""}`}
      style={{ aspectRatio: CAIXA_DA_MARCA }}
    >
      <Image
        src={logo.src}
        alt=""
        fill
        loading="eager"
        sizes="160px"
        className={`object-contain object-left ${emBranco ? "brightness-0 invert" : ""}`}
      />
    </span>
  );
}
