import { expect, test } from "@playwright/test";

/**
 * Regras do hero da home que quebram sem ninguem perceber: o subtitulo em
 * duas linhas no desktop (credencial numa linha, lugar e anos de pratica na
 * linha de dado) e a anotacao do mapa de dor apontando o proprio ponto: a
 * ciatica no palco, a lombar no empilhado, com o texto no vao das figuras.
 */
const DESKTOP: [number, number][] = [
  [1280, 586],
  [1366, 657],
  [1440, 900],
  [1536, 695],
  [1536, 730],
  [1600, 900],
  [1920, 945],
  [1920, 1080],
  [2560, 1440],
];

/** Abaixo de 1200px o par empilha e a anotacao troca de ponto. */
const EMPILHADO: [number, number][] = [
  [1024, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
];

const TODAS: [number, number][] = [...DESKTOP, ...EMPILHADO];

/** Maior x do contorno da frontal na faixa do texto (y 150..330 de 560): a
 *  mao, em unidades do viewBox de 221. */
const MAO_FRONTAL_U = 196.8;

for (const [largura, altura] of DESKTOP) {
  test(`subtitulo em duas linhas: ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const linhas = await page.evaluate(() => {
      /** Linhas pela altura da caixa sobre a entrelinha. (Agrupar os tops das
       *  caixas de linha falha: pecas da mesma linha diferem 1px de topo.) */
      const contar = (el: Element) =>
        Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      const credencial = document.querySelector(".hero-credencial");
      const dado = document.querySelector(".hero-dado");
      if (!credencial || !dado) throw new Error("subtitulo do hero nao encontrado");
      return { credencial: contar(credencial), dado: contar(dado), texto: dado.textContent ?? "" };
    });

    expect(linhas.credencial, "a credencial ocupa uma linha").toBe(1);
    expect(linhas.dado, "lugar e anos de pratica ocupam uma linha").toBe(1);
    expect(linhas.texto).toMatch(/anos de experiência clínica/);
  });
}

for (const [largura, altura] of TODAS) {
  test(`anotacao aponta o proprio ponto: ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const empilhado = largura < 1200;
    const m = await page.evaluate((maoU) => {
      const visiveis = [...document.querySelectorAll(".pd-anot")].filter((e) => getComputedStyle(e).display !== "none");
      if (visiveis.length !== 1) throw new Error(`${visiveis.length} anotacoes visiveis`);
      const anot = visiveis[0];
      const lombar = anot.classList.contains("pd-anot--lombar");
      const alvo = lombar ? /^dor lombar/i : /ciática/i;
      const ponto = [...document.querySelectorAll(".pd-fig--perfil .pd-ponto")].find((p) =>
        alvo.test(p.getAttribute("aria-label") ?? ""),
      );
      if (!ponto) throw new Error("ponto da anotacao nao encontrado");
      const a = anot.querySelector(".pd-anot-anel")!.getBoundingClientRect();
      const p = ponto.querySelector(".pd-anel")!.getBoundingClientRect();
      const t = anot.querySelector(".pd-anot-texto")!.getBoundingClientRect();
      const fr = document.querySelector(".pd-fig--frontal")!.getBoundingClientRect();
      const pf = document.querySelector(".pd-fig--perfil")!.getBoundingClientRect();
      return {
        lombar,
        erro: Math.hypot(a.left + a.width / 2 - (p.left + p.width / 2), a.top + a.height / 2 - (p.top + p.height / 2)),
        linhas: anot.querySelectorAll(".pd-anot-texto span").length,
        folgaMao: t.left - (fr.left + (fr.width * maoU) / 221),
        folgaPerfil: pf.left - t.right,
        rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, MAO_FRONTAL_U);

    expect(m.lombar, empilhado ? "empilhado aponta a lombar" : "palco aponta a ciatica").toBe(empilhado);
    if (empilhado) {
      expect(m.folgaMao, "texto entre as figuras, longe da mao da frontal").toBeGreaterThanOrEqual(12);
      expect(m.folgaPerfil, "texto antes da caixa do perfil").toBeGreaterThanOrEqual(0);
    }
    expect(m.rolagem, "sem rolagem horizontal").toBe(0);
    expect(m.erro, "o anel da anotacao esta centrado no ponto").toBeLessThanOrEqual(1);
    expect(m.linhas).toBe(3);
  });
}

/** Raio da flutuacao da anotacao, em unidades de --a: x ate 3,6 e y ate
 *  2,8 (ver FLUTUACAO em globals.css). */
const RAIO_U = Math.hypot(3.6, 2.8);

/**
 * Com movimento: so o texto boia. As duas animacoes da boia sao pausadas e
 * levadas a 48 instantes de um minuto; em cada um o anel continua centrado
 * no ponto, o texto fica dentro do raio, o fio sai do contorno do anel e
 * chega a 7 unidades do texto, e as folgas do teste de repouso continuam
 * valendo com o texto deslocado.
 */
for (const [largura, altura] of TODAS) {
  test(`anotacao flutua presa ao anel e ao texto: ${largura}x${altura}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const empilhado = largura < 1200;
    const m = await page.evaluate(
      ({ maoU, raioU }) => {
        const anot = [...document.querySelectorAll(".pd-anot")].find((e) => getComputedStyle(e).display !== "none")!;
        const lombar = anot.classList.contains("pd-anot--lombar");
        const boia = anot.querySelector<HTMLElement>(".pd-anot-boia")!;
        const anims = boia.getAnimations();
        anims.forEach((a) => a.pause());
        const alvo = lombar ? /^dor lombar/i : /ciática/i;
        const ponto = [...document.querySelectorAll(".pd-fig--perfil .pd-ponto")].find((p) =>
          alvo.test(p.getAttribute("aria-label") ?? ""),
        )!;
        const anelEl = anot.querySelector(".pd-anot-anel")!;
        const textoEl = anot.querySelector(".pd-anot-texto")!;
        const fioEl = anot.querySelector(".pd-anot-fio")!;
        const linhas = [...document.querySelectorAll(".hero-linha")].filter((l) => getComputedStyle(l).display !== "none");

        let pior = { anel: 0, raio: 0, inicio: 0, fim: 0, vao: 0, folgaMao: Infinity, folgaPerfil: Infinity, folgaLinha: Infinity };
        let maior = 0;
        for (let k = 0; k < 48; k++) {
          anims.forEach((a) => (a.currentTime = k * 1250));
          const anel = anelEl.getBoundingClientRect();
          const a = anel.width / 22;
          const cx = anel.left + anel.width / 2;
          const cy = anel.top + anel.height / 2;
          const p = ponto.querySelector(".pd-anel")!.getBoundingClientRect();
          const t = textoEl.getBoundingClientRect();
          const mt = new DOMMatrix(getComputedStyle(textoEl).transform);
          const [dx, dy] = [mt.e, mt.f];
          maior = Math.max(maior, Math.hypot(dx, dy) / a);

          // Pontas do fio pela caixa dele: 1px de espessura, entao cada ponta
          // fica a meio pixel da borda, do lado para onde o texto desceu.
          const f = fioEl.getBoundingClientRect();
          const [yIni, yFim] = dy >= 0 ? [f.top + 0.5, f.bottom - 0.5] : [f.bottom - 0.5, f.top + 0.5];
          const ini = { x: lombar ? f.right : f.left, y: yIni };
          const fim = { x: lombar ? f.left : f.right, y: yFim };
          const esperadoFim = { x: cx + (lombar ? -35 : 63) * a + dx, y: cy + dy };

          const fr = document.querySelector(".pd-fig--frontal")!.getBoundingClientRect();
          const pf = document.querySelector(".pd-fig--perfil")!.getBoundingClientRect();
          const folgaLinha = Math.min(
            ...linhas.map((l) => {
              const r = l.getBoundingClientRect();
              if (r.right < t.left || r.left > t.right) return Infinity;
              return Math.max(r.top - t.bottom, t.top - r.bottom);
            }),
          );
          pior = {
            anel: Math.max(pior.anel, Math.hypot(cx - (p.left + p.width / 2), cy - (p.top + p.height / 2))),
            raio: Math.max(pior.raio, Math.hypot(dx, dy) - raioU * a),
            inicio: Math.max(pior.inicio, Math.abs(Math.hypot(ini.x - cx, ini.y - cy) - 11 * a)),
            fim: Math.max(pior.fim, Math.hypot(fim.x - esperadoFim.x, fim.y - esperadoFim.y)),
            vao: Math.max(pior.vao, Math.abs((lombar ? fim.x - t.right : t.left - fim.x) - 7 * a)),
            folgaMao: Math.min(pior.folgaMao, t.left - (fr.left + (fr.width * maoU) / 221)),
            folgaPerfil: Math.min(pior.folgaPerfil, pf.left - t.right),
            folgaLinha: Math.min(pior.folgaLinha, folgaLinha),
          };
        }
        return { animacoes: anims.length, lombar, maior, ...pior };
      },
      { maoU: MAO_FRONTAL_U, raioU: RAIO_U },
    );

    expect(m.animacoes, "a boia tem as duas animacoes, x e y").toBe(2);
    expect(m.maior, "o texto de fato se move").toBeGreaterThan(1.5);
    expect(m.anel, "o anel fica parado sobre o ponto").toBeLessThanOrEqual(1);
    expect(m.raio, "o texto nao sai do raio").toBeLessThanOrEqual(0.05);
    expect(m.inicio, "o fio nasce no contorno do anel").toBeLessThanOrEqual(1);
    expect(m.fim, "o fio chega aonde o texto foi").toBeLessThanOrEqual(1);
    expect(m.vao, "o vao entre fio e texto continua o de repouso").toBeLessThanOrEqual(1);
    if (empilhado) {
      expect(m.folgaMao, "texto longe da mao da frontal").toBeGreaterThanOrEqual(12);
      expect(m.folgaPerfil, "texto antes da caixa do perfil").toBeGreaterThanOrEqual(0);
    } else {
      expect(m.folgaLinha, "texto longe das linhas de referencia").toBeGreaterThanOrEqual(8);
    }
  });
}
