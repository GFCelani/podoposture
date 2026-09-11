import { describe, expect, it } from "vitest";

import {
  ehEstreia,
  enderecoPodeMudar,
  errosComCampo,
  mensagemAoSalvar,
  mensagemDeFalhaAoSalvar,
  rascunhoPrecisaConfirmar,
  validarPost,
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
    expect(validarPost({ ...CERTO, corpo: "\n".repeat(60) }).corpo).toBe("Escreva o texto antes de salvar.");
    expect(validarPost({ ...CERTO, corpo: `${" ".repeat(50)}curto${" ".repeat(50)}` }).corpo).toMatch(/pelo menos/);
    expect(validarPost(CERTO).corpo).toBeUndefined();
  });
});

describe("errosComCampo", () => {
  it("sair do titulo nao acusa o corpo que ela ainda nem escreveu", () => {
    const dados = { ...CERTO, titulo: "", corpo: "" };
    expect(errosComCampo({}, dados, "titulo")).toEqual({
      titulo: "O texto precisa de um título.",
    });
  });

  it("campo corrigido perde o aviso, e os outros avisos ficam", () => {
    const antes = { titulo: "O texto precisa de um título.", corpo: "Escreva o texto antes de salvar." };
    const dados = { ...CERTO, corpo: "" };
    expect(errosComCampo(antes, dados, "titulo")).toEqual({
      corpo: "Escreva o texto antes de salvar.",
    });
  });

  it("devolve a mesma mensagem que a validacao completa, que e a do servidor", () => {
    const dados = { ...CERTO, corpo: "curto" };
    expect(errosComCampo({}, dados, "corpo").corpo).toBe(validarPost(dados).corpo);
  });

  it("nao altera o objeto recebido", () => {
    const antes = { titulo: "x" };
    errosComCampo(antes, CERTO, "titulo");
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

describe("mensagemDeFalhaAoSalvar", () => {
  it("validacao devolve so o motivo: os campos marcados ja dizem o que fazer", () => {
    expect(mensagemDeFalhaAoSalvar(400, "Confira os campos destacados.")).toBe(
      "Confira os campos destacados.",
    );
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
