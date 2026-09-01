export type Post = {
  date: string;
  /** Categoria como o site exibe na listagem. Seis dos dez posts nao trazem. */
  category: string | null;
  title: string;
  /** Subtitulo ou trecho de corpo, conforme o post tem. Nem todos tem. */
  excerpt: string | null;
  href: string;
  cover: string;
};

const F = "https://podoposture.com.br/home/f/";

/** Os 10 posts da primeira pagina do blog, verbatim. Nenhum gerado. */
export const POSTS: Post[] = [
  {
    date: "24 de agosto de 2026",
    category: "Dor de Cabeça e Cefaleias",
    title: "Neuralgia occipital ou de Arnold:",
    excerpt: "Quando a dor começa na nuca e sobe para a cabeça",
    href: `${F}neuralgia-occipital-ou-de-arnold`,
    cover: "/img/blog/01.jpg",
  },
  {
    date: "21 de agosto de 2026",
    category: "Bruxismo, DTM e Dor Orofacial",
    title: "Bruxismo sem desgaste dos dentes:",
    excerpt: "Por que você pode tensionar a mandíbula sem perceber",
    href: `${F}bruxismo-sem-desgaste-dos-dentes`,
    cover: "/img/blog/02.jpg",
  },
  {
    date: "29 de julho de 2026",
    category: "Tratamento para o Zumbido",
    title: "O melhor tratamento para zumbido não é uma técnica.",
    excerpt:
      "O melhor tratamento para o zumbido não é uma técnica. É A COMBINAÇÃO CERTA.",
    href: `${F}o-melhor-tratamento-para-zumbido-n%C3%A3o-%C3%A9-uma-t%C3%A9cnica`,
    cover: "/img/blog/03.jpg",
  },
  {
    date: "5 de junho de 2026",
    category: "Zumbido e Tinnitus",
    title: "Tratamento para Zumbido: Como a Neuromodulação Pode Ajudar",
    excerpt:
      "O zumbido no ouvido, também conhecido como tinnitus, afeta milhões de pessoas em todo o mundo. Nos últimos anos, pesquisas sobre neuromodulação, neuroplasticidade e tratamento multimodal têm mostrado novas perspectivas p...",
    href: `${F}tratamento-para-zumbido-como-a-neuromodula%C3%A7%C3%A3o-pode-ajudar`,
    cover: "/img/blog/04.jpg",
  },
  {
    date: "28 de maio de 2026",
    category: null,
    title: "Dor Crônica, Default Mode e Medicina Bioelétrica Adaptativa",
    excerpt:
      "Dor Crônica, Default Mode Network e Medicina Bioelétrica Adaptativa: Uma Nova Forma de Entender a Dor",
    href: `${F}dor-cr%C3%B4nica-default-mode-e-medicina-bioel%C3%A9trica-adaptativa`,
    cover: "/img/blog/05.jpg",
  },
  {
    date: "22 de maio de 2026",
    category: null,
    title: "Bruxismo, Refluxo e Sistema Nervoso:",
    excerpt: "Uma Nova Forma de Entender a Dor Orofacial",
    href: `${F}bruxismo-refluxo-e-sistema-nervoso`,
    cover: "/img/blog/06.jpg",
  },
  {
    date: "16 de abril de 2026",
    category: null,
    title: "O que a ciência está revelando sobre o nervo vago",
    excerpt: "E PORQUE ISSO MUDA O OLHAR SOBRE O SISTEMA DE REGULAÇÃO.",
    href: `${F}o-que-a-ci%C3%AAncia-est%C3%A1-revelando-sobre-o-nervo-vago`,
    cover: "/img/blog/07.jpg",
  },
  {
    date: "24 de fevereiro de 2026",
    category: null,
    title: "Diretrizes Brasileiras 2026 para Fibromialgia:",
    excerpt: "O que realmente mudou no tratamento?",
    href: `${F}diretrizes-brasileiras-2026-para-fibromialgia`,
    cover: "/img/blog/08.jpg",
  },
  {
    date: "22 de fevereiro de 2026",
    category: null,
    title: "Tensão interna crônica, ansiedade silenciosa e fadiga ocular",
    excerpt: "C2 - O Áxis",
    href: `${F}tens%C3%A3o-interna-cr%C3%B4nica-ansiedade-silenciosa-e-fadiga-ocular`,
    cover: "/img/blog/09.jpg",
  },
  {
    date: "5 de fevereiro de 2026",
    category: null,
    title: "O que faz uma dor comum se tornar dor crônica?",
    excerpt:
      "Na maioria das situações, a dor surge como um sinal de alerta do organismo diante de uma inflamação, lesão ou sobrecarga. À medida que o tecido se recupera, espera-se que esse sinal diminua e desapareça. No entanto, em ...",
    href: `${F}o-que-faz-uma-dor-comum-se-tornar-dor-cr%C3%B4nica`,
    cover: "/img/blog/10.jpg",
  },
];

/**
 * As 9 categorias da sidebar, mais "All Posts".
 * Continuam LINK para a URL filtrada do site vivo, nao filtro client-side:
 * 5 delas nao tem nenhum dos 10 posts carregados aqui, e filtrar devolveria
 * "nenhum resultado" para assunto que existe no site real.
 */
const C = "https://podoposture.com.br/?blogcategory=";

export const CATEGORIES: { label: string; href: string }[] = [
  { label: "All Posts", href: "https://podoposture.com.br/" },
  {
    label: "Bruxismo, DTM e Dor Orofacial",
    href: `${C}Bruxismo%2C+DTM+e+Dor+Orofacial`,
  },
  { label: "Cefaleia Cervicogênica", href: `${C}Cefaleia+Cervicog%C3%AAnica` },
  {
    label: "Dor de Cabeça e Cefaleias",
    href: `${C}Dor+de+Cabe%C3%A7a+e+Cefaleias`,
  },
  {
    label: "Exercícios Respiratórios",
    href: `${C}Exerc%C3%ADcios+Respirat%C3%B3rios`,
  },
  { label: "Mecanismo de WINDLASS", href: `${C}Mecanismo+de+WINDLASS` },
  {
    label: "Período de Adaptação",
    href: `${C}Per%C3%ADodo+de+Adapta%C3%A7%C3%A3o+`,
  },
  {
    label: "Tratamento para o Zumbido",
    href: `${C}Tratamento+para+o+Zumbido`,
  },
  { label: "Zumbido e Tinnitus", href: `${C}Zumbido+e+Tinnitus` },
  { label: "tDCS e dor crônica", href: `${C}tDCS+e+dor+cr%C3%B4nica` },
];
