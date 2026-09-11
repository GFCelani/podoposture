import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "../../../lib/conteudo-padrao";
import {
  CHAVES_DE_SECAO,
  DESCRITORES,
  PAGINAS_DE_DESTINO,
  validarSecao,
  type Campo,
  type EstadoDaSecao,
} from "../../../lib/conteudo-tipos";
import type { Armazem } from "../../../lib/recado-do-editor";
import {
  aplicarCopia,
  atualizarErros,
  camposRelacionados,
  codificarDestino,
  contarCaracteres,
  decodificarDestino,
  gravarCaminho,
  guardarCopiaLocal,
  idDoCampo,
  lerCaminho,
  lerCopiaLocal,
  mensagemDeFalha,
  mesmoValor,
  moverItem,
  paraEdicao,
  removerItem,
  resumoDaSecao,
  semErrosEm,
  situacaoDoTamanho,
  telefoneParaExibir,
  textoDoValor,
  tomarSecaoParaReabrir,
  deixarSecaoParaReabrir,
  valorVazio,
  estadoEmPalavras,
  enderecoDaPrevia,
  explicacaoDePublicar,
  explicacaoDeVoltarAoOriginal,
  publicadoDiferenteDoPadrao,
} from "./edicao";

/**
 * A parte pura do editor da pagina inicial. O que mais importa aqui e a volta
 * completa: o texto de hoje, aberto no formulario e mandado de volta sem mexer,
 * precisa passar pela validacao da rota e sair igual. Se nao sair, abrir uma
 * secao e publicar sem mudar nada ja trocaria o site.
 */

function armazemDeTeste(): Armazem & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
}

function estado(padrao: unknown, publicado: unknown, rascunho: unknown): EstadoDaSecao<unknown> {
  return { padrao, publicado, rascunho, atualizadoEm: null, publicadoEm: null };
}

describe("volta completa pelo formulario", () => {
  it.each(CHAVES_DE_SECAO)("%s: o padrao aberto no editor valida e volta igual", (chave) => {
    const emEdicao = paraEdicao(chave, CONTEUDO_PADRAO[chave]);
    const validacao = validarSecao(chave, emEdicao);
    expect(validacao.erros).toEqual({});
    expect(validacao.dados).toEqual(CONTEUDO_PADRAO[chave]);
  });

  it("mostra o telefone com DDD e tracos, e nao os digitos crus", () => {
    const emEdicao = paraEdicao("contato", CONTEUDO_PADRAO.contato);
    expect(emEdicao.whatsapp).toBe("(21) 99203-5643");
    expect(emEdicao.telefoneFixo).toBe("(21) 2255-4845");
  });

  it("nao altera o documento de origem", () => {
    const origem = structuredClone(CONTEUDO_PADRAO.contato);
    paraEdicao("contato", origem);
    expect(origem).toEqual(CONTEUDO_PADRAO.contato);
  });
});

describe("telefoneParaExibir", () => {
  it("formata celular e fixo, e deixa o resto como veio", () => {
    expect(telefoneParaExibir("5521992035643")).toBe("(21) 99203-5643");
    expect(telefoneParaExibir("552122554845")).toBe("(21) 2255-4845");
    expect(telefoneParaExibir("(21) 9")).toBe("(21) 9");
    expect(telefoneParaExibir("")).toBe("");
  });
});

describe("caminhos", () => {
  const base = { botoes: [{ rotulo: "A", destino: { tipo: "whatsapp" } }], titulo: "x" };

  it("le em objeto e lista", () => {
    expect(lerCaminho(base, "botoes.0.rotulo")).toBe("A");
    expect(lerCaminho(base, "botoes.3.rotulo")).toBeUndefined();
    expect(lerCaminho(base, "titulo.nada")).toBeUndefined();
    expect(lerCaminho(base, "")).toBe(base);
  });

  it("grava sem mutar e preserva o resto", () => {
    const copia = structuredClone(base);
    const novo = gravarCaminho(base, "botoes.0.rotulo", "B");
    expect(base).toEqual(copia);
    expect(lerCaminho(novo, "botoes.0.rotulo")).toBe("B");
    expect(Array.isArray(novo.botoes)).toBe(true);
    expect(novo.botoes[0].destino).toBe(base.botoes[0].destino);
    expect(novo.titulo).toBe("x");
  });

  it("cria o objeto que faltava no caminho", () => {
    expect(gravarCaminho({} as Record<string, unknown>, "imagem.alt", "foto")).toEqual({ imagem: { alt: "foto" } });
  });

  it("id do campo sem ponto, para caber em seletor", () => {
    expect(idDoCampo("bem-vindo", "imagem.alt")).toBe("inicio-bem-vindo-imagem-alt");
    expect(idDoCampo("hero", "botoes.1.destino")).toBe("inicio-hero-botoes-1-destino");
  });
});

describe("listas", () => {
  it("move para cima e para baixo sem mutar", () => {
    const lista = ["a", "b", "c"];
    expect(moverItem(lista, 1, 0)).toEqual(["b", "a", "c"]);
    expect(moverItem(lista, 1, 2)).toEqual(["a", "c", "b"]);
    expect(lista).toEqual(["a", "b", "c"]);
  });

  it("ignora movimento para fora da lista", () => {
    expect(moverItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moverItem(["a", "b"], 1, 2)).toEqual(["a", "b"]);
  });

  it("remove pela posicao, mesmo com itens repetidos", () => {
    expect(removerItem(["x", "x", "y"], 1)).toEqual(["x", "y"]);
  });
});

describe("valorVazio", () => {
  function todosOsCampos(campo: Campo): Campo[] {
    if (campo.tipo === "grupo") return [campo, ...Object.values(campo.campos).flatMap(todosOsCampos)];
    if (campo.tipo === "lista") return [campo, ...todosOsCampos(campo.item)];
    return [campo];
  }

  it("item novo de destino pede escolha, e nao aponta sozinho para uma pagina", () => {
    expect(valorVazio({ tipo: "destino", rotulo: "x", aceita: ["pagina"] })).toEqual({ tipo: "pagina", slug: "" });
    expect(valorVazio({ tipo: "destino", rotulo: "x", aceita: ["whatsapp"] })).toEqual({ tipo: "whatsapp" });
  });

  it("linhas nascem com a quantidade exata e lista com o minimo", () => {
    expect(valorVazio({ tipo: "linhas", rotulo: "x", quantidade: 4, maxPorLinha: 22 })).toEqual(["", "", "", ""]);
    const botoes = DESCRITORES.hero.campos.botoes;
    expect(valorVazio(botoes)).toHaveLength(2);
  });

  it("todo campo de todo descritor gera valor que a validacao le sem lancar", () => {
    for (const chave of CHAVES_DE_SECAO) {
      for (const campo of Object.values(DESCRITORES[chave].campos as Record<string, Campo>).flatMap(todosOsCampos)) {
        expect(() => mesmoValor(campo, valorVazio(campo), valorVazio(campo))).not.toThrow();
      }
      const vazio = Object.fromEntries(
        Object.entries(DESCRITORES[chave].campos as Record<string, Campo>).map(([n, c]) => [n, valorVazio(c)]),
      );
      expect(() => validarSecao(chave, vazio)).not.toThrow();
    }
  });
});

describe("erros", () => {
  it("ao digitar, erro na tela some quando o campo fica certo e nenhum novo aparece", () => {
    const anteriores = { titulo: "Preencha este campo." };
    expect(atualizarErros(anteriores, { paragrafo: "Preencha este campo." }, "titulo", [], false)).toEqual({});
  });

  it("ao digitar, erro na tela troca de texto quando muda o motivo", () => {
    const anteriores = { titulo: "Preencha este campo." };
    const novos = { titulo: "Use no máximo 40 caracteres (agora são 41)." };
    expect(atualizarErros(anteriores, novos, "titulo", [], false)).toEqual(novos);
  });

  it("ao sair, mostra so o campo mexido, os de dentro dele e os que dividem regra", () => {
    const novos = {
      "tituloLinhas.1": "Preencha a linha 2.",
      destaque: "A palavra grifada precisa estar escrita igual na 2ª linha do título.",
      "botoes.0.rotulo": "Preencha este campo.",
    };
    expect(atualizarErros({}, novos, "tituloLinhas.1", [], true)).toEqual({ "tituloLinhas.1": novos["tituloLinhas.1"] });
    expect(atualizarErros({}, novos, "tituloLinhas.1", ["destaque"], true)).toEqual({
      "tituloLinhas.1": novos["tituloLinhas.1"],
      destaque: novos.destaque,
    });
    expect(atualizarErros({}, { "fotos.2.alt": "x", "fotos.3.alt": "y" }, "fotos.2", [], true)).toEqual({
      "fotos.2.alt": "x",
    });
  });

  it("campos relacionados vem das regras do descritor", () => {
    expect(camposRelacionados("hero", "tituloLinhas.1")).toEqual(["destaque"]);
    expect(camposRelacionados("hero", "destaque")).toEqual(["tituloLinhas"]);
    expect(camposRelacionados("hero", "botoes.0.rotulo")).toEqual([]);
    expect(camposRelacionados("bem-vindo", "titulo")).toEqual([]);
  });

  it("lista que muda de forma perde os erros por indice, e so os dela", () => {
    const erros = { passos: "x", "passos.1": "y", titulo: "z", "passosExtra.0": "w" };
    expect(semErrosEm(erros, "passos")).toEqual({ titulo: "z", "passosExtra.0": "w" });
  });
});

describe("contagem", () => {
  it("conta como a validacao: espacos seguidos viram um e pontas somem", () => {
    expect(contarCaracteres("  a   b  ")).toBe(3);
    expect(contarCaracteres("é")).toBe(1);
  });

  it("avisa perto do limite antes de passar", () => {
    expect(situacaoDoTamanho("a".repeat(10), 22)).toMatchObject({ perto: false, passou: false, restam: 12 });
    expect(situacaoDoTamanho("a".repeat(19), 22)).toMatchObject({ perto: true, passou: false, restam: 3 });
    expect(situacaoDoTamanho("a".repeat(22), 22)).toMatchObject({ perto: true, passou: false, restam: 0 });
    expect(situacaoDoTamanho("a".repeat(23), 22)).toMatchObject({ perto: false, passou: true, restam: -1 });
    // Em campo longo a folga cresce com o limite: 10% de 420 sao 42 caracteres.
    expect(situacaoDoTamanho("a".repeat(370), 420)).toMatchObject({ perto: false, restam: 50 });
    expect(situacaoDoTamanho("a".repeat(380), 420)).toMatchObject({ perto: true, restam: 40 });
  });
});

describe("mesmoValor", () => {
  const telefone: Campo = { tipo: "telefone", rotulo: "WhatsApp" };
  const texto: Campo = { tipo: "texto", rotulo: "Título", max: 40 };

  it("telefone formatado e o mesmo numero dos digitos salvos", () => {
    expect(mesmoValor(telefone, "(21) 99203-5643", "5521992035643")).toBe(true);
    expect(mesmoValor(telefone, "(21) 99203-5644", "5521992035643")).toBe(false);
  });

  it("espaco sobrando nao conta como alteracao; campo invalido conta", () => {
    expect(mesmoValor(texto, "  Bem-vindo  ", "Bem-vindo")).toBe(true);
    expect(mesmoValor(texto, "", "Bem-vindo")).toBe(false);
  });
});

describe("destino no seletor", () => {
  const slugs = new Set(PAGINAS_DE_DESTINO.map((p) => p.slug));

  it("toda pagina da lista vai e volta pelo valor do seletor", () => {
    for (const { slug } of PAGINAS_DE_DESTINO) {
      const valor = codificarDestino({ tipo: "pagina", slug }, slugs);
      expect(decodificarDestino(valor)).toEqual({ tipo: "pagina", slug });
    }
  });

  it("whatsapp e sem destino tem valor proprio", () => {
    expect(codificarDestino({ tipo: "whatsapp" }, slugs)).toBe("whatsapp");
    expect(decodificarDestino("nenhum")).toEqual({ tipo: "nenhum" });
  });

  it("pagina que nao existe mais, ou valor torto, vira escolha pendente", () => {
    expect(codificarDestino({ tipo: "pagina", slug: "nao-existe" }, slugs)).toBe("");
    expect(codificarDestino("lixo", slugs)).toBe("");
    expect(decodificarDestino("")).toEqual({ tipo: "pagina", slug: "" });
  });
});

describe("textos para a tela", () => {
  it("o original de cada campo sai escrito por extenso", () => {
    const hero = DESCRITORES.hero.campos;
    expect(textoDoValor(hero.tituloLinhas, CONTEUDO_PADRAO.hero.tituloLinhas)).toBe(
      "Integração terapêutica\nefetiva e inovadora\ncom resultados\nrápidos e eficazes",
    );
    expect(textoDoValor(hero.botoes, CONTEUDO_PADRAO.hero.botoes)).toBe(
      "1. Envie uma mensagem\n2. Quero mais informações",
    );
    expect(textoDoValor(hero.botoes.tipo === "lista" ? hero.botoes.item : hero.botoes, CONTEUDO_PADRAO.hero.botoes[1])).toBe(
      "Quero mais informações",
    );
    const destino = DESCRITORES.responsabilidade.campos.botao;
    expect(destino.tipo === "grupo" && textoDoValor(destino.campos.destino, CONTEUDO_PADRAO.responsabilidade.botao.destino)).toBe(
      "Página “Nosso Blog”",
    );
  });

  it("o original de um item de grupo inclui a lista de paragrafos, e nao so titulo e botao", () => {
    const servicos = DESCRITORES.servicos.campos.itens;
    const primeiro = CONTEUDO_PADRAO.servicos.itens[0];
    const texto = servicos.tipo === "lista" ? textoDoValor(servicos.item, primeiro) : "";
    expect(texto).toContain(primeiro.titulo);
    expect(texto).toContain(primeiro.corpo[0].slice(0, 30));
  });

  it("voltar ao original so aparece quando o publicado difere do padrao", () => {
    const padrao = CONTEUDO_PADRAO["blog-secao"];
    expect(publicadoDiferenteDoPadrao(estado(padrao, null, null))).toBe(false);
    expect(publicadoDiferenteDoPadrao(estado(padrao, { ...padrao }, null))).toBe(false);
    expect(publicadoDiferenteDoPadrao(estado(padrao, { titulo: "Outro" }, null))).toBe(true);
  });

  it("as confirmacoes dizem onde a mudanca aparece, e que voltar ao original muda o site sem ver antes", () => {
    expect(explicacaoDePublicar("contato")).toBe(
      "Esta versão vai para o site: em todas as páginas, para todo mundo. Para confirmar, clique outra vez em “Confirmar e publicar”.",
    );
    expect(explicacaoDeVoltarAoOriginal("contato")).toContain("em todas as páginas, para todo mundo");
    expect(explicacaoDeVoltarAoOriginal("contato")).toContain("sem ver antes como fica");
    expect(explicacaoDeVoltarAoOriginal("galeria")).toContain("na página inicial.");
    expect(enderecoDaPrevia("contato-secao")).toBe("/publicar/previa?secao=contato-secao");
  });

  it("resumo da secao e o comeco do texto no ar, cortado em palavra", () => {
    expect(resumoDaSecao("hero", CONTEUDO_PADRAO.hero)).toBe(
      "Integração terapêutica efetiva e inovadora com resultados rápidos e eficazes",
    );
    const contato = resumoDaSecao("contato", CONTEUDO_PADRAO.contato);
    expect(contato.startsWith("(21) 99203-5643 · (21) 2255-4845")).toBe(true);
    for (const chave of CHAVES_DE_SECAO) {
      const resumo = resumoDaSecao(chave, CONTEUDO_PADRAO[chave]);
      expect(resumo.length).toBeGreaterThan(0);
      expect(Array.from(resumo).length).toBeLessThanOrEqual(91);
    }
    expect(resumoDaSecao("bem-vindo", CONTEUDO_PADRAO["bem-vindo"]).endsWith("…")).toBe(true);
  });

  it("resumo nao quebra com documento torto", () => {
    expect(resumoDaSecao("hero", null)).toBe("");
    expect(resumoDaSecao("servicos", { itens: "lixo" })).toBe("");
  });

  it("estado em palavras", () => {
    const padrao = { titulo: "A" };
    expect(estadoEmPalavras(estado(padrao, null, null), false).map((m) => m.texto)).toEqual(["Texto original"]);
    expect(estadoEmPalavras(estado(padrao, { titulo: "A" }, null), false).map((m) => m.texto)).toEqual([
      "Texto original",
    ]);
    expect(estadoEmPalavras(estado(padrao, { titulo: "B" }, null), false).map((m) => m.texto)).toEqual(["Alterado"]);
    expect(estadoEmPalavras(estado(padrao, { titulo: "B" }, { titulo: "C" }), true).map((m) => m.texto)).toEqual([
      "Alterado",
      "Rascunho não publicado",
      "Alteração guardada só neste navegador",
    ]);
    expect(estadoEmPalavras(estado(padrao, null, { titulo: "A" }), false).map((m) => m.texto)).toEqual([
      "Texto original",
    ]);
    const comData = estadoEmPalavras(
      { ...estado(padrao, { titulo: "B" }, null), publicadoEm: "2026-09-10T15:00:00.000Z" },
      false,
    );
    expect(comData[0].texto).toMatch(/^Alterado em 10 de setembro de 2026$/);
  });

  it("falha diz o que aconteceu com o texto e o proximo passo", () => {
    expect(mensagemDeFalha(0, null)).toContain("guardadas neste navegador");
    expect(mensagemDeFalha(503, "Sem banco.")).toMatch(/^Sem banco\. .*Avise quem cuida do site\.$/);
    expect(mensagemDeFalha(400, "Confira os campos destacados.")).toBe("Confira os campos destacados.");
    expect(mensagemDeFalha(502, "Não foi possível salvar agora.")).toBe("Não foi possível salvar agora.");
    expect(mensagemDeFalha(500, 42)).toContain("Tente de novo");
  });
});

describe("copia no navegador", () => {
  it("guarda, le e apaga por secao", () => {
    const armazem = armazemDeTeste();
    guardarCopiaLocal(armazem, "hero", { destaque: "x" }, new Date("2026-09-11T10:00:00Z"));
    expect(lerCopiaLocal(armazem, "hero")).toEqual({ dados: { destaque: "x" }, guardadaEm: "2026-09-11T10:00:00.000Z" });
    expect(lerCopiaLocal(armazem, "galeria")).toBeNull();
  });

  it("copia ilegivel ou armazem ausente vira null, sem lancar", () => {
    const armazem = armazemDeTeste();
    armazem.dados.set("podoposture_inicio:hero", "{nao e json");
    expect(lerCopiaLocal(armazem, "hero")).toBeNull();
    armazem.dados.set("podoposture_inicio:hero", JSON.stringify({ dados: "texto" }));
    expect(lerCopiaLocal(armazem, "hero")).toBeNull();
    expect(lerCopiaLocal(null, "hero")).toBeNull();
    const quebrado: Armazem = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("cheio");
      },
      removeItem: () => {},
    };
    expect(lerCopiaLocal(quebrado, "hero")).toBeNull();
    expect(() => guardarCopiaLocal(quebrado, "hero", {})).not.toThrow();
  });

  it("copia de versao antiga nao leva campo que o descritor nao tem", () => {
    const base = paraEdicao("blog-secao", CONTEUDO_PADRAO["blog-secao"]);
    expect(aplicarCopia("blog-secao", base, { titulo: "Novo", campoVelho: "x" })).toEqual({ titulo: "Novo" });
  });

  it("copia guarda a referencia do servidor, e recuperar leva so o que ela mexeu", () => {
    // Notebook: ela mexeu so no horario e fechou a aba. Celular: publicou um e-mail novo.
    const quandoComecou = paraEdicao("contato", CONTEUDO_PADRAO.contato);
    const noNotebook = { ...quandoComecou, horario: "Segunda a sábado, das 8h às 19h" };
    const armazem = armazemDeTeste();
    guardarCopiaLocal(armazem, "contato", noNotebook, new Date("2026-09-11T10:00:00Z"), quandoComecou);
    const copia = lerCopiaLocal(armazem, "contato");
    expect(copia?.base).toEqual(quandoComecou);

    const servidorAgora = { ...quandoComecou, email: "novo@podoposture.com.br" };
    const recuperado = aplicarCopia("contato", servidorAgora, copia!.dados, copia!.base);
    expect(recuperado.horario).toBe("Segunda a sábado, das 8h às 19h");
    expect(recuperado.email).toBe("novo@podoposture.com.br");
  });

  it("copia sem referencia (de antes desta versao do painel) continua recuperando tudo", () => {
    const armazem = armazemDeTeste();
    armazem.dados.set("podoposture_inicio:hero", JSON.stringify({ dados: { destaque: "x" }, guardadaEm: "" }));
    expect(lerCopiaLocal(armazem, "hero")?.base).toBeUndefined();
  });

  it("secao para reabrir vale uma vez e so se for chave conhecida", () => {
    const armazem = armazemDeTeste();
    deixarSecaoParaReabrir(armazem, "galeria");
    expect(tomarSecaoParaReabrir(armazem)).toBe("galeria");
    expect(tomarSecaoParaReabrir(armazem)).toBeNull();
    armazem.dados.set("podoposture_inicio_reabrir", "../../etc");
    expect(tomarSecaoParaReabrir(armazem)).toBeNull();
  });
});
