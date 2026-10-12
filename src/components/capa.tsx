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
  titulo,
  tema,
  alt = "",
  proporcao = MOLDURA_DOS_CARTOES,
  sizes,
  prioridade = false,
  className = "",
  style,
}: {
  /** Sem capa (o post nao tem foto que mostre o assunto): placa tipografica. */
  src: string | null;
  /** Titulo e tema do post, escritos na placa quando nao ha capa. */
  titulo?: string;
  tema?: string | null;
  alt?: string;
  /** aspect-ratio da moldura, em CSS ("3 / 2", "4 / 5"). */
  proporcao?: string;
  sizes: string;
  prioridade?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  if (!src) {
    return <PlacaSemCapa titulo={titulo} tema={tema} proporcao={proporcao} className={className} style={style} />;
  }
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

/**
 * O lugar da capa quando o post nao tem uma. Nao e' imagem de reserva: ate
 * 2026-10 o site emprestava a capa de outro post, o que punha a arte de um
 * assunto no cartao de outro. A placa so repete o que o cartao ja diz (tema
 * e titulo), na mesma moldura, para a grade do indice nao perder o ritmo.
 */
function PlacaSemCapa({
  titulo,
  tema,
  proporcao,
  className,
  style,
}: {
  titulo?: string;
  tema?: string | null;
  proporcao: string;
  className: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-capa-placa=""
      aria-hidden="true"
      className={`relative flex flex-col justify-between overflow-hidden border border-rule bg-surface p-[8%] ${className}`}
      style={{ ...style, aspectRatio: proporcao, containerType: "inline-size" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-rule) 1px, transparent 1px), linear-gradient(90deg, var(--color-rule) 1px, transparent 1px)",
          backgroundSize: "12.5% 12.5%",
          maskImage: "linear-gradient(135deg, transparent 30%, black)",
        }}
      />
      <p
        className="relative flex items-center gap-3 text-[max(0.5625rem,3.2cqi)] tracking-[0.16em] text-accent uppercase"
        style={{ fontFamily: "var(--mono)" }}
      >
        <span className="h-px w-[8cqi] bg-accent/40" />
        {tema}
      </p>
      {titulo && (
        <p className="relative max-w-[16ch] font-display text-[max(0.875rem,8.5cqi)] leading-[1.08] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
          {titulo}
        </p>
      )}
    </div>
  );
}
