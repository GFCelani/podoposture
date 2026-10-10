/**
 * "Como é o meu atendimento": o texto que a cliente escreveu para a pagina,
 * verbatim. Nenhuma palavra, acento ou pontuacao muda aqui; a pagina so
 * decide a forma (components/como-e-o-meu-atendimento.tsx).
 *
 * Rota propria, e nao uma entrada de pages.json: aquele arquivo e' gerado
 * pelo extrator do site antigo, e esta pagina nasceu depois dele, com uma
 * composicao que o sistema de blocos nao tem (a jornada em oito etapas).
 */

export const CAMINHO_DO_ATENDIMENTO = "/como-e-o-meu-atendimento";

export const TITULO_DO_ATENDIMENTO = "Como é o meu atendimento";

/** As duas frases de abertura. Juntas, sao tambem a descricao de busca. */
export const ABERTURA_DO_ATENDIMENTO = [
  "Uma avaliação que vai além do local da dor.",
  "Um tratamento que considera o funcionamento do corpo como um todo.",
] as const;

export const DESCRICAO_DO_ATENDIMENTO = ABERTURA_DO_ATENDIMENTO.join(" ");

/** Os paragrafos antes do item 1. */
export const INTRODUCAO_DO_ATENDIMENTO = [
  "Nem sempre o lugar onde sentimos dor é o único envolvido na sua origem ou manutenção.",
  "Uma dor cervical pode estar associada a alterações da mandíbula, dos ombros ou do controle muscular. Uma dor lombar pode envolver fatores neurológicos, musculares e biomecânicos. E sintomas como zumbido, cefaleia e tontura podem apresentar relações com diferentes sistemas do organismo.",
  "Por isso, meu atendimento começa com uma investigação clínica detalhada, buscando compreender não apenas onde está o sintoma, mas quais fatores podem estar contribuindo para sua persistência.",
] as const;

/** Item da lista de recursos do passo 6. `href` so quando o site tem a pagina. */
export type RecursoDoAtendimento = { texto: string; href?: string };

export type EtapaDoAtendimento = {
  /** O numero como a cliente escreveu ("1."). */
  numero: string;
  titulo: string;
  /** Ancora da etapa, ASCII. */
  id: string;
  paragrafos: readonly string[];
  /** So o passo 6: a lista entra depois do paragrafo `listaDepois`. */
  lista?: readonly RecursoDoAtendimento[];
  listaDepois?: number;
};

export const ETAPAS_DO_ATENDIMENTO: readonly EtapaDoAtendimento[] = [
  {
    numero: "1.",
    titulo: "Primeiro, compreender a sua história",
    id: "compreender-a-sua-historia",
    paragrafos: [
      "A consulta começa com uma conversa cuidadosa sobre a sua saúde.",
      "Investigo quando os sintomas começaram, como evoluíram, o que os intensifica ou melhora, os tratamentos já realizados e como interferem nas suas atividades.",
      "Também considero aspectos como qualidade do sono, nível de estresse, hábitos, condições clínicas associadas e a maneira como o sistema nervoso pode estar respondendo aos estímulos.",
      "O objetivo é compreender o contexto em que os sintomas aparecem e persistem.",
    ],
  },
  {
    numero: "2.",
    titulo: "Uma avaliação clínica e neurológica detalhada",
    id: "avaliacao-clinica-e-neurologica",
    paragrafos: [
      "O exame físico vai além da região dolorosa.",
      "Avalio mobilidade, força muscular, sensibilidade, reflexos, coordenação, controle motor e possíveis alterações relacionadas aos nervos periféricos e à coluna vertebral.",
      "Dependendo da queixa, também são realizados testes específicos para a mandíbula, região cervical, equilíbrio e outras estruturas envolvidas.",
      "Essa investigação ajuda a diferenciar os mecanismos que podem estar relacionados aos sintomas e orientar a escolha das intervenções.",
    ],
  },
  {
    numero: "3.",
    titulo: "Avaliação postural e biomecânica",
    id: "avaliacao-postural-e-biomecanica",
    paragrafos: [
      "O corpo funciona de maneira coordenada. Alterações em uma região podem modificar a distribuição de cargas e as estratégias de movimento em outras.",
      "Quando indicado, realizo uma avaliação postural com registros fotográficos de frente, de costas e de perfil.",
      "Também podem ser utilizados exames complementares, como baropodometria, estabilometria e análise da marcha, para investigar a distribuição das pressões plantares, o equilíbrio e o comportamento do corpo durante o movimento.",
      "O objetivo não é buscar uma postura perfeita, mas compreender como cada pessoa se movimenta, distribui cargas e responde às exigências do dia a dia.",
    ],
  },
  {
    numero: "4.",
    titulo: "Investigação das conexões musculares e funcionais",
    id: "conexoes-musculares-e-funcionais",
    paragrafos: [
      "Músculos, articulações, fáscias e nervos participam de um sistema de movimento interdependente.",
      "Durante a avaliação, observo padrões de compensação, mobilidade, controle muscular e possíveis relações entre diferentes regiões do corpo.",
      "Uma queixa no ombro, por exemplo, pode exigir uma investigação da coluna torácica e da maneira como a escápula se movimenta.",
      "Da mesma forma, determinadas dores cervicais podem estar associadas à função mandibular ou a alterações do controle muscular.",
      "Essas relações são investigadas por meio de testes clínicos, sem presumir que toda alteração encontrada seja necessariamente a causa da dor.",
    ],
  },
  {
    numero: "5.",
    titulo: "Compreender como o sistema nervoso participa da dor",
    id: "sistema-nervoso-e-dor",
    paragrafos: [
      "A dor não depende exclusivamente das condições dos músculos, articulações ou discos intervertebrais.",
      "O sistema nervoso participa continuamente da recepção, transmissão e processamento das informações provenientes do corpo.",
      "Em algumas situações, especialmente na dor persistente, podem ocorrer alterações na sensibilidade e na maneira como esses sinais são processados.",
      "Por isso, a avaliação também considera características da dor, hipersensibilidade, sono, aspectos emocionais e impacto funcional.",
      "Quando necessário, utilizo questionários clínicos validados para complementar essa investigação e acompanhar a evolução.",
    ],
  },
  {
    numero: "6.",
    titulo: "Um plano terapêutico construído a partir da avaliação",
    id: "plano-terapeutico",
    paragrafos: [
      "Após reunir as informações clínicas, estabeleço as prioridades do tratamento.",
      "Conforme as necessidades identificadas, o atendimento pode envolver:",
      "Nenhuma técnica é aplicada simplesmente por fazer parte de um protocolo fixo.",
      "A escolha depende da avaliação, dos objetivos clínicos, das indicações e contraindicações e da resposta individual ao tratamento.",
    ],
    listaDepois: 2,
    lista: [
      { texto: "Osteopatia e terapia manual.", href: "/osteopatia" },
      { texto: "Acupuntura e eletroacupuntura.", href: "/acupuntura" },
      {
        texto: "Neuromodulação não invasiva e estimulação elétrica percutânea, quando indicadas.",
        href: "/neuromodulação",
      },
      { texto: "Fotobiomodulação." },
      { texto: "Exercícios terapêuticos e treinamento do controle motor." },
      { texto: "Biofeedback e estratégias de regulação autonômica." },
      { texto: "Recursos específicos para alterações posturais e biomecânicas.", href: "/posturologia" },
    ],
  },
  {
    numero: "7.",
    titulo: "Acompanhamento da evolução",
    id: "acompanhamento-da-evolucao",
    paragrafos: [
      "O tratamento não termina na aplicação de uma técnica.",
      "Ao longo das sessões, observo mudanças na intensidade dos sintomas, na mobilidade, na capacidade funcional e na realização das atividades cotidianas.",
      "Quando pertinente, utilizo medidas clínicas e instrumentos de acompanhamento para verificar a evolução e ajustar as condutas.",
      "Mais do que observar se a dor diminuiu naquele momento, é importante compreender se houve melhora da função e da qualidade de vida.",
    ],
  },
  {
    numero: "8.",
    titulo: "Integração com outros profissionais",
    id: "integracao-com-outros-profissionais",
    paragrafos: [
      "Em determinadas condições, o acompanhamento conjunto com médicos, otorrinolaringologistas, neurologistas, dentistas, psicólogos ou outros profissionais pode ser necessário.",
      "A integração entre diferentes áreas permite considerar aspectos que uma única intervenção pode não contemplar.",
    ],
  },
];

/** O separador que a cliente pos antes do fecho. */
export const SEPARADOR_DO_ATENDIMENTO = "⸻";

export const FECHO_DO_ATENDIMENTO = [
  "Cada paciente apresenta uma história. Cada avaliação precisa encontrar as perguntas certas.",
  "A proposta do atendimento é compreender os mecanismos que podem estar contribuindo para os sintomas e utilizar os recursos terapêuticos de maneira criteriosa, fundamentada e individualizada.",
] as const;

/** A ultima frase do fecho, em destaque. */
export const CITACAO_DO_ATENDIMENTO =
  "Porque tratar a dor não é apenas olhar para onde ela aparece. É investigar o que pode estar contribuindo para sua permanência.";

export const ASSINATURA_DO_ATENDIMENTO = {
  nome: "Dra. Claudia Meirelles",
  especialidades: "Fisioterapia | Osteopatia | Acupuntura | Posturologia | Neuromodulação Clínica",
} as const;
