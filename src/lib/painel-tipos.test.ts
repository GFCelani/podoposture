import { describe, expect, it } from "vitest";

import {
  AVISO_SAIU_DO_AR,
  situacaoDaReleitura,
  ehEstreia,
  enderecoPodeMudar,
  envioMudaOSite,
  erroNoNomeDoTema,
  errosComCampo,
  mensagemAoSalvar,
  mensagemDeFalhaAoSalvar,
  rascunhoPrecisaConfirmar,
  repetirTiraDoAr,
  normalizarNomeDoTema,
  validarPost,
  type ContextoDoPost,
  type DadosDoPost,
} from "./painel-tipos";

const CERTO: DadosDoPost = {
  titulo: "Dor lombar no fim do dia",
  resumo: "",
  categoria: "Dor Crônica",
  capa: "",
  corpo: "Um texto com mais de quarenta caracteres, para passar do minimo.",
  publicado: true,
};

/** Os temas que existem no banco, no momento da validacao. */
const CONTEXTO: ContextoDoPost = { temas: ["Dor Crônica", "Zumbido e Tinnitus"] };

describe("enderecoPodeMudar", () => {
  it("rascunho que nunca foi ao ar troca de endereco quando o titulo muda", () => {
    expect(enderecoPodeMudar({ publicadoEm: null, titulo: "Antes" }, "Depois")).toBe(true);
  });

  it("titulo igual nao gasta consulta procurando endereco novo", () => {
    expect(enderecoPodeMudar({ publicadoEm: null, titulo: "Igual" }, "Igual")).toBe(false);
  });

  it("texto publicado nao troca de endereco", () => {
    expect(
      enderecoPodeMudar({ publicadoEm: "2026-09-01T12:00:00.000Z", titulo: "Antes" }, "Depois"),
    ).toBe(false);
  });

  it("texto que JA FOI publicado e voltou a rascunho tambem nao troca", () => {
    // O caso que a regra antiga (olhar `publicado`) deixava passar: tirar do
    // ar, corrigir o titulo e republicar mudava a URL indexada.
    const tiradoDoAr = { publicadoEm: "2026-09-01T12:00:00.000Z", titulo: "Antes" };
    expect(enderecoPodeMudar(tiradoDoAr, "Depois")).toBe(false);
  });
});

describe("ehEstreia", () => {
  it("primeira publicacao marca a data", () => {
    expect(ehEstreia(null, true)).toBe(true);
  });

  it("republicar depois de rascunho nao reescreve a data", () => {
    expect(ehEstreia("2026-09-01T12:00:00.000Z", true)).toBe(false);
  });

  it("guardar como rascunho nunca marca data", () => {
    expect(ehEstreia(null, false)).toBe(false);
    expect(ehEstreia("2026-09-01T12:00:00.000Z", false)).toBe(false);
  });
});

describe("validarPost", () => {
  it("corpo feito so de espacos e quebras de linha nao passa por texto", () => {
    expect(validarPost({ ...CERTO, corpo: "\n".repeat(60) }, CONTEXTO).corpo).toBe("Escreva o texto antes de salvar.");
    expect(validarPost({ ...CERTO, corpo: `${" ".repeat(50)}curto${" ".repeat(50)}` }, CONTEXTO).corpo).toMatch(/pelo menos/);
    expect(validarPost(CERTO, CONTEXTO).corpo).toBeUndefined();
  });
});

describe("validarPost: tema e capa", () => {
  it("sem tema e uma escolha valida — 64 dos posts do GoDaddy nao tem tema", () => {
    expect(validarPost({ ...CERTO, categoria: "" }, CONTEXTO).categoria).toBeUndefined();
  });

  it("tema que existe no banco passa", () => {
    expect(validarPost({ ...CERTO, categoria: "Zumbido e Tinnitus" }, CONTEXTO).categoria).toBeUndefined();
  });

  it("tema que nao existe (apagado em outra janela) e recusado", () => {
    expect(validarPost({ ...CERTO, categoria: "Tema apagado" }, CONTEXTO).categoria).toMatch(/não existe mais/);
  });

  it("a capa do GoDaddy que o texto ja tem continua valendo", () => {
    const capa = "/img/blog/dra-claudia-meirelles-1-d1712737.webp";
    expect(validarPost({ ...CERTO, capa }, { ...CONTEXTO, capaAceita: capa }).capa).toBeUndefined();
  });

  it("mas uma capa de /img/blog/ que o texto NAO tinha e recusada", () => {
    const capa = "/img/blog/outra-foto.webp";
    expect(validarPost({ ...CERTO, capa }, { ...CONTEXTO, capaAceita: "/img/blog/a-dele.webp" }).capa).toMatch(/inválida/);
    expect(validarPost({ ...CERTO, capa }, CONTEXTO).capa).toMatch(/inválida/);
  });
});

describe("nome de tema", () => {
  it("normaliza espacos e forma Unicode", () => {
    expect(normalizarNomeDoTema("  Dor   crônica ")).toBe("Dor crônica");
    expect(normalizarNomeDoTema("Dor cro\u0302nica")).toBe("Dor crônica");
  });

  it("recusa vazio, curto e longo", () => {
    expect(erroNoNomeDoTema("")).toMatch(/Escreva/);
    expect(erroNoNomeDoTema("a")).toMatch(/2 letras/);
    expect(erroNoNomeDoTema("x".repeat(61))).toMatch(/Máximo/);
    expect(erroNoNomeDoTema("Zumbido")).toBeNull();
  });
});

describe("errosComCampo", () => {
  it("sair do titulo nao acusa o corpo que ela ainda nem escreveu", () => {
    const dados = { ...CERTO, titulo: "", corpo: "" };
    expect(errosComCampo({}, dados, "titulo", CONTEXTO)).toEqual({
      titulo: "O texto precisa de um título.",
    });
  });

  it("campo corrigido perde o aviso, e os outros avisos ficam", () => {
    const antes = { titulo: "O texto precisa de um título.", corpo: "Escreva o texto antes de salvar." };
    const dados = { ...CERTO, corpo: "" };
    expect(errosComCampo(antes, dados, "titulo", CONTEXTO)).toEqual({
      corpo: "Escreva o texto antes de salvar.",
    });
  });

  it("devolve a mesma mensagem que a validacao completa, que e a do servidor", () => {
    const dados = { ...CERTO, corpo: "curto" };
    expect(errosComCampo({}, dados, "corpo", CONTEXTO).corpo).toBe(validarPost(dados, CONTEXTO).corpo);
  });

  it("nao altera o objeto recebido", () => {
    const antes = { titulo: "x" };
    errosComCampo(antes, CERTO, "titulo", CONTEXTO);
    expect(antes).toEqual({ titulo: "x" });
  });
});

describe("rascunhoPrecisaConfirmar", () => {
  it("so pede o segundo clique quando o texto esta no ar", () => {
    expect(rascunhoPrecisaConfirmar({ publicado: true })).toBe(true);
    expect(rascunhoPrecisaConfirmar({ publicado: false })).toBe(false);
    expect(rascunhoPrecisaConfirmar(null)).toBe(false);
  });
});

describe("repetirTiraDoAr", () => {
  it("repetir o envio como rascunho num id ja publicado tiraria o texto do ar", () => {
    expect(repetirTiraDoAr({ publicado: true }, { publicado: false })).toBe(true);
  });

  it("repetir publicando, ou num texto que nunca foi ao ar, nao tira nada", () => {
    expect(repetirTiraDoAr({ publicado: true }, { publicado: true })).toBe(false);
    expect(repetirTiraDoAr({ publicado: false }, { publicado: false })).toBe(false);
    expect(repetirTiraDoAr({ publicado: false }, { publicado: true })).toBe(false);
  });

  it("texto novo de verdade (id que ainda nao existe) nunca e conflito", () => {
    expect(repetirTiraDoAr(null, { publicado: false })).toBe(false);
    expect(repetirTiraDoAr(null, { publicado: true })).toBe(false);
  });
});

describe("mensagemAoSalvar", () => {
  it.each([
    [true, false, "Texto publicado. Ele já está no site."],
    [true, true, "Alterações publicadas no site."],
    [false, true, "Texto tirado do site e guardado como rascunho."],
    [false, false, "Rascunho guardado. Ele ainda não está no site."],
  ])("publicar=%s, estava no ar=%s", (publicar, estavaNoAr, esperada) => {
    expect(mensagemAoSalvar(publicar, estavaNoAr)).toBe(esperada);
  });
});

describe("situacaoDaReleitura", () => {
  const id = "0b0f0a8e-1111-4222-8333-444455556666";
  it("texto no ar, texto que saiu do ar entre a recusa e a releitura, e resposta que nao da para usar", () => {
    expect(situacaoDaReleitura({ id, publicado: true }, id)).toBe("no-ar");
    // Saiu do ar: nao pode cair na mensagem do servidor, que diz "ja esta publicado".
    expect(situacaoDaReleitura({ id, publicado: false }, id)).toBe("fora-do-ar");
    expect(situacaoDaReleitura({ id: "outro", publicado: true }, id)).toBe("ilegivel");
    expect(situacaoDaReleitura(undefined, id)).toBe("ilegivel");
    expect(situacaoDaReleitura({ id }, id)).toBe("ilegivel");
  });

  it("o aviso de texto fora do ar cita o botao que existe na tela e nao manda tirar do ar", () => {
    expect(AVISO_SAIU_DO_AR).toContain("“Guardar como rascunho”");
    expect(AVISO_SAIU_DO_AR).not.toMatch(/já está publicado|Tirar do site/);
  });
});

describe("envioMudaOSite", () => {
  it.each([
    [null, true, true],
    [{ publicado: false }, true, true],
    [{ publicado: true }, true, true],
    [{ publicado: true }, false, true],
    [{ publicado: false }, false, false],
    [null, false, false],
  ])("antes=%j, publicado agora=%s -> %s", (existente, publicado, esperado) => {
    expect(envioMudaOSite(existente, { publicado })).toBe(esperado);
  });
});

describe("mensagemDeFalhaAoSalvar", () => {
  it("validacao devolve so o motivo: os campos marcados ja dizem o que fazer", () => {
    expect(mensagemDeFalhaAoSalvar(400, "Confira os campos destacados.")).toBe(
      "Confira os campos destacados.",
    );
  });

  it("recusa de proposito (409) devolve o motivo do servidor, sem mandar tentar de novo", () => {
    const motivo =
      "Este texto já está publicado no site. Para tirá-lo do ar, abra ele na lista “Seus textos” e use “Tirar do site e guardar”.";
    const mensagem = mensagemDeFalhaAoSalvar(409, motivo);
    expect(mensagem).toBe(motivo);
    expect(mensagem).not.toMatch(/tente de novo/);
  });

  it.each([404, 413, 500, 502, 503])("status %s sempre diz que o texto nao se perdeu", (status) => {
    const mensagem = mensagemDeFalhaAoSalvar(status, "Não foi possível salvar o post.");
    expect(mensagem).toMatch(/continua/);
  });

  it("banco nao ligado manda avisar quem cuida do site, e nao tentar de novo", () => {
    expect(mensagemDeFalhaAoSalvar(503, "O banco de dados ainda não está configurado.")).toMatch(
      /Avise quem cuida do site/,
    );
  });

  it("resposta sem mensagem utilizavel cai no texto padrao", () => {
    expect(mensagemDeFalhaAoSalvar(502, undefined)).toMatch(/^Não foi possível salvar\./);
    expect(mensagemDeFalhaAoSalvar(502, { erro: "x" })).toMatch(/^Não foi possível salvar\./);
  });
});
