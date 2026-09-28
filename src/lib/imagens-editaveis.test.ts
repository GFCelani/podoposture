import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { trechosQueRecebemFotos } from "@/components/secoes-de-conteudo";
import { miniatura, palavrasDoOriginal, textoDoValor, tomarSecaoParaReabrir } from "@/components/painel/inicio/edicao";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import {
  CHAVES_DE_PAGINA,
  DESCRITORES,
  PAGINAS_COM_FOTOS,
  PAGINAS_DE_DESTINO,
  chaveDaPagina,
  mesclarSecao,
  validarSecao,
  type ConteudoDaPagina,
} from "./conteudo-tipos";
import { ilustracaoDaPagina } from "./ilustracao-da-pagina";
import { TETO_DOS_BLOCOS_EXTRAS, dimensoesDoPng } from "./imagem-png";
import { lerNomeDoArquivo, nomeDoArquivo, tipoDaImagem } from "./imagem-webp";
import { buscarPagina } from "./pages";
import { planoDoCorte } from "./preparar-imagem";

/**
 * As imagens que o painel passou a editar em 2026-09-28: fotos das paginas
 * internas, fundo do topo, logo, icone e cartao de compartilhamento.
 *
 * O que mais importa aqui e que o padrao reproduz o site de hoje (sem nada
 * publicado, nada muda) e que o servidor so aceita o que o campo pede.
 */

const RESUMO = "a".repeat(64);
const enviada = (largura: number, altura: number, ext = "png") => ({
  src: `/img/post/${RESUMO}-${largura}x${altura}.${ext}`,
  largura: 1,
  altura: 1,
  alt: "qualquer",
});

async function png(largura: number, altura: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width: largura, height: altura, channels: 4, background: { r: 14, g: 113, b: 180, alpha: 0 } },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("PNG medido pelos bytes", () => {
  it("le largura e altura de um PNG de verdade, com transparencia", async () => {
    expect(dimensoesDoPng(await png(512, 300))).toEqual({ largura: 512, altura: 300 });
  });

  it("recusa arquivo cortado, com lixo depois do fim ou sem assinatura", async () => {
    const bom = await png(40, 40);
    expect(dimensoesDoPng(bom.slice(0, bom.length - 4))).toBeNull();
    const comLixo = new Uint8Array(bom.length + 10);
    comLixo.set(bom);
    expect(dimensoesDoPng(comLixo)).toBeNull();
    const semAssinatura = bom.slice();
    semAssinatura[1] = 0x51;
    expect(dimensoesDoPng(semAssinatura)).toBeNull();
    expect(dimensoesDoPng(new Uint8Array(100))).toBeNull();
  });

  it("recusa PNG animado (acTL) e medida fora do teto", async () => {
    const bom = await png(20, 20);
    // acTL logo depois do IHDR (8 + 25 bytes), com 8 bytes de dado e CRC qualquer.
    const acTL = new Uint8Array([0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
    const animado = new Uint8Array(bom.length + acTL.length);
    animado.set(bom.slice(0, 33));
    animado.set(acTL, 33);
    animado.set(bom.slice(33), 33 + acTL.length);
    expect(dimensoesDoPng(animado)).toBeNull();

    const gigante = bom.slice();
    gigante.set([0, 0, 0x27, 0x10], 16); // largura 10000
    expect(dimensoesDoPng(gigante)).toBeNull();
  });

  it("recusa bloco extra grande (texto guardado dentro do PNG)", async () => {
    const bom = await png(20, 20);
    const bloco = (tamanho: number) => {
      const b = new Uint8Array(12 + tamanho);
      b.set([(tamanho >>> 24) & 255, (tamanho >>> 16) & 255, (tamanho >>> 8) & 255, tamanho & 255]);
      b.set([0x74, 0x45, 0x58, 0x74], 4); // tEXt
      return b;
    };
    const comBloco = (tamanho: number) => {
      const extra = bloco(tamanho);
      const saida = new Uint8Array(bom.length + extra.length);
      saida.set(bom.slice(0, 33));
      saida.set(extra, 33);
      saida.set(bom.slice(33), 33 + extra.length);
      return saida;
    };
    expect(dimensoesDoPng(comBloco(1000))).toEqual({ largura: 20, altura: 20 });
    expect(dimensoesDoPng(comBloco(TETO_DOS_BLOCOS_EXTRAS + 1))).toBeNull();
  });

  it("nome publico .png volta como image/png, e o tipo sai do endereco", () => {
    const nome = nomeDoArquivo(RESUMO, { largura: 512, altura: 512 }, "image/png");
    expect(nome).toBe(`${RESUMO}-512x512.png`);
    expect(lerNomeDoArquivo(nome)?.tipo).toBe("image/png");
    expect(tipoDaImagem(`/img/post/${nome}`)).toBe("image/png");
    expect(tipoDaImagem("/icon.svg")).toBe("image/svg+xml");
    expect(tipoDaImagem("/og.png")).toBe("image/png");
    expect(tipoDaImagem(`/img/post/${RESUMO}-1200x630.jpg`)).toBe("image/jpeg");
  });
});

describe("recorte feito no navegador antes de enviar", () => {
  it("cartao: a maior regiao 1200x630 pelo centro, reduzida para a medida exata", () => {
    const plano = planoDoCorte(4000, 3000, { largura: 1200, altura: 630 });
    expect(plano).not.toBeNull();
    expect(plano!.saidaL).toBe(1200);
    expect(plano!.saidaA).toBe(630);
    expect(plano!.l).toBe(4000);
    expect(plano!.a).toBeCloseTo(2100, 5);
    expect(plano!.y).toBeCloseTo(450, 5);
  });

  it("cartao: imagem pequena demais e recusada, nao ampliada", () => {
    expect(planoDoCorte(1000, 2000, { largura: 1200, altura: 630 })).toBeNull();
    expect(planoDoCorte(1600, 600, { largura: 1200, altura: 630 })).toBeNull();
  });

  it("icone: quadrado pelo centro; menor que 512 fica do tamanho que tem, ate 192", () => {
    const corte = { largura: 512, altura: 512, ladoMinimo: 192 };
    expect(planoDoCorte(1000, 600, corte)).toMatchObject({ x: 200, y: 0, l: 600, a: 600, saidaL: 512, saidaA: 512 });
    expect(planoDoCorte(300, 500, corte)).toMatchObject({ saidaL: 300, saidaA: 300 });
    expect(planoDoCorte(150, 150, corte)).toBeNull();
  });
});

describe("paginas internas com fotos", () => {
  it("sao as paginas do menu, na ordem, menos Contato e o blog", () => {
    const esperadas = PAGINAS_DE_DESTINO.filter((p) => p.slug !== "contato" && p.slug !== "nosso-blog").map((p) => p.slug);
    expect(CHAVES_DE_PAGINA.map((c) => PAGINAS_COM_FOTOS[c].slug.normalize("NFC"))).toEqual(esperadas);
    for (const chave of CHAVES_DE_PAGINA) {
      expect(chave).toMatch(/^pagina-[a-z0-9-]+$/);
      expect(chaveDaPagina(PAGINAS_COM_FOTOS[chave].slug)).toBe(chave);
      expect(chaveDaPagina(PAGINAS_COM_FOTOS[chave].slug.normalize("NFD"))).toBe(chave);
    }
    expect(chaveDaPagina("contato")).toBeNull();
  });

  it("os trechos oferecidos como ancora sao exatamente os que a pagina aceita", () => {
    for (const chave of CHAVES_DE_PAGINA) {
      const pagina = buscarPagina(PAGINAS_COM_FOTOS[chave].slug);
      expect(pagina, chave).toBeDefined();
      expect(PAGINAS_COM_FOTOS[chave].trechos, chave).toEqual(trechosQueRecebemFotos(pagina!.html));
    }
  });

  it("o padrao de cada pagina valida, volta igual e reproduz a tabela de hoje", () => {
    for (const chave of CHAVES_DE_PAGINA) {
      const validacao = validarSecao(chave, CONTEUDO_PADRAO[chave]);
      expect(validacao.erros, chave).toEqual({});
      expect(validacao.dados, chave).toEqual(CONTEUDO_PADRAO[chave]);
      expect(CONTEUDO_PADRAO[chave].foto, chave).toHaveLength(1);
    }
    const dor = ilustracaoDaPagina("tratamento-da-dor", CONTEUDO_PADRAO["pagina-tratamento-da-dor"]);
    expect(dor.apoio?.map((f) => f.src)).toEqual([
      "/img/galeria/escritorio.webp",
      "/img/galeria/avaliacao-postural.webp",
      "/img/galeria/plataforma-de-pressao.webp",
    ]);
    expect(dor.apoio?.some((f) => "secao" in f)).toBe(false);
    const dtm = ilustracaoDaPagina("tratamento-da-dtm", CONTEUDO_PADRAO["pagina-tratamento-da-dtm"]);
    expect(dtm.apoio?.[0].secao).toBe("cefaleia-tensional");
    expect(dtm.foto?.src).toBe("/img/palpacao-da-mandibula.webp");
    expect(ilustracaoDaPagina("rpg", CONTEUDO_PADRAO["pagina-rpg"]).apoio).toBeUndefined();
  });

  it("tirar a foto e tirar as de apoio vale: a pagina vai sem moldura e sem placeholder", () => {
    const vazia: ConteudoDaPagina = { foto: [], apoio: [], ancoraDoApoio: "" };
    const salvo = validarSecao("pagina-osteopatia", vazia);
    expect(salvo.ok).toBe(true);
    const lida = mesclarSecao("pagina-osteopatia", CONTEUDO_PADRAO["pagina-osteopatia"], salvo.dados);
    expect(lida).toEqual(vazia);
    expect(ilustracaoDaPagina("osteopatia", lida)).toEqual({
      glifo: "/osteopatia",
      foto: undefined,
      placeholder: undefined,
      apoio: undefined,
    });
  });

  it("limites: 1 foto no topo, 3 no meio do texto, ancora so da lista, legenda obrigatoria", () => {
    const base = CONTEUDO_PADRAO["pagina-osteopatia"];
    const foto = base.foto[0];
    expect(validarSecao("pagina-osteopatia", { ...base, foto: [foto, foto] }).erros.foto).toBeDefined();
    expect(validarSecao("pagina-osteopatia", { ...base, apoio: [foto, foto, foto, foto] }).erros.apoio).toBeDefined();
    expect(validarSecao("pagina-osteopatia", { ...base, apoio: [foto, foto, foto] }).ok).toBe(true);
    expect(validarSecao("pagina-osteopatia", { ...base, ancoraDoApoio: "nao-existe" }).erros.ancoraDoApoio).toBeDefined();
    expect(validarSecao("pagina-osteopatia", { ...base, ancoraDoApoio: "conclusao" }).ok).toBe(true);
    expect(
      validarSecao("pagina-osteopatia", { ...base, foto: [{ ...foto, legenda: "  " }] }).erros["foto.0.legenda"],
    ).toBeDefined();
    expect(
      validarSecao("pagina-osteopatia", { ...base, foto: [{ ...foto, imagem: { ...foto.imagem, alt: "" } }] }).erros[
        "foto.0.imagem.alt"
      ],
    ).toBeDefined();
  });

  it("toda pagina com fotos tem descritor na aba Paginas, com a propria pagina para a previa", () => {
    for (const chave of CHAVES_DE_PAGINA) {
      expect(DESCRITORES[chave].pagina).toBe(PAGINAS_COM_FOTOS[chave].slug);
    }
    expect(DESCRITORES.hero.pagina).toBeUndefined();
    expect(DESCRITORES.marca.pagina).toBeUndefined();
  });
});

describe("logo, icone, cartao e fundo do topo", () => {
  it("o padrao e o site de hoje: marca desenhada, og.png e a foto da sala", () => {
    expect(CONTEUDO_PADRAO.marca).toEqual({ logo: [], logoEscuro: [], icone: [] });
    expect(CONTEUDO_PADRAO.compartilhamento.imagem.src).toBe("/og.png");
    expect(CONTEUDO_PADRAO.hero.fundo.map((f) => f.src)).toEqual(["/img/clinica-podoposture-5.webp"]);
    for (const chave of ["marca", "compartilhamento", "hero"] as const) {
      expect(validarSecao(chave, CONTEUDO_PADRAO[chave]).erros, chave).toEqual({});
    }
  });

  it("imagem decorativa nao guarda descricao, mesmo que ela venha junto", () => {
    const r = validarSecao("marca", { ...CONTEUDO_PADRAO.marca, logo: [enviada(800, 280)] });
    expect(r.ok).toBe(true);
    expect(r.dados?.logo).toEqual([{ src: enviada(800, 280).src, largura: 800, altura: 280, alt: "" }]);
  });

  it("logo estreito demais e recusado", () => {
    expect(validarSecao("marca", { ...CONTEUDO_PADRAO.marca, logo: [enviada(120, 40)] }).erros["logo.0.src"]).toBeDefined();
  });

  it("icone precisa ser quadrado e ter pelo menos 192 px", () => {
    const icone = (l: number, a: number) => validarSecao("marca", { ...CONTEUDO_PADRAO.marca, icone: [enviada(l, a)] });
    expect(icone(512, 512).ok).toBe(true);
    expect(icone(256, 256).ok).toBe(true);
    expect(icone(512, 400).erros["icone.0.src"]).toMatch(/quadrado/);
    expect(icone(128, 128).erros["icone.0.src"]).toBeDefined();
  });

  it("cartao precisa estar em 1200 x 630", () => {
    const cartao = (l: number, a: number) =>
      validarSecao("compartilhamento", { imagem: enviada(l, a, "jpg") });
    expect(cartao(1200, 630).ok).toBe(true);
    expect(cartao(1200, 800).erros["imagem.src"]).toMatch(/1200 × 630/);
    expect(cartao(800, 420).erros["imagem.src"]).toBeDefined();
  });

  it("fundo do topo: pode sair, e documento antigo sem o campo cai no padrao", () => {
    const semFundo = validarSecao("hero", { ...CONTEUDO_PADRAO.hero, fundo: [] });
    expect(semFundo.ok).toBe(true);
    expect(semFundo.dados?.fundo).toEqual([]);
    const { fundo: _fora, ...antigo } = CONTEUDO_PADRAO.hero;
    void _fora;
    expect(mesclarSecao("hero", CONTEUDO_PADRAO.hero, antigo).fundo).toEqual(CONTEUDO_PADRAO.hero.fundo);
    expect(validarSecao("hero", { ...CONTEUDO_PADRAO.hero, fundo: [enviada(900, 500, "webp")] }).erros["fundo.0.src"]).toBeDefined();
  });
});

describe("ajustes da revisao", () => {
  it("icone sobe sempre em PNG; logo em WebP/PNG; cartao em JPEG", () => {
    const campos = DESCRITORES.marca.campos;
    const item = (c: (typeof campos)[keyof typeof campos]) => (c.tipo === "lista" && c.item.tipo === "imagem" ? c.item : null);
    expect(item(campos.icone)?.envio?.formato).toBe("png");
    expect(item(campos.logo)?.envio?.formato).toBe("transparente");
    const cartao = DESCRITORES.compartilhamento.campos.imagem;
    expect(cartao.tipo === "imagem" && cartao.envio?.formato).toBe("jpeg");
  });

  it("tipo pela extensao sai da mesma tabela do nome publico", () => {
    expect(tipoDaImagem("/x/foto.JPEG")).toBe("image/jpeg");
    expect(tipoDaImagem("/x/foto.jpg?v=2")).toBe("image/jpeg");
    expect(tipoDaImagem("/x/foto.webp")).toBe("image/webp");
  });

  it("logo sem arquivo pede o botao que existe na tela", () => {
    const r = validarSecao("marca", { ...CONTEUDO_PADRAO.marca, logo: [{ src: "", largura: 0, altura: 0, alt: "" }] });
    expect(r.erros["logo.0.src"]).toMatch(/Escolher arquivo/);
    const foto = validarSecao("bem-vindo", { ...CONTEUDO_PADRAO["bem-vindo"], imagem: { src: "", largura: 0, altura: 0, alt: "x" } });
    expect(foto.erros["imagem.src"]).toMatch(/Escolher foto/);
  });

  it("secoes so de imagem vem marcadas no descritor, e so elas", () => {
    const soImagem = CHAVES_DE_PAGINA.every((c) => DESCRITORES[c].soImagem);
    expect(soImagem).toBe(true);
    expect(DESCRITORES.marca.soImagem && DESCRITORES.compartilhamento.soImagem).toBe(true);
    expect(DESCRITORES.hero.soImagem).toBeUndefined();
    expect(DESCRITORES.galeria.soImagem).toBeUndefined();
  });

  it("original de lista de imagens sem descricao nao vira '1. ' solto", () => {
    const fundo = DESCRITORES.hero.campos.fundo;
    expect(textoDoValor(fundo, CONTEUDO_PADRAO.hero.fundo)).toBe("");
    expect(textoDoValor(DESCRITORES.marca.campos.logo, [])).toMatch(/marca original/);
    expect(palavrasDoOriginal("pagina-rpg").botao).toBe("Voltar o site às fotos originais");
    expect(palavrasDoOriginal("marca").botao).toBe("Voltar o site ao original");
    expect(palavrasDoOriginal("hero").botao).toBe("Voltar o site ao texto original");
  });

  it("miniatura usa a versao reduzida do otimizador", () => {
    expect(miniatura("/img/post/a-1x1.webp")).toBe("/_next/image?url=%2Fimg%2Fpost%2Fa-1x1.webp&w=128&q=75");
  });
});

describe("reabrir a secao depois da senha, com duas abas de secoes", () => {
  function armazem(inicial: Record<string, string>) {
    const dados = new Map(Object.entries(inicial));
    return {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
      dados,
    };
  }

  it("a aba que nao reconhece a secao deixa o recado para a outra", () => {
    const a = armazem({ podoposture_inicio_reabrir: "pagina-rpg" });
    expect(tomarSecaoParaReabrir(a, (c) => !c.startsWith("pagina-"))).toBeNull();
    expect(a.dados.has("podoposture_inicio_reabrir")).toBe(true);
    expect(tomarSecaoParaReabrir(a, (c) => c.startsWith("pagina-"))).toBe("pagina-rpg");
    expect(a.dados.has("podoposture_inicio_reabrir")).toBe(false);
  });
});
