import type { CSSProperties } from "react";
import Image from "next/image";

/**
 * Capa de post: preenche a moldura inteira, ancorada no topo.
 *
 * As capas sao artes de Instagram com texto na imagem, de 9:16 a 3:2. O
 * titulo da arte fica em cima, entao a regra do site e' cortar so por baixo:
 * `object-cover` com `object-top`. Isso so vale enquanto a moldura for pelo
 * menos tao larga (em razao) quanto a capa; mais estreita, o cover cortaria as
 * laterais. Por isso os cartoes usam MOLDURA_DOS_CARTOES, a razao da capa mais
 * larga do acervo, e a pagina do post calcula a moldura a partir da medida.
 *
 * Sem zoom no hover: escalar a imagem empurraria as laterais e o topo para
 * fora da moldura.
 */
export const MOLDURA_DOS_CARTOES = "3 / 2";

export function Capa({
  src,
  alt = "",
  proporcao = MOLDURA_DOS_CARTOES,
  sizes,
  prioridade = false,
  className = "",
  style,
}: {
  src: string;
  alt?: string;
  /** aspect-ratio da moldura, em CSS ("3 / 2", "4 / 5"). */
  proporcao?: string;
  sizes: string;
  prioridade?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const carga = prioridade
    ? ({ loading: "eager", fetchPriority: "high" } as const)
    : ({ loading: "lazy" } as const);
  return (
    <div
      data-capa=""
      className={`relative overflow-hidden bg-surface ${className}`}
      style={{ ...style, aspectRatio: proporcao }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        {...carga}
        className="object-cover object-top saturate-[0.9] transition-[filter] duration-[520ms] group-hover:saturate-100"
      />
    </div>
  );
}
