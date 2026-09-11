import { describe, expect, it } from "vitest";

import { escalaDoEnvio, mensagemDeFalhaDoEnvio } from "./preparar-imagem";

describe("escalaDoEnvio", () => {
  it("reduz pela largura e nunca aumenta", () => {
    expect(escalaDoEnvio(3200, 2400, 1600)).toBe(0.5);
    expect(escalaDoEnvio(800, 600, 1600)).toBe(1);
  });

  it("captura de tela comprida tambem cabe no maior lado que o servidor le", () => {
    const escala = escalaDoEnvio(1170, 9500, 1600);
    expect(Math.round(9500 * escala)).toBeLessThanOrEqual(8192);
    expect(Math.round(1170 * escala)).toBeLessThanOrEqual(1600);
  });
});

describe("mensagemDeFalhaDoEnvio", () => {
  it("banco fora manda avisar quem cuida do site e diz que o texto ficou", () => {
    expect(mensagemDeFalhaDoEnvio(503, "O banco de dados ainda não está configurado neste servidor.")).toMatch(
      /continua aqui\. Avise quem cuida do site\.$/,
    );
  });

  it("falha ao guardar diz que o texto ficou e o que fazer", () => {
    expect(mensagemDeFalhaDoEnvio(502, "Não foi possível guardar a imagem.")).toMatch(/continua aqui; tente de novo/);
  });

  it("arquivo que o servidor nao le pede outra foto, sem mandar usar o painel", () => {
    expect(mensagemDeFalhaDoEnvio(400, null)).toBe("Não conseguimos ler essa imagem. Tente outra foto, em JPG ou PNG.");
    expect(mensagemDeFalhaDoEnvio(413, null)).toMatch(/máximo 3 MB/);
  });
});
