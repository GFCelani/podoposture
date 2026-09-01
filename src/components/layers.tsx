/**
 * Camadas reutilizaveis de fundo e de marcacao.
 * Existem para que nenhuma secao seja fundo chapado com texto em cima:
 * a densidade da pagina vem daqui, nao de fotografia.
 */

type Tone = "light" | "deep";

const FADE: Record<string, string> = {
  left: "linear-gradient(to left, #000 0%, rgba(0,0,0,0.35) 52%, transparent 84%)",
  right: "linear-gradient(to right, #000 0%, rgba(0,0,0,0.35) 52%, transparent 84%)",
  top: "linear-gradient(to top, #000 0%, rgba(0,0,0,0.3) 46%, transparent 80%)",
  bottom:
    "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.3) 46%, transparent 80%)",
};

/** Papel milimetrado. Escala diferente por secao, para o fundo nao repetir. */
export function GridPaper({
  tone = "light",
  size = 72,
  fade = "left",
}: {
  tone?: Tone;
  size?: number;
  fade?: keyof typeof FADE;
}) {
  const line =
    tone === "deep" ? "rgba(250,249,246,0.055)" : "var(--color-rule)";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: "center",
        opacity: tone === "deep" ? 1 : 0.3,
        maskImage: FADE[fade],
        WebkitMaskImage: FADE[fade],
      }}
    />
  );
}

/** Fios verticais na mesma grade do conteudo. Estrutura o vazio. */
export function ColumnRules({ tone = "light" }: { tone?: Tone }) {
  const border =
    tone === "deep" ? "border-paper/[0.07]" : "border-rule/60";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mx-auto max-w-[1240px] px-6 lg:px-10"
    >
      <div className="grid h-full grid-cols-4 gap-x-6 lg:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className={`border-l ${border} ${i >= 4 ? "hidden lg:block" : ""}`}
          />
        ))}
      </div>
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
        className={`h-px w-14 ${tone === "deep" ? "bg-accent-light/70" : "bg-accent/50"}`}
      />
    </div>
  );
}

/**
 * Costura entre o hero em petroleo e o papel: o plano de apoio da coluna
 * continua na pagina como regua, em vez de o escuro cortar seco no claro.
 */
export function SeamRuler() {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <div className="h-px w-full bg-accent-light/40" />
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
