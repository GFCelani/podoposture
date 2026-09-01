import { SectionMark } from "./layers";
import { SpineColumn } from "./spine-column";

export function Hero() {
  return (
    <section
      data-tone="deep"
      className="relative overflow-hidden bg-accent-deep text-paper"
    >
      {/* Camada 1: papel milimetrado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(250,249,246,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,249,246,0.055) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          backgroundPosition: "center",
          maskImage:
            "linear-gradient(to left, #000 0%, rgba(0,0,0,0.4) 52%, transparent 82%)",
          WebkitMaskImage:
            "linear-gradient(to left, #000 0%, rgba(0,0,0,0.4) 52%, transparent 82%)",
        }}
      />

      {/* Camada 2: fios de coluna, na mesma grade do conteudo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mx-auto grid max-w-[1240px] grid-cols-4 px-6 lg:grid-cols-12 lg:px-10"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className={`border-l border-paper/[0.055] ${i >= 4 ? "hidden lg:block" : ""}`}
          />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 px-6 pt-20 pb-20 lg:min-h-[calc(100svh-88px)] lg:grid-cols-12 lg:gap-6 lg:px-10 lg:py-16">
        <div className="lg:col-span-7">
          <div className="rule-in" style={{ ["--in-delay" as string]: "80ms" }}>
            <SectionMark n="01" tone="deep" />
          </div>

          <h1
            className="rule-in mt-9 font-display text-[clamp(2.75rem,5.9vw,4.75rem)] leading-[1.03] font-medium tracking-[-0.025em] text-balance text-paper"
            style={{ ["--in-delay" as string]: "220ms" }}
          >
            Integração terapêutica <mark className="marca-grifo">efetiva</mark>,
            inovadora com resultados rápidos e eficazes
          </h1>

          <div
            aria-hidden="true"
            className="rule-in mt-10 h-px w-full max-w-[420px] bg-paper/[0.14] lg:mt-12"
            style={{ ["--in-delay" as string]: "560ms" }}
          />
        </div>

        <div className="lg:col-span-5">
          <SpineColumn className="mx-auto h-[clamp(330px,52svh,460px)] w-auto lg:h-[clamp(420px,62svh,620px)]" />
        </div>
      </div>
    </section>
  );
}
