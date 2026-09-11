import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import {
  CHAVES_DE_SECAO,
  DESCRITORES,
  IMAGENS_DO_SITE,
  PAGINAS_DE_DESTINO,
  PREFIXO_IMAGEM_ENVIADA,
  conferirCampo,
  hrefDoDestino,
  mesclarConteudo,
  mesclarSecao,
  precisaDeEspacoAntes,
  segmentosDoSubtitulo,
  validarSecao,
  type Campo,
  type ChaveDeSecao,
  type Imagem,
} from "./conteudo-tipos";
import { dimensoesDoWebp } from "./imagem-webp";
import { NAV_BLOG, NAV_GROUPS } from "./nav";
import { PREFIXO_IMAGEM } from "./painel-tipos";

/**
 * O contrato do conteudo editavel. A rota do painel e o editor validam com as
 * mesmas funcoes, entao o que este teste prova vale para as duas pontas.
 *
 * O cuidado que mais importa esta na mescla: um documento salvo no banco por
 * uma versao antiga do codigo, ou com um campo estragado, nunca pode derrubar a
 * pagina. No pior caso a secao volta ao texto de hoje.
 */

const RAIZ = process.cwd();

/** Copia do valor com um caminho trocado ("endereco.cep", "passos.2"). */
function comValor(base: unknown, caminho: string, valor: unknown): Record<string, unknown> {
  const copia = structuredClone(base) as Record<string, unknown>;
  const partes = caminho.split(".");
  let alvo = copia;
  for (const parte of partes.slice(0, -1)) alvo = alvo[parte] as Record<string, unknown>;
  alvo[partes[partes.length - 1]] = valor;
  return copia;
}

function ler(base: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((atual, parte) => (atual as Record<string, unknown>)[parte], base);
}

function errosDe(chave: ChaveDeSecao, caminho: string, valor: unknown) {
  return validarSecao(chave, comValor(CONTEUDO_PADRAO[chave], caminho, valor)).erros;
}

type Folha = { caminho: string; campo: Campo };

/** Os campos de cada secao, descendo pelos grupos (listas ficam inteiras). */
function folhas(campos: Record<string, Campo>, prefixo = ""): Folha[] {
  return Object.entries(campos).flatMap(([nome, campo]) => {
    const caminho = prefixo ? `${prefixo}.${nome}` : nome;
    return campo.tipo === "grupo" ? folhas(campo.campos, caminho) : [{ caminho, campo }];
  });
}

const FOLHAS = CHAVES_DE_SECAO.flatMap((chave) =>
  folhas(DESCRITORES[chave].campos as Record<string, Campo>).map((f) => ({ chave, ...f })),
);

/* ---------------------------------------------------------------- padrao */

describe("o conteudo padrao", () => {
  it.each(CHAVES_DE_SECAO.map((c) => [c]))("%s passa na validacao e ja sai normalizado", (chave) => {
    const resultado = validarSecao(chave, CONTEUDO_PADRAO[chave]);
    expect(resultado.erros).toEqual({});
    expect(resultado.dados).toEqual(CONTEUDO_PADRAO[chave]);
  });

  it.each(CHAVES_DE_SECAO.map((c) => [c]))("%s tem descritor para todo campo e nada a mais", (chave) => {
    expect(Object.keys(DESCRITORES[chave].campos).sort()).toEqual(
      Object.keys(CONTEUDO_PADRAO[chave]).sort(),
    );
    expect(DESCRITORES[chave].rotulo).not.toBe("");
    expect(DESCRITORES[chave].ajuda).not.toBe("");
  });

  it("padrao mesclado com banco vazio e o proprio padrao", () => {
    expect(mesclarConteudo(CONTEUDO_PADRAO, {})).toEqual(CONTEUDO_PADRAO);
  });
});

/* ---------------------------------------------------------------- limites */

describe("cada teto de texto", () => {
  const textos = FOLHAS.filter(
    ({ campo }) => (campo.tipo === "texto" && !campo.formato) || campo.tipo === "paragrafo",
  );

  it.each(textos.map((f) => [`${f.chave}.${f.caminho}`, f]))("%s", (_nome, { chave, caminho, campo }) => {
    if (campo.tipo !== "texto" && campo.tipo !== "paragrafo") throw new Error("filtro errado");

    expect(errosDe(chave, caminho, "a".repeat(campo.max + 1))[caminho]).toMatch(/no máximo/);
    // No teto exato o limite nao reclama (uma regra entre campos pode reclamar
    // de outra coisa, como o grifo que sumiu do titulo).
    expect(errosDe(chave, caminho, "é".repeat(campo.max))[caminho] ?? "").not.toMatch(/máximo/);

    const vazio = errosDe(chave, caminho, "   ")[caminho];
    if (campo.opcional) expect(vazio).toBeUndefined();
    else expect(vazio).toBe("Preencha este campo.");
  });
});

describe("cada lista respeita minimo e maximo", () => {
  const listas = FOLHAS.filter(({ campo }) => campo.tipo === "lista");

  it.each(listas.map((f) => [`${f.chave}.${f.caminho}`, f]))("%s", (_nome, { chave, caminho, campo }) => {
    if (campo.tipo !== "lista") throw new Error("filtro errado");
    const atual = ler(CONTEUDO_PADRAO[chave], caminho) as unknown[];
    const primeiro = atual[0];

    const repetir = (n: number) => Array.from({ length: n }, () => structuredClone(primeiro));
    expect(errosDe(chave, caminho, repetir(campo.max + 1))[caminho]).toMatch(/No máximo/);
    if (campo.min > 0) {
      expect(errosDe(chave, caminho, repetir(campo.min - 1))[caminho]).toMatch(/pelo menos/);
    }
    if (primeiro !== undefined) expect(errosDe(chave, caminho, repetir(campo.max))[caminho]).toBeUndefined();
  });

  it("os paragrafos de um servico vao de 1 a 3", () => {
    const item = CONTEUDO_PADRAO.servicos.itens[0];
    expect(errosDe("servicos", "itens.0.corpo", [])["itens.0.corpo"]).toBeDefined();
    expect(errosDe("servicos", "itens.0.corpo", Array(4).fill(item.corpo[0]))["itens.0.corpo"]).toBeDefined();
    expect(errosDe("servicos", "itens.0.corpo", Array(3).fill(item.corpo[0]))).toEqual({});
  });

  it("titulo e apresentacao do hero tem exatamente 4 linhas, com teto por linha", () => {
    const linhas = CONTEUDO_PADRAO.hero.tituloLinhas;
    expect(errosDe("hero", "tituloLinhas", linhas.slice(0, 3)).tituloLinhas).toBeDefined();
    expect(errosDe("hero", "tituloLinhas", [...linhas, "mais"]).tituloLinhas).toBeDefined();
    expect(errosDe("hero", "tituloLinhas.0", "a".repeat(23))["tituloLinhas.0"]).toMatch(/22/);
    expect(errosDe("hero", "tituloLinhas.0", "a".repeat(22))).toEqual({});
    expect(errosDe("hero", "subtituloLinhas.3", "a".repeat(54))["subtituloLinhas.3"]).toMatch(/53/);
    expect(errosDe("hero", "tituloLinhas.2", "")["tituloLinhas.2"]).toBe("Preencha a linha 3.");
  });

  it("anos de experiencia e inteiro de 1 a 80", () => {
    for (const ruim of [0, 81, 2.5, "trinta", null]) {
      expect(errosDe("contato", "anosDeExperiencia", ruim).anosDeExperiencia).toBeDefined();
    }
    const resultado = validarSecao("contato", comValor(CONTEUDO_PADRAO.contato, "anosDeExperiencia", "45"));
    expect(resultado.dados?.anosDeExperiencia).toBe(45);
  });
});

/* ---------------------------------------------------------------- destino */

describe("destino e uma lista fechada", () => {
  it("pagina que nao existe e recusada", () => {
    for (const slug of ["nao-existe", "home", "", "/osteopatia", "../publicar"]) {
      const erros = errosDe("tratamentos", "cartoes.0.destino", { tipo: "pagina", slug });
      expect(erros["cartoes.0.destino"], slug).toMatch(/não existe/);
    }
  });

  it("tipo fora do que o campo aceita e recusado, e nao ha URL livre", () => {
    expect(errosDe("tratamentos", "cartoes.0.destino", { tipo: "whatsapp" })["cartoes.0.destino"]).toBeDefined();
    expect(errosDe("hero", "botoes.0.destino", { tipo: "nenhum" })["botoes.0.destino"]).toBeDefined();
    for (const livre of [
      { tipo: "url", href: "javascript:alert(1)" },
      "javascript:alert(1)",
      "https://outro-site.com",
      null,
    ]) {
      expect(errosDe("abordagem", "botao.destino", livre)["botao.destino"]).toBe("Escolha um destino da lista.");
    }
  });

  it("so o botao do metodo aceita ficar sem destino", () => {
    expect(errosDe("metodo", "botao.destino", { tipo: "nenhum" })).toEqual({});
    const aceitamNenhum = FOLHAS.filter(
      ({ campo }) => campo.tipo === "destino" && campo.aceita.includes("nenhum"),
    ).map((f) => `${f.chave}.${f.caminho}`);
    expect(aceitamNenhum).toEqual(["metodo.botao.destino"]);
  });

  it("slug acentuado digitado em NFD e guardado em NFC", () => {
    const nfd = "dor-lombar-crônica".normalize("NFD");
    const resultado = validarSecao(
      "tratamentos",
      comValor(CONTEUDO_PADRAO.tratamentos, "cartoes.0.destino", { tipo: "pagina", slug: nfd }),
    );
    expect(resultado.dados?.cartoes[0].destino).toEqual({ tipo: "pagina", slug: "dor-lombar-crônica".normalize("NFC") });
  });

  it("a lista de paginas e a de pages.json, sem a home", () => {
    const paginas = JSON.parse(readFileSync(join(RAIZ, "src", "content", "pages.json"), "utf8")) as { slug: string }[];
    const doJson = paginas.map((p) => p.slug.normalize("NFC")).filter((s) => s !== "home").sort();
    expect(PAGINAS_DE_DESTINO.map((p) => p.slug).sort()).toEqual(doJson);
  });

  it("os rotulos sao os do menu que a clinica ja conhece", () => {
    const doMenu = new Map(
      [...NAV_GROUPS.flatMap((g) => g.items), NAV_BLOG].map((i) => [i.href.normalize("NFC"), i.label]),
    );
    for (const pagina of PAGINAS_DE_DESTINO) expect(pagina.rotulo).toBe(doMenu.get(`/${pagina.slug}`));
  });

  it("href sai so da uniao fechada", () => {
    const zap = "https://wa.me/5521992035643";
    expect(hrefDoDestino({ tipo: "pagina", slug: "osteopatia" }, zap)).toBe("/osteopatia");
    expect(hrefDoDestino({ tipo: "whatsapp" }, zap)).toBe(zap);
    expect(hrefDoDestino({ tipo: "nenhum" }, zap)).toBeNull();
  });
});

/* ----------------------------------------------------------------- imagem */

describe("imagem so do site ou enviada pelo painel", () => {
  const RESUMO = "a".repeat(64);

  it("src fora da lista e recusado", () => {
    for (const src of [
      "/img/outra.webp",
      "https://exemplo.com/foto.webp",
      "/img/post/../../../etc/passwd",
      `/img/post/${RESUMO}-1200x1500.png`,
      "javascript:alert(1)",
      "",
    ]) {
      expect(errosDe("bem-vindo", "imagem.src", src)["imagem.src"], src).toBeDefined();
    }
  });

  it("imagem enviada vale pela medida do nome, nao pelo que o navegador mandou", () => {
    for (const [nome, largura, altura] of [
      [`${RESUMO}-1200x1500.webp`, 1200, 1500],
      [`${RESUMO}-1024x1280.jpg`, 1024, 1280],
    ] as const) {
      const enviada = { src: `${PREFIXO_IMAGEM_ENVIADA}${nome}`, largura: 1, altura: 1, alt: "Sala de espera" };
      const resultado = validarSecao("bem-vindo", comValor(CONTEUDO_PADRAO["bem-vindo"], "imagem", enviada));
      expect(resultado.dados?.imagem).toEqual({ ...enviada, largura, altura });
    }
  });

  it("foto estreita demais e recusada", () => {
    const src = `${PREFIXO_IMAGEM_ENVIADA}${RESUMO}-600x750.webp`;
    expect(errosDe("galeria", "fotos.0.src", src)["fotos.0.src"]).toMatch(/pelo menos 640/);
  });

  it("alt e obrigatorio e curto", () => {
    expect(errosDe("bem-vindo", "imagem.alt", "")["imagem.alt"]).toBeDefined();
    expect(errosDe("bem-vindo", "imagem.alt", "a".repeat(201))["imagem.alt"]).toMatch(/200/);
  });

  it("a medida de cada foto do site e a do arquivo de verdade", () => {
    for (const [src, medida] of Object.entries(IMAGENS_DO_SITE)) {
      const bytes = new Uint8Array(readFileSync(join(RAIZ, "public", src)));
      expect(dimensoesDoWebp(bytes), src).toEqual(medida);
    }
  });

  it("toda foto do padrao esta na lista, com a mesma medida", () => {
    const fotos: Imagem[] = [
      CONTEUDO_PADRAO["bem-vindo"].imagem,
      CONTEUDO_PADRAO.responsabilidade.imagem,
      CONTEUDO_PADRAO.abordagem.imagem,
      ...CONTEUDO_PADRAO.tratamentos.cartoes.map((c) => c.imagem),
      ...CONTEUDO_PADRAO.galeria.fotos,
    ];
    for (const foto of fotos) {
      expect(IMAGENS_DO_SITE[foto.src], foto.src).toEqual({ largura: foto.largura, altura: foto.altura });
    }
  });

  it("o prefixo das enviadas e o mesmo que a rota de imagens serve", () => {
    expect(PREFIXO_IMAGEM_ENVIADA).toBe(PREFIXO_IMAGEM);
  });
});

/* --------------------------------------------------- regras entre campos */

describe("regras entre campos", () => {
  it("o grifo do hero precisa estar na 2a linha do titulo", () => {
    expect(errosDe("hero", "destaque", "resultados").destaque).toMatch(/2ª linha/);
    expect(errosDe("hero", "destaque", "Integração").destaque).toMatch(/2ª linha/);
    expect(errosDe("hero", "destaque", "inovadora")).toEqual({});
  });

  it("o grifo da secao 03 precisa estar no titulo", () => {
    expect(errosDe("responsabilidade", "destaque", "Cuidadoso").destaque).toMatch(/no título/);
  });

  it("trecho em destaque precisa existir na apresentacao, sem sobrepor o outro", () => {
    const hero = CONTEUDO_PADRAO.hero;
    expect(errosDe("hero", "destaquesDoSubtitulo", ["Dr. Fulano"])["destaquesDoSubtitulo.0"]).toMatch(/não aparece/);
    expect(
      errosDe("hero", "destaquesDoSubtitulo", ["Claudia Meirelles", "Dra. Claudia"])["destaquesDoSubtitulo.0"] ??
        errosDe("hero", "destaquesDoSubtitulo", ["Claudia Meirelles", "Dra. Claudia"])["destaquesDoSubtitulo.1"],
    ).toMatch(/sobrepor/);
    // atravessando a quebra da 1a para a 2a linha
    expect(errosDe("hero", "destaquesDoSubtitulo", ["especialista em Osteopatia"])).toEqual({});
    expect(hero.destaquesDoSubtitulo[1]).toBe("30 anos de experiência clínica");
  });

  it("® no titulo do metodo e recusado", () => {
    expect(errosDe("metodo", "titulo", "MÉTODO REGULADOR®").titulo).toMatch(/®/);
  });
});

/* ---------------------------------------------------------------- contato */

describe("contato", () => {
  it("telefone e guardado so em digitos, com 55 e DDD", () => {
    const casos: [string, string][] = [
      ["(21) 99203-5643", "5521992035643"],
      ["+55 21 2255-4845", "552122554845"],
      ["21 2255 4845", "552122554845"],
    ];
    for (const [digitado, guardado] of casos) {
      expect(conferirCampo(DESCRITORES.contato.campos.whatsapp, digitado)).toEqual({ valor: guardado, erros: {} });
    }
    for (const ruim of ["2255-4845", "abc", "(21) 9920-564a", "+1 212 555 0100"]) {
      expect(errosDe("contato", "whatsapp", ruim).whatsapp, ruim).toBeDefined();
    }
  });

  it("e-mail que carrega parametros de mailto e recusado", () => {
    for (const ruim of ["contato@gmail.com?cc=estranho@x.com", "a b@gmail.com", "sem-arroba.com", "x@y"]) {
      expect(errosDe("contato", "email", ruim).email, ruim).toBeDefined();
    }
    expect(errosDe("contato", "email", "clinica.podo+site@gmail.com.br")).toEqual({});
  });

  it("rede social so com https e no dominio da propria rede", () => {
    for (const ruim of [
      "http://www.facebook.com/podoposture",
      "https://facebook.com.site-falso.com/podoposture",
      "https://site-falso.com/facebook.com",
      "https://www.instagram.com/podoposture/",
      "javascript:alert(1)",
      "https://usuario:senha@facebook.com/x",
    ]) {
      expect(errosDe("contato", "redes.facebook", ruim)["redes.facebook"], ruim).toBeDefined();
    }
    expect(errosDe("contato", "redes.facebook", "https://m.facebook.com/podoposture")).toEqual({});
  });

  it("CEP e UF saem no formato de endereco", () => {
    const resultado = validarSecao(
      "contato",
      comValor(comValor(CONTEUDO_PADRAO.contato, "endereco.cep", "22020002"), "endereco.uf", "rj"),
    );
    expect(resultado.dados?.endereco.cep).toBe("22020-002");
    expect(resultado.dados?.endereco.uf).toBe("RJ");
    expect(errosDe("contato", "endereco.cep", "2202")["endereco.cep"]).toBeDefined();
  });

  it("caractere invisivel colado do WhatsApp sai do texto", () => {
    const resultado = validarSecao("contato", comValor(CONTEUDO_PADRAO.contato, "horario", "Segunda" + String.fromCharCode(0x202e) + " a sexta" + String.fromCharCode(0x200b)));
    expect(resultado.dados?.horario).toBe("Segunda a sexta");
  });
});

/* ------------------------------------------------------------------ mescla */

describe("mescla com o que esta salvo no banco", () => {
  it("documento que nao e objeto devolve o padrao", () => {
    for (const salvo of [null, undefined, "texto", 42, []]) {
      expect(mesclarSecao("compreender", CONTEUDO_PADRAO.compreender, salvo)).toBe(CONTEUDO_PADRAO.compreender);
    }
  });

  it("campo lixo cai no padrao e campo bom fica", () => {
    const salvo = {
      titulo: 42,
      paragrafo: "Texto novo da recepção.",
      imagem: { src: "https://outro-site.com/x.webp", largura: 10, altura: 10, alt: "x" },
      campoQueNaoExisteMais: "ignorado",
    };
    const mesclado = mesclarSecao("bem-vindo", CONTEUDO_PADRAO["bem-vindo"], salvo);
    expect(mesclado).toEqual({ ...CONTEUDO_PADRAO["bem-vindo"], paragrafo: "Texto novo da recepção." });
  });

  it("grupo mescla por dentro: um CEP estragado nao leva a rua junto", () => {
    const mesclado = mesclarSecao("contato", CONTEUDO_PADRAO.contato, {
      endereco: { rua: "Rua Nova", cep: "lixo" },
    });
    expect(mesclado.endereco).toEqual({ ...CONTEUDO_PADRAO.contato.endereco, rua: "Rua Nova" });
  });

  it("lista e atomica: um item estragado devolve a lista inteira do padrao", () => {
    const mesclado = mesclarSecao("abordagem", CONTEUDO_PADRAO.abordagem, { passos: ["Um passo bom.", 5] });
    expect(mesclado.passos).toEqual(CONTEUDO_PADRAO.abordagem.passos);
  });

  it("regra quebrada devolve juntos os campos que ela amarra", () => {
    const mesclado = mesclarSecao("hero", CONTEUDO_PADRAO.hero, {
      tituloLinhas: ["Um", "Dois", "Três", "Quatro"],
    });
    expect(mesclado.tituloLinhas).toEqual(CONTEUDO_PADRAO.hero.tituloLinhas);
    expect(mesclado.destaque).toBe(CONTEUDO_PADRAO.hero.destaque);
  });

  it("® salvo por versao antiga no titulo do metodo cai no padrao", () => {
    const mesclado = mesclarSecao("metodo", CONTEUDO_PADRAO.metodo, { titulo: "MÉTODO®" });
    expect(mesclado.titulo).toBe(CONTEUDO_PADRAO.metodo.titulo);
  });

  it("chave desconhecida e secao estragada nao mudam nada", () => {
    expect(mesclarConteudo(CONTEUDO_PADRAO, { "secao-antiga": { titulo: "x" }, hero: "quebrado" })).toEqual(
      CONTEUDO_PADRAO,
    );
  });

  it("previa empilha padrao, publicado e rascunho", () => {
    const publicado = mesclarSecao("compreender", CONTEUDO_PADRAO.compreender, { titulo: "Publicado" });
    const previa = mesclarSecao("compreender", publicado, { paragrafo: "Rascunho." });
    expect(previa).toEqual({ ...CONTEUDO_PADRAO.compreender, titulo: "Publicado", paragrafo: "Rascunho." });
  });
});

/* ---------------------------------------------------- apoio para renderizar */

describe("apoio para renderizar", () => {
  it("o subtitulo do padrao sai nos mesmos pedacos da composicao original", () => {
    const { subtituloLinhas, destaquesDoSubtitulo } = CONTEUDO_PADRAO.hero;
    expect(segmentosDoSubtitulo(subtituloLinhas, destaquesDoSubtitulo)).toEqual([
      { texto: "Dra. Claudia Meirelles", destaque: 0 },
      { texto: ", fisioterapeuta especialista\nem Osteopatia e Acupuntura pelo COFFITO, com ", destaque: null },
      { texto: "30\nanos de experiência clínica", destaque: 1 },
      { texto: ". Osteopatia, posturologia\ne acupuntura em Copacabana, Rio de Janeiro.", destaque: null },
    ]);
  });

  it("trecho que nao existe deixa o subtitulo inteiro sem destaque", () => {
    expect(segmentosDoSubtitulo(["a", "b"], ["zzz"])).toEqual([{ texto: "a\nb", destaque: null }]);
  });

  it("texto depois do link so ganha espaco quando nao comeca por pontuacao", () => {
    expect(precisaDeEspacoAntes(", Osteopata")).toBe(false);
    expect(precisaDeEspacoAntes(". Fim")).toBe(false);
    expect(precisaDeEspacoAntes("")).toBe(false);
    expect(precisaDeEspacoAntes("com 30 anos")).toBe(true);
  });
});
