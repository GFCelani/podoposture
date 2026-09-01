export type Service = {
  title: string;
  body: string[];
  cta: string;
  href: string;
};

/**
 * Os 12 servicos da grade do site atual, verbatim.
 * No HTML de origem cada cartao carrega tres <h3> (dois com o titulo de outro
 * cartao) e ate oito <p> vazios usados como espacador. Aqui fica so o titulo
 * visivel e os paragrafos com conteudo. Nenhuma palavra reescrita.
 */
export const SERVICES: Service[] = [
  {
    title: "OSTEOPATIA",
    body: [
      "Trata a causa primária da sua dor ou queixa, seja de origem visceral, neural ou musculoesquelética através da terapia manual",
    ],
    cta: "Quero os benefícios da Osteopatia",
    href: "/osteopatia",
  },
  {
    title: "FLEXO-DISTRAÇÃO",
    body: [
      "Método inovador de tratamento não-cirúrgico da Hérnia de Disco e outras patologias da Coluna Vertebral",
    ],
    cta: "Quero me livrar das dores na coluna",
    href: "/flexo-distração",
  },
  {
    title: "POSTUROLOGIA",
    body: [
      "Relação entre dores crônicas e a postura do paciente através dos Captores Posturais (Podal, Oclusal, Ocular, Vestibular)",
    ],
    cta: "Quero um especialista em Postura",
    href: "/posturologia",
  },
  {
    title: "AVALIAÇÃO CLÍNICA DA DOR PERSISTENTE",
    body: [
      "Avaliação e cuidado clínico da dor persistente em quem já passou por diferentes tratamentos para dores musculoesqueléticas persistentes, cefaleias, dores orofaciais, desconfortos corporais recorrentes e quadros de dor associados a alterações posturais, da pisada ou da organização do movimento, mesmo após cuidados prévios.",
    ],
    cta: "Quero mais informações",
    href: "/tratamento-da-dor",
  },
  {
    title: "ACUPUNTURA / ELETROACUPUNTURA",
    body: [
      "Acupuntura e Eletroacupuntura aplicadas no tratamento de disfunções físicas, emocionais e energéticas, unindo tradição e neurociência em cada sessão.",
    ],
    cta: "Quero ter os benefícios da Acupuntura",
    href: "/acupuntura",
  },
  {
    title: "PALMILHAS PERSONALIZADAS",
    body: [
      "Palmilhas 100% personalizadas e desenvolvidas a partir de avaliação postural detalhada e do exame de baropodometria. Confeccionadas com diversos materiais de alta tecnologia, são projetadas para oferecer suporte, absorção de impacto, estabilidade e correção postural de forma individualizada.",
    ],
    cta: "Preciso de Palmilhas Corretivas",
    href: "/palmilhas-personalizadas",
  },
  {
    title: "NEUROMODULAÇÃO NÃO INVASIVA",
    body: [
      "Recursos não invasivos que utilizam estímulos leves —elétricos, luminosos ou auditivos — para modular o sistema nervoso, promover neuroplasticidade, equilíbrio autonômico e aliviar diversos sintomas.",
    ],
    cta: "Saiba Mais",
    href: "/neuromodulação",
  },
  {
    title: "BAROPODOMETRIA / TESTE DA PISADA",
    body: [
      "Exame que avalia a distribuição de pressão nos pés, o centro de gravidade e o tipo de pisada, tanto na posição estática quanto em movimento.",
      "Permite identificar o tipo de pé e os desequilíbrios posturais com precisão.",
    ],
    cta: "Quero melhorar minha pisada",
    href: "/baropodometria",
  },
  {
    title: "TRATAMENTO DO ZUMBIDO",
    body: [
      "Tratamento do Zumbido e do Zumbido Somatossensorial relacionado a disfunções da coluna cervical e da ATM, com abordagem integrativa e neurofisiológica.",
    ],
    cta: "Quero Ficar livre do Zumbido",
    href: "/tratamento-do-zumbido",
  },
  {
    title: "TRATAMENTO DO BRUXISMO, DA DTM E DOR OROFACIAL",
    body: [
      "Tratamento da Disfunção Temporomandibular (DTM), Dor Orofacial, Neuralgia do Trigêmeo, Cefaleia Tensional, Bruxismo e Apertamento Dentário — com abordagem integrativa e neurofuncional.",
    ],
    cta: "Quero marcar uma Avaliação",
    href: "/tratamento-da-dtm",
  },
  {
    title: "REEDUCAÇÃO POSTURAL GLOBAL",
    body: [
      "A RPG promove o realinhamento da coluna vertebral, o reequilíbrio das tensões musculares e o desenvolvimento da consciência corporal. Indicada para o tratamento de alterações posturais, dores crônicas e disfunções musculoesqueléticas.",
    ],
    cta: "Quero melhorar minha Postura",
    href: "/rpg",
  },
  {
    title: "RESPONSÁVEL TÉCNICA",
    body: [
      "Claudia Meirelles é Osteopata. Posturóloga e Acupunturista, com formação internacional e quase três décadas dedicadas ao tratamento da dor crônica e da coluna vertebral.",
      "À frente da Podoposture, conduz uma abordagem clínica que integra osteopatia, neurociência e regulação do sistema nervoso",
    ],
    cta: "Quero saber mais",
    href: "/currículo-profissional",
  },
];
