/**
 * Camadas reutilizaveis de fundo e de marcacao.
 * Existem para que nenhuma secao seja fundo chapado com texto em cima:
 * a densidade da pagina vem daqui, nao de fotografia.
 */

type Tone = "light" | "deep";

/**
 * Grade de fundo. Papel milimetrado e fios de coluna na mesma camada, para
 * que nenhuma banda possa ter um sem o outro.
 *
 * A geometria e' da pagina, nao da secao: a origem e o passo saem da largura
 * da janela (100cqw na ancora), entao os fios caem na mesma abscissa em todas
 * as bandas, correm de borda a borda e nao herdam a largura da coluna de
 * texto. Ver .grade em globals.css.
 *
 * Toda banda da pagina recebe uma, inclusive as costuras e o cabecalho: e' o
 * que faz a grade nao ter interrupcao de cima a baixo.
 */
export function PageGrid({ tone = "light" }: { tone?: Tone }) {
  return (
    <div aria-hidden="true" className="grade-ancora">
      <div className="grade" data-grade={tone} />
    </div>
  );
}

/** Numeracao mono da secao, no mesmo desenho do 01 do hero. */
export function SectionMark({
  n,
  tone = "light",
}: {
  n: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center gap-4">
      <span
        className={`text-[0.6875rem] tracking-[0.2em] ${
          tone === "deep" ? "text-on-deep-muted" : "text-muted"
        }`}
        style={{ fontFamily: "var(--mono)" }}
      >
        {n}
      </span>
      <span
        aria-hidden="true"
        className={`h-px w-14 ${tone === "deep" ? "bg-accent-light/45" : "bg-accent/30"}`}
      />
    </div>
  );
}

/**
 * Costura entre o hero em petroleo e o papel: o plano de apoio da coluna
 * continua na pagina como regua, em vez de o escuro cortar seco no claro.
 * Leva a grade tambem: sao 15px, mas sem ela os fios verticais piscariam
 * a cada troca de banda.
 */
export function SeamRuler() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative">
      <PageGrid />
      <div className="relative h-px w-full bg-accent-light/25" />
      <div className="relative h-3.5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--color-rule) 0 1px, transparent 1px 26px)",
            backgroundSize: "auto 6px",
            backgroundRepeat: "repeat-x",
            maskImage:
              "linear-gradient(to right, #000 0%, rgba(0,0,0,0.5) 46%, transparent 78%)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 0%, rgba(0,0,0,0.5) 46%, transparent 78%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--color-rule) 0 1px, transparent 1px 208px)",
            backgroundSize: "auto 14px",
            backgroundRepeat: "repeat-x",
            maskImage:
              "linear-gradient(to right, #000 0%, rgba(0,0,0,0.5) 46%, transparent 78%)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 0%, rgba(0,0,0,0.5) 46%, transparent 78%)",
          }}
        />
      </div>
    </div>
  );
}
