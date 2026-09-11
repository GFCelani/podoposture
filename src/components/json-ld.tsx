/**
 * Dados estruturados (schema.org).
 *
 * O site GoDaddy publica um LocalBusiness; o protótipo nao publicava nada. Sair
 * de "tem schema" para "nao tem" seria regressao justamente no sinal que o
 * Google usa para montar o painel de negocio local — endereco, telefone,
 * horario. Aqui o schema fica mais rico que o do site antigo, nao mais pobre.
 */

import { SITE_NAME, SITE_URL, urlAbsoluta, type ContatoDoSite } from "@/lib/site";

type Json = Record<string, unknown>;

/**
 * JSON dentro de <script> precisa do "<" escapado.
 *
 * `JSON.stringify` escapa aspas e barra invertida, mas nao "<". O analisador de
 * HTML nao sabe que esta dentro de JSON: ele fecha a tag no primeiro `</script`
 * que encontrar, e o que vier depois vira marcacao de verdade. Um titulo com
 * `</script><script>...` sairia daqui como script executavel numa pagina
 * publica e indexada.
 *
 * O comentario que estava aqui dizia "nao ha entrada de usuario neste caminho".
 * Era verdade enquanto a unica fonte era o extrator Python. O painel abriu uma
 * segunda fonte — titulo, resumo e capa vem do banco — e a frase virou mentira
 * sem que uma linha deste arquivo mudasse. Achado por auditoria cega.
 *
 * `<` e a mesma coisa que "<" para quem le o JSON, entao nada muda para o
 * buscador.
 */
function JsonLd({ dados }: { dados: Json }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
    />
  );
}

const ID_CLINICA = `${SITE_URL}/#clinica`;

/**
 * Identidade do negocio e do site. Vai no layout, uma vez por pagina.
 *
 * Nome da responsavel, descricao, endereco e redes vem do painel: sao
 * exatamente os campos que passam pelo escape de `JsonLd` acima.
 */
export function NegocioLocalJsonLd({ contato }: { contato: ContatoDoSite }) {
  const { clinica } = contato;
  return (
    <JsonLd
      dados={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": ["MedicalClinic", "LocalBusiness"],
            "@id": ID_CLINICA,
            name: SITE_NAME,
            description: contato.descricao,
            url: SITE_URL,
            telephone: clinica.telefone,
            address: {
              "@type": "PostalAddress",
              streetAddress: clinica.rua,
              addressLocality: clinica.bairro,
              addressRegion: clinica.estado,
              postalCode: clinica.cep,
              addressCountry: clinica.pais,
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: clinica.latitude,
              longitude: clinica.longitude,
            },
            image: urlAbsoluta("/og.png"),
            sameAs: contato.sameAs,
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
              name: clinica.cidade,
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
            name: contato.responsavel.nome,
            jobTitle: contato.responsavel.titulo,
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
