import Image from "next/image";
import { SectionMark } from "./layers";
import { SpineColumn } from "./spine-column";

/** Mascara do campo: some onde o titulo passa, cheia onde a coluna esta. */
const MASCARA =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.22) 24%, rgba(0,0,0,0.75) 46%, #000 64%)";

export function Hero() {
  return (
    <section
      data-tone="deep"
      className="luz relative overflow-hidden bg-accent-deep text-paper"
    >
      {/* Camada 0: a clinica, quase apagada sob o petroleo. Dessaturada e
          com veu escuro por cima; trocar a foto quando vier a nova. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/img/clinica-podoposture-5.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-[0.17] saturate-0"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-accent-deep) 0%, rgb(13 37 54 / 0.55) 40%, rgb(13 37 54 / 0.6) 70%, var(--color-accent-deep) 100%)",
          }}
        />
      </div>

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

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-0 px-6 pt-20 pb-16 lg:min-h-[calc(100svh-92px)] lg:grid-cols-12 lg:gap-6 lg:px-10 lg:py-16">
        <div className="relative z-10 lg:col-span-7">
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

          {/* Curva de forca da marcha: o duplo pico de cada passo, o
              vocabulario da baropodometria, correndo sob o titulo */}
          <svg
            aria-hidden="true"
            viewBox="0 0 420 46"
            className="rule-in mt-6 h-11 w-full max-w-[420px]"
            style={{ ["--in-delay" as string]: "760ms" }}
          >
            <path
              className="traco-monitor"
              d="M0 40 H24 C34 40 36 16 46 15 C54 14 56 26 66 27 C76 28 78 13 86 13 C96 13 100 40 110 40 H164 C174 40 176 16 186 15 C194 14 196 26 206 27 C216 28 218 13 226 13 C236 13 240 40 250 40 H304 C314 40 316 16 326 15 C334 14 336 26 346 27 C356 28 358 13 366 13 C376 13 380 40 390 40 H420"
              fill="none"
              stroke="var(--color-accent-light)"
              strokeOpacity={0.55}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
            <circle className="traco-monitor-ponto" cx={0} cy={40} r={2.6} fill="var(--color-accent-light)" />
          </svg>
        </div>

        {/* Campo de aprumo. No telefone entra no fluxo, sangrando de borda a
            borda; no desktop passa a ocupar dois tercos da largura do hero,
            por tras do titulo, com a mascara devolvendo a legibilidade. */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative -mx-6 mt-12 h-[clamp(340px,52svh,460px)] w-[calc(100%+3rem)] lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:h-auto lg:w-[64%]"
          style={{ maskImage: MASCARA, WebkitMaskImage: MASCARA }}
        >
          <SpineColumn className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}
