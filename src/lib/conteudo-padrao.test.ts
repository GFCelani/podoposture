import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { validarSecao } from "./conteudo-tipos";
import { contatoDoCabecalho, derivarContato, DESCRICAO_PADRAO } from "./site";

/** U+00A0 escrito por codigo: o caractere literal e invisivel na revisao. */
const ESPACO_DURO = String.fromCharCode(0xa0);

/**
 * Paridade: com o banco vazio, o site precisa mostrar exatamente o que mostrava
 * quando estes dados eram constantes.
 *
 * O contato e a parte de maior risco, porque deixou de ser texto escrito e
 * passou a ser DERIVADO de um cadastro: tres formas do endereco, dois formatos
 * de telefone, o link do mapa. Um espaco duro perdido ou um travessao trocado
 * por hifen nao quebra build nenhum e muda o que o Google indexa. Os valores
 * abaixo sao os de src/lib/site.ts antes da mudanca, copiados literalmente.
 */
const ANTES = {
  CLINICA: {
    rua: "Avenida Nossa Senhora de Copacabana, 928 — sala 501",
    bairro: "Copacabana",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    cep: "22020-002",
    pais: "BR",
    latitude: -22.9711,
    longitude: -43.1863,
    telefone: "+552122554845",
  },
  RESPONSAVEL: { nome: "Claudia Meirelles", titulo: "Osteopata, Posturologista e Acupunturista" },
  REDES: {
    facebook: "https://www.facebook.com/1761419930738285",
    instagram: "https://www.instagram.com/podoposture/",
    linkedin: "https://www.linkedin.com/in/claudia-m-b-oliveira-79312937",
    pinterest: "https://br.pinterest.com/pin/571323902725564321/",
  },
  ENDERECO: {
    rua: `Avenida Nossa Senhora de Copacabana,${ESPACO_DURO}928`,
    sala: "Sala 501, Copacabana",
    local: "Rio de Janeiro, RJ",
    completo:
      "Avenida Nossa Senhora de Copacabana, 928 - sala 501 - Copacabana, Rio de Janeiro - RJ, Brasil",
    referencia: "Estamos a 11 minutos da estação Cantagalo do metrô.",
  },
  MAPS_EMBED:
    "https://www.google.com/maps?q=Avenida%20Nossa%20Senhora%20de%20Copacabana%2C%20928%2C%20Copacabana%2C%20Rio%20de%20Janeiro&z=14&output=embed",
  MAPS_DIRECOES:
    "https://www.google.com/maps/dir/?api=1&destination=Avenida%20Nossa%20Senhora%20de%20Copacabana%2C%20928%2C%20Copacabana%2C%20Rio%20de%20Janeiro",
  TELEFONES: [
    { label: "+ 55 21 2255-4845", href: "tel:552122554845", nota: null },
    { label: "+ 55 21 99203-5643", href: "tel:5521992035643", nota: "WhatsApp" },
  ],
  WHATSAPP: "https://wa.me/5521992035643",
  EMAIL: "contatopodoposture@gmail.com",
  HORARIO: "Segunda a sexta-feira, das 8h às 19h",
  DESCRICAO:
    "Integração terapêutica efetiva, inovadora com resultados rápidos e eficazes. " +
    "Osteopatia, posturologia e acupuntura em Copacabana, Rio de Janeiro.",
};

describe("o contato derivado do padrao e o de antes, caractere por caractere", () => {
  const contato = derivarContato(CONTEUDO_PADRAO.contato);

  it("endereco nas tres formas: JSON-LD, tela (com espaco duro) e mapa", () => {
    expect(contato.clinica).toEqual(ANTES.CLINICA);
    expect(contato.endereco).toEqual(ANTES.ENDERECO);
    expect(contato.mapsEmbed).toBe(ANTES.MAPS_EMBED);
    expect(contato.mapsDirecoes).toBe(ANTES.MAPS_DIRECOES);
  });

  it("telefones, WhatsApp, e-mail e horario", () => {
    expect(contato.telefones).toEqual(ANTES.TELEFONES);
    expect(contato.whatsapp).toBe(ANTES.WHATSAPP);
    expect(contato.email).toBe(ANTES.EMAIL);
    expect(contato.horario).toBe(ANTES.HORARIO);
    // o convite de fecho das paginas mostrava o fixo nesta forma, escrita a mao
    expect(contato.telefoneFixo).toEqual({ curto: "(21) 2255-4845", href: "tel:552122554845" });
  });

  it("responsavel, redes na mesma ordem e descricao", () => {
    expect(contato.responsavel).toEqual(ANTES.RESPONSAVEL);
    expect(contato.redes).toEqual(ANTES.REDES);
    expect(contato.sameAs).toEqual(Object.values(ANTES.REDES));
    expect(contato.descricao).toBe(ANTES.DESCRICAO);
    expect(DESCRICAO_PADRAO).toBe(ANTES.DESCRICAO);
    expect(contato.anosDeExperiencia).toBe(30);
  });

  it("o cabecalho, que vai ao navegador, recebe so o que o menu usa", () => {
    expect(Object.keys(contatoDoCabecalho(contato)).sort()).toEqual(
      ["endereco", "mapsDirecoes", "telefones", "whatsapp"].sort(),
    );
  });
});

describe("contato editado continua coerente em todas as formas", () => {
  it("numero de 8 digitos, sem sala e com CEP digitado sem hifen", () => {
    const resultado = validarSecao("contato", {
      ...CONTEUDO_PADRAO.contato,
      telefoneFixo: "(21) 3333-4444",
      whatsapp: "21 98765-4321",
      endereco: { ...CONTEUDO_PADRAO.contato.endereco, rua: "Rua Barata Ribeiro", numero: "100", sala: "", cep: "22011000" },
    });
    expect(resultado.ok).toBe(true);
    const contato = derivarContato(resultado.dados!);

    expect(contato.telefones.map((t) => t.label)).toEqual(["+ 55 21 3333-4444", "+ 55 21 98765-4321"]);
    expect(contato.whatsapp).toBe("https://wa.me/5521987654321");
    expect(contato.endereco.rua).toBe(`Rua Barata Ribeiro,${ESPACO_DURO}100`);
    expect(contato.endereco.sala).toBe("Copacabana");
    expect(contato.clinica.rua).toBe("Rua Barata Ribeiro, 100");
    expect(contato.clinica.cep).toBe("22011-000");
    expect(contato.mapsDirecoes).toContain(encodeURIComponent("Rua Barata Ribeiro, 100, Copacabana, Rio de Janeiro"));
  });
});

describe("os textos do padrao sao os da pagina capturada antes da mudanca", () => {
  // Trechos do texto visivel da home (captura com next start, sem banco).
  it("titulo e apresentacao do hero, corridos", () => {
    expect(CONTEUDO_PADRAO.hero.tituloLinhas.join(" ")).toBe(
      "Integração terapêutica efetiva e inovadora com resultados rápidos e eficazes",
    );
    expect(CONTEUDO_PADRAO.hero.subtituloLinhas.join(" ")).toBe(
      "Dra. Claudia Meirelles, fisioterapeuta especialista em Osteopatia e Acupuntura pelo COFFITO, " +
        "com 30 anos de experiência clínica. Osteopatia, posturologia e acupuntura em Copacabana, Rio de Janeiro.",
    );
  });

  it("grafias intencionais da cliente continuam como estavam", () => {
    expect(CONTEUDO_PADRAO.metodo.titulo).toBe("MÉTODO REGULADOR");
    expect(CONTEUDO_PADRAO.metodo.botao.rotulo).toBe("Conheça o Método RegulaDOR");
    expect(CONTEUDO_PADRAO.metodo.corpo[0]).toContain("da dor - desde");
    expect(CONTEUDO_PADRAO.responsabilidade.paragrafo2.endsWith("cada corpo")).toBe(true);
    expect(CONTEUDO_PADRAO["bem-vindo"].local).toBe("(Copacabana – Rio de Janeiro)");
    expect(CONTEUDO_PADRAO.servicos.itens[6].corpo[0]).toContain("leves —elétricos");
  });
});
