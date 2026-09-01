import Image from "next/image";
import { Reveal } from "./reveal";

/**
 * Nove fotografias reais da clinica.
 * As outras sete imagens da galeria do site atual sao pecas de marketing com
 * texto embutido (Palmilhas para corrida, Paciente RPG, Paciente com Zumbido,
 * Neuromodulacao, POSTURE+, Axon e um print de Street View) e ficaram de fora.
 */
const PHOTOS = [
  { src: "/img/galeria/recepcao.jpg", alt: "Recepção da clínica, com balcão em madeira e placa da Podoposture" },
  { src: "/img/galeria/consultorio.jpg", alt: "Consultório com mesa de atendimento, espelho de avaliação e bolas suíças" },
  { src: "/img/galeria/sala-de-exame.jpg", alt: "Sala de exame com maca e bancada de equipamentos" },
  { src: "/img/galeria/escritorio.jpg", alt: "Mesa de atendimento com diplomas e modelos anatômicos ao fundo" },
  { src: "/img/galeria/corredor-de-marcha.jpg", alt: "Corredor de avaliação de marcha com tapete e espelho de corpo inteiro" },
  { src: "/img/galeria/avaliacao-postural.jpg", alt: "Paciente em avaliação postural sobre a plataforma, de perfil ao espelho" },
  { src: "/img/galeria/plataforma-de-pressao.jpg", alt: "Pés descalços sobre a plataforma de baropodometria" },
  { src: "/img/galeria/acupuntura.jpg", alt: "Agulhas de acupuntura aplicadas ao longo das costas de um paciente" },
  { src: "/img/galeria/ecobag.jpg", alt: "Ecobag da Podoposture com a marca impressa" },
];

export function Gallery() {
  return (
    <section id="galeria" className="bg-accent-deep">
      <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
        <Reveal>
          <h2 className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-normal text-paper">
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
                <figure className="group relative overflow-hidden border border-white/[0.12] transition-colors duration-300 hover:border-white/40">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={900}
                    height={1125}
                    sizes="(min-width: 1024px) 380px, 50vw"
                    className="aspect-[4/5] w-full object-cover saturate-[0.85] transition-[filter] duration-300 group-hover:saturate-100"
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
