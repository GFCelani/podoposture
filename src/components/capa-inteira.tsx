import Image from "next/image";

/**
 * Capa de post dentro de uma moldura de razao fixa, sem recorte.
 *
 * As capas sao artes de Instagram com texto na imagem, de 9:16 a 3:2. O
 * `object-cover` de antes cortava esse texto no topo e nas bordas. Aqui a capa
 * entra com `object-contain`, inteira, e a sobra da moldura e' preenchida pela
 * propria capa desfocada: a grade continua com cartoes de altura igual e a
 * faixa nunca e' um cinza morto, e' a cor da arte.
 *
 * As duas <img> tem o mesmo src e o mesmo sizes, entao o navegador escolhe o
 * mesmo candidato do srcset e baixa uma vez so.
 *
 * O zoom do hover fica so no fundo: escalar a capa empurraria a borda dela
 * para fora da moldura, que e' justamente o corte que isto existe para evitar.
 */
export function CapaInteira({
  src,
  alt = "",
  proporcao = "1 / 1",
  sizes,
  prioridade = false,
  className = "",
}: {
  src: string;
  alt?: string;
  /** aspect-ratio da moldura, em CSS ("1 / 1", "1080 / 1350"). */
  proporcao?: string;
  sizes: string;
  prioridade?: boolean;
  className?: string;
}) {
  const carga = prioridade
    ? ({ loading: "eager", fetchPriority: "high" } as const)
    : ({ loading: "lazy" } as const);
  return (
    <div
      data-capa=""
      className={`relative overflow-hidden bg-surface ${className}`}
      style={{ aspectRatio: proporcao }}
    >
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes={sizes}
        {...carga}
        className="scale-125 object-cover opacity-60 blur-xl saturate-[0.75] transition-transform duration-[520ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-[1.32]"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        {...carga}
        className="object-contain saturate-[0.9] transition-[filter] duration-[520ms] group-hover:saturate-100"
      />
    </div>
  );
}
