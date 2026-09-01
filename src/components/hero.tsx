import { SpineColumn } from "./spine-column";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule">
      {/* Grade de fundo: papel milimetrado discreto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-rule) 1px, transparent 1px), linear-gradient(to bottom, var(--color-rule) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          backgroundPosition: "center",
          maskImage:
            "linear-gradient(to left, #000 0%, rgba(0,0,0,0.35) 46%, transparent 74%)",
          WebkitMaskImage:
            "linear-gradient(to left, #000 0%, rgba(0,0,0,0.35) 46%, transparent 74%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-6 pt-16 pb-20 lg:min-h-[76vh] lg:grid-cols-12 lg:gap-6 lg:px-10 lg:pt-20 lg:pb-24">
        <div className="lg:col-span-7">
          <div
            aria-hidden="true"
            className="rule-in h-px w-10 bg-action"
            style={{ ["--in-delay" as string]: "80ms" }}
          />

          <h1 className="rule-in mt-8 font-display text-[clamp(2.375rem,5.1vw,4.25rem)] leading-[1.06] font-normal text-balance text-ink"
            style={{ ["--in-delay" as string]: "180ms" }}
          >
            Integração terapêutica efetiva, inovadora com resultados rápidos e
            eficazes
          </h1>

          <div
            className="rule-in mt-10 h-px w-24 bg-rule"
            style={{ ["--in-delay" as string]: "460ms" }}
          />
        </div>

        <div className="lg:col-span-5">
          <SpineColumn className="mx-auto h-auto w-full max-w-[248px] sm:max-w-[280px] lg:max-w-[320px]" />
        </div>
      </div>
    </section>
  );
}
