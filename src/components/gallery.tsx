import Image from "next/image";
import { ColumnRules, GridPaper, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Seis fotografias reais da clinica; recepcao, consultorio e acupuntura
 * moram agora nas secoes 02, 08 e 03 e sairam daqui para nao repetir.
 * As outras sete imagens da galeria do site atual sao pecas de marketing com
 * texto embutido (Palmilhas para corrida, Paciente RPG, Paciente com Zumbido,
 * Neuromodulacao, POSTURE+, Axon e um print de Street View) e ficaram de fora.
 */
const PHOTOS = [
  { src: "/img/galeria/sala-de-exame.jpg", alt: "Sala de exame com maca e bancada de equipamentos" },
  { src: "/img/galeria/escritorio.jpg", alt: "Mesa de atendimento com diplomas e modelos anatômicos ao fundo" },
  { src: "/img/galeria/corredor-de-marcha.jpg", alt: "Corredor de avaliação de marcha com tapete e espelho de corpo inteiro" },
  { src: "/img/galeria/avaliacao-postural.jpg", alt: "Paciente em avaliação postural sobre a plataforma, de perfil ao espelho" },
  { src: "/img/galeria/plataforma-de-pressao.jpg", alt: "Pés descalços sobre a plataforma de baropodometria" },
  { src: "/img/galeria/ecobag.jpg", alt: "Ecobag da Podoposture com a marca impressa" },
];

export function Gallery() {
  return (
    <section
      data-tone="deep"
      id="galeria"
      className="relative overflow-hidden bg-deep-calm"
    >
      <GridPaper tone="deep" size={128} fade="top" />
      <ColumnRules tone="deep" />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
        <Reveal variante="cortina">
          <SectionMark n="10" tone="deep" />
          <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.018em] text-balance text-paper">
            Galeria
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div aria-hidden="true" className="mt-10 h-px w-full bg-white/[0.14]" />
        </Reveal>

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {PHOTOS.map((photo, i) => (
            <li key={photo.src}>
              <Reveal delay={(i % 3) * 90}>
                <figure className="group relative overflow-hidden rounded-lg border border-white/[0.12] transition-[border-color,transform,box-shadow] duration-[420ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-1 hover:border-white/40 hover:shadow-lift">
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 z-10 rounded-br-md bg-deep-calm px-2.5 py-1.5 text-[0.625rem] tracking-[0.18em] text-on-deep-muted"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={900}
                    height={1125}
                    sizes="(min-width: 1024px) 380px, 50vw"
                    className="aspect-[4/5] w-full object-cover saturate-[0.88] transition-[filter,transform] duration-[520ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover:scale-[1.04] group-hover:saturate-100"
                  />
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
