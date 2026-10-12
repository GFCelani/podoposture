export type NavItem = { label: string; href: string };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Os 20 itens do menu atual, reagrupados em 4 categorias.
 * Rotulos e destinos sao os do site em producao, sem alteracao.
 */
export const NAV_HOME: NavItem = { label: "Início", href: "/home" };
export const NAV_BLOG: NavItem = { label: "Nosso Blog", href: "/nosso-blog" };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tratamentos",
    items: [
      { label: "Tratamento da Dor", href: "/tratamento-da-dor" },
      { label: "Dor Lombar Crônica", href: "/dor-lombar-crônica" },
      { label: "Tratamento do Zumbido", href: "/tratamento-do-zumbido" },
      { label: "Tratamento da DTM", href: "/tratamento-da-dtm" },
    ],
  },
  {
    label: "Técnicas",
    items: [
      { label: "Osteopatia", href: "/osteopatia" },
      { label: "Posturologia", href: "/posturologia" },
      { label: "RPG", href: "/rpg" },
      { label: "Acupuntura", href: "/acupuntura" },
      { label: "Acupuntura Clínica", href: "/acupuntura-clínica" },
      { label: "Flexo-distração", href: "/flexo-distração" },
      { label: "Neuromodulação", href: "/neuromodulação" },
      { label: "Método Posture+", href: "/método-posture+" },
      { label: "Palmilhas Personalizadas", href: "/palmilhas-personalizadas" },
    ],
  },
  {
    label: "Avaliação",
    items: [
      { label: "Baropodometria", href: "/baropodometria" },
    ],
  },
  {
    label: "A Clínica",
    items: [
      { label: "Quem Somos", href: "/quem-somos" },
      { label: "Como é o meu atendimento", href: "/como-e-o-meu-atendimento" },
      { label: "Responsável Técnica", href: "/responsável-técnica" },
      { label: "Currículo Profissional", href: "/currículo-profissional" },
      { label: "Contato", href: "/contato" },
    ],
  },
];

/** O grupo do menu em que a pagina entra; fora do menu, nenhum. */
export function grupoDoMenu(href: string): NavGroup | undefined {
  const alvo = href.normalize("NFC");
  return NAV_GROUPS.find((g) => g.items.some((i) => i.href.normalize("NFC") === alvo));
}
