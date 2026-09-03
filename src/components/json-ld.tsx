/**
 * Dados estruturados (schema.org).
 *
 * O site GoDaddy publica um LocalBusiness; o protótipo nao publicava nada. Sair
 * de "tem schema" para "nao tem" seria regressao justamente no sinal que o
 * Google usa para montar o painel de negocio local — endereco, telefone,
 * horario. Aqui o schema fica mais rico que o do site antigo, nao mais pobre.
 */

import {
  CLINICA,
  DESCRICAO_PADRAO,
  RESPONSAVEL,
  SAME_AS,
  SITE_NAME,
  SITE_URL,
  urlAbsoluta,
} from "@/lib/site";

type Json = Record<string, unknown>;

function JsonLd({ dados }: { dados: Json }) {
  return (
    <script
      type="application/ld+json"
      // conteudo proprio, montado em build a partir de constantes tipadas —
      // nao ha entrada de usuario neste caminho
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }}
    />
  );
}

const ID_CLINICA = `${SITE_URL}/#clinica`;

const ENDERECO = {
  "@type": "PostalAddress",
  streetAddress: CLINICA.rua,
  addressLocality: CLINICA.bairro,
  addressRegion: CLINICA.estado,
  postalCode: CLINICA.cep,
  addressCountry: CLINICA.pais,
};

/** Identidade do negocio e do site. Vai no layout, uma vez por pagina. */
export function NegocioLocalJsonLd() {
  return (
    <JsonLd
      dados={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": ["MedicalClinic", "LocalBusiness"],
            "@id": ID_CLINICA,
            name: SITE_NAME,
            description: DESCRICAO_PADRAO,
            url: SITE_URL,
            telephone: CLINICA.telefone,
            address: ENDERECO,
            geo: {
              "@type": "GeoCoordinates",
              latitude: CLINICA.latitude,
              longitude: CLINICA.longitude,
            },
            image: urlAbsoluta("/og.png"),
            sameAs: SAME_AS,
            medicalSpecialty: ["Osteopathic", "PhysicalTherapy"],
            availableService: [
              "Osteopatia",
              "Posturologia",
              "Acupuntura e Eletroacupuntura",
              "Flexo-distração",
              "Palmilhas personalizadas",
              "Neuromodulação não invasiva",
              "Baropodometria",
              "Reeducação Postural Global (RPG)",
            ].map((nome) => ({ "@type": "MedicalTherapy", name: nome })),
            areaServed: {
              "@type": "City",
              name: CLINICA.cidade,
            },
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#site`,
            url: SITE_URL,
            name: SITE_NAME,
            inLanguage: "pt-BR",
            publisher: { "@id": ID_CLINICA },
          },
          {
            "@type": "Person",
            "@id": `${SITE_URL}/#responsavel`,
            name: RESPONSAVEL.nome,
            jobTitle: RESPONSAVEL.titulo,
            worksFor: { "@id": ID_CLINICA },
          },
        ],
      }}
    />
  );
}

/** Trilha de navegacao. Toda pagina que nao e a raiz. */
export function TrilhaJsonLd({
  itens,
}: {
  itens: { nome: string; caminho: string }[];
}) {
  return (
    <JsonLd
      dados={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{ nome: "Início", caminho: "/" }, ...itens].map(
          (item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.nome,
            item: urlAbsoluta(item.caminho),
          }),
        ),
      }}
    />
  );
}

/** Pagina de servico clinico. */
export function PaginaMedicaJsonLd({
  titulo,
  descricao,
  caminho,
}: {
  titulo: string;
  descricao: string;
  caminho: string;
}) {
  return (
    <JsonLd
      dados={{
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        name: titulo,
        description: descricao,
        url: urlAbsoluta(caminho),
        inLanguage: "pt-BR",
        isPartOf: { "@id": `${SITE_URL}/#site` },
        about: { "@type": "MedicalTherapy", name: titulo },
        publisher: { "@id": ID_CLINICA },
      }}
    />
  );
}

/** Post do blog. */
export function ArtigoJsonLd({
  titulo,
  descricao,
  caminho,
  dataISO,
  imagem,
}: {
  titulo: string;
  descricao: string;
  caminho: string;
  dataISO: string;
  imagem?: string;
}) {
  return (
    <JsonLd
      dados={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: titulo,
        description: descricao,
        url: urlAbsoluta(caminho),
        mainEntityOfPage: urlAbsoluta(caminho),
        datePublished: dataISO,
        dateModified: dataISO,
        inLanguage: "pt-BR",
        image: imagem ? urlAbsoluta(imagem) : urlAbsoluta("/og.png"),
        author: { "@id": `${SITE_URL}/#responsavel` },
        publisher: { "@id": ID_CLINICA },
      }}
    />
  );
}
