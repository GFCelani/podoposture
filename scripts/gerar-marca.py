"""
Gera src/components/brand-mark.tsx a partir do master da marca,
assets/marca/podoposture.png (4927x1729, as duas unicas cores do arquivo sao
#0E71B4 e #96BF0D, chapadas).

O master e' a arte que a cliente usa em tudo. O site tem de bater com ela, e
"bater" aqui quer dizer por pixel, nao de olho:

  - LETRAS: autotrace do canal azul. A versao anterior deste script compunha o
    texto com glyphs da Newsreader wght 500, a fonte de display do proprio
    site, apertados por tracking negativo. Nao e' a fonte da marca: alinhando
    os dois desenhos pelos discos verdes, a interseccao da tinta ficava em 51%.
    A cliente viu. Fonte nenhuma vai acertar um logotipo desenhado; o unico
    caminho fiel e' tracar o desenho que existe.
  - VERDE: nao passa por autotrace, e' medido. As nove vertebras sao circulos
    (erro de meio pixel no master) e saem como <circle>, uma por no' animavel.
    Os dois discos NAO sao elipses: sao superelipses de expoente 2.14, ou
    seja, ovais levemente quadradas. Com |x/rx|^2 + |y/ry|^2 = 1 o desenho
    erra 5.9 px no master e chega a 11 px perto dos polos, onde a marca fica
    visivelmente mais estreita do que deveria; com 2.14 o erro medio cai para
    0.25 px. Era esta a diferenca que sobrava depois de acertar as letras.
  - COR: chapada. O master nao tem gradiente nem contorno; a versao anterior
    punha um radialGradient (#a8ce27 -> #96BF0D) e um stroke escuro de
    acabamento nos discos. Era invencao.

Polaridade do potracer: o construtor Bitmap inverte SEMPRE e usa limiar em
escala 0..255. Passar a mascara direto devolve o retangulo da tela inteira,
com geometria valida e errada. Por isso `Bitmap(~mascara)`, com a mascara
booleana. Ver a nota do vault: potracer inverte a mascara no construtor.

Separacao de cor por comparacao de canal, nao por distancia ate o hex: o
antialias da borda fica longe da cor exata e um teste de distancia o
descartaria, comendo a borda das letras.

SISTEMA DE COORDENADAS. O TSX continua no mesmo espaco de antes (o master
antigo, 2036x716), e nao nos pixels do master novo. Isso mantem validos, sem
tocar em nada, o src/app/icon.svg (que e' um recorte do verde, com estas
coordenadas) e a animacao .marca-vertebra do globals.css. A transformacao
master->TSX e' um ajuste de minimos quadrados sobre as onze pecas verdes,
que estao nos dois lados; x e y saem com escalas proprias porque o master nao
foi reamostrado de forma uniforme (2.4200 contra 2.4148).
"""

import numpy as np
import potrace
from collections import deque
from PIL import Image

MASTER = "assets/marca/podoposture.png"
SAIDA = "src/components/brand-mark.tsx"
SAIDA_ICONE = "src/app/icon.svg"
AZUL, VERDE = "#0E71B4", "#96BF0D"

# Expoente da superelipse dos dois discos, ajustado no perfil do master:
# 2.145 no de cima, 2.130 no de baixo. Um so valor para os dois.
EXPOENTE_DISCO = 2.14

# As onze pecas verdes no espaco do TSX, medidas no master antigo e ja em uso
# pelo icon.svg. Ancoram a transformacao; nao sao recalculadas.
DISCOS = [(994.3, 219.1, 113.0, 126.0), (665.7, 499.7, 113.0, 126.0)]
VERTS = [
    (876.0, 75.5, 16.2), (840.4, 125.7, 21.7), (822.5, 196.7, 27.7),
    (825.5, 279.4, 30.5), (840.4, 366.5, 35.0), (855.3, 452.2, 30.5),
    (846.4, 531.2, 27.7), (825.5, 595.4, 20.0), (794.6, 646.5, 16.0),
]


def componentes(mascara, area_minima):
    """Componentes conexas 4-vizinhos: (cx, cy, rx, ry, area)."""
    altura, largura = mascara.shape
    visto = np.zeros(mascara.shape, bool)
    achados = []
    for y0, x0 in zip(*np.nonzero(mascara)):
        if visto[y0, x0]:
            continue
        fila, pilha = deque([(y0, x0)]), []
        visto[y0, x0] = True
        while fila:
            y, x = fila.popleft()
            pilha.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < altura and 0 <= nx < largura and mascara[ny, nx] and not visto[ny, nx]:
                    visto[ny, nx] = True
                    fila.append((ny, nx))
        if len(pilha) < area_minima:
            continue
        ys, xs = np.array(pilha).T
        achados.append(((xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2,
                        (xs.max() - xs.min() + 1) / 2, (ys.max() - ys.min() + 1) / 2, len(pilha)))
    return achados


def n(valor):
    return f"{valor:.1f}".rstrip("0").rstrip(".")


def superelipse(cx, cy, rx, ry, n_exp, amostras=48):
    """Contorno fechado da superelipse, em cubicas por Catmull-Rom."""
    t = np.linspace(0, 2 * np.pi, amostras, endpoint=False)
    pts = np.stack([cx + rx * np.sign(np.cos(t)) * np.abs(np.cos(t)) ** (2 / n_exp),
                    cy + ry * np.sign(np.sin(t)) * np.abs(np.sin(t)) ** (2 / n_exp)], 1)
    d = [f"M{n(pts[0][0])} {n(pts[0][1])}"]
    for i in range(amostras):
        p0, p1, p2, p3 = (pts[(i - 1) % amostras], pts[i],
                          pts[(i + 1) % amostras], pts[(i + 2) % amostras])
        c1, c2 = p1 + (p2 - p0) / 6, p2 - (p3 - p1) / 6
        d.append(f"C{n(c1[0])} {n(c1[1])} {n(c2[0])} {n(c2[1])} {n(p2[0])} {n(p2[1])}")
    return "".join(d) + "Z"


def ajuste(origem, destino):
    """Escala e deslocamento de minimos quadrados, um eixo."""
    origem, destino = np.asarray(origem), np.asarray(destino)
    escala = ((origem - origem.mean()) * (destino - destino.mean())).sum() / ((origem - origem.mean()) ** 2).sum()
    return escala, destino.mean() - escala * origem.mean()


# --- master, separado por canal ---
imagem = np.array(Image.open(MASTER).convert("RGBA"))
opaco = imagem[..., 3] > 128
canais = imagem[..., :3].astype(int)
azul = opaco & (canais[..., 2] > canais[..., 1] + 20)
verde = opaco & (canais[..., 1] > canais[..., 2] + 20)

# --- transformacao master -> espaco do TSX, pelas onze pecas verdes ---
pecas = sorted(componentes(verde, 2000), key=lambda p: p[1])
assert len(pecas) == 11, f"esperava 2 discos + 9 vertebras, achei {len(pecas)}"
alvo = sorted([(cx, cy) for cx, cy, _, _ in DISCOS] + [(cx, cy) for cx, cy, _ in VERTS],
              key=lambda p: p[1])
sx, tx = ajuste([p[0] for p in pecas], [a[0] for a in alvo])
sy, ty = ajuste([p[1] for p in pecas], [a[1] for a in alvo])
residuo = max(max(abs(sx * p[0] + tx - a[0]), abs(sy * p[1] + ty - a[1]))
              for p, a in zip(pecas, alvo))
print("escala x %.5f  y %.5f   residuo max %.2f unidades" % (sx, sy, residuo))
assert residuo < 2.0, "as pecas verdes do master nao batem com as do TSX"

# --- letras: autotrace do azul ---
# Bitmap inverte sempre; a mascara vai complementada.
caminho = potrace.Bitmap(~azul).trace(turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.2)


def px(ponto):
    return f"{n(sx * ponto.x + tx)} {n(sy * ponto.y + ty)}"


trechos, caixa = [], []
for curva in caminho:
    caixa.append(curva.start_point)
    trechos.append(f"M{px(curva.start_point)}")
    for seg in curva:
        caixa.append(seg.end_point)
        if seg.is_corner:
            caixa.append(seg.c)
            trechos.append(f"L{px(seg.c)}L{px(seg.end_point)}")
        else:
            trechos.append(f"C{px(seg.c1)} {px(seg.c2)} {px(seg.end_point)}")
    trechos.append("Z")
letras = "".join(trechos)
print("letras: %d contornos, %d caracteres de path" % (len(list(caminho)), len(letras)))
assert len(letras) > 5000, "path curto demais: a polaridade do potrace inverteu"

# --- viewBox: caixa da tinta inteira, azul e verde, com um respiro ---
xs = [sx * p.x + tx for p in caixa] + [c - r for c, _, r, _ in DISCOS] + [c + r for c, _, r, _ in DISCOS]
ys = [sy * p.y + ty for p in caixa] + [c - r for _, c, _, r in DISCOS] + [c + r for _, c, _, r in DISCOS]
xs += [c - r for c, _, r in VERTS] + [c + r for c, _, r in VERTS]
ys += [c - r for _, c, r in VERTS] + [c + r for _, c, r in VERTS]
x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
RESPIRO = 8
vb = "%s %s %s %s" % (n(x0 - RESPIRO), n(y0 - RESPIRO),
                      n(x1 - x0 + 2 * RESPIRO), n(y1 - y0 + 2 * RESPIRO))
print("viewBox:", vb, " proporcao %.4f" % ((x1 - x0 + 16) / (y1 - y0 + 16)))

# --- os dois discos, em superelipse ---
paths_disco = [superelipse(cx, cy, rx, ry, EXPOENTE_DISCO) for cx, cy, rx, ry in DISCOS]

linhas = [
    "/**",
    " * A marca, tracada do master assets/marca/podoposture.png (4927x1729).",
    " *",
    " * As letras sao autotrace do canal azul: o logotipo e' desenho, nao texto,",
    " * e nenhuma fonte o reproduz. A versao anterior compunha as letras com",
    " * glyphs da Newsreader e ficava em 51% de interseccao com o master.",
    " *",
    " * O verde e' medido, nao tracado. As nove vertebras sao circulos, uma por",
    " * no' animavel. Os dois \"o\" sao superelipses de expoente 2.14, nao",
    " * elipses: com expoente 2 eles ficam ate 11 px estreitos demais perto dos",
    " * polos, no tamanho do master.",
    " *",
    " * Cor chapada, sem gradiente e sem contorno, porque o master tem duas cores",
    " * e so. As coordenadas seguem no espaco antigo (2036x716), que e' o que",
    " * src/app/icon.svg recorta; os dois arquivos saem deste mesmo gerador.",
    " *",
    " * Gerado por scripts/gerar-marca.py. Nao editar a mao.",
    " */",
    "export function BrandMark({",
    "  className,",
    "  tone = \"paper\",",
    "}: {",
    "  className?: string;",
    "  /** Em banda escura as letras viram papel; o verde nao muda. */",
    "  tone?: \"paper\" | \"deep\";",
    "}) {",
    "  return (",
    f'    <svg viewBox="{vb}" className={{className}} aria-hidden="true" focusable="false">',
    f'      <path fill={{tone === "deep" ? "var(--color-paper)" : "{AZUL}"}} d="{letras}" />',
    "",
    '      {/* Os dois "o" da marca: superelipses, nao elipses */}',
]
for d in paths_disco:
    linhas.append(f'      <path fill="{VERDE}" d="{d}" />')
linhas += ["", "      {/* Coluna: 9 vertebras, de cima para baixo, um no' animavel cada */}",
           f'      <g fill="{VERDE}">']
for i, (cx, cy, r) in enumerate(VERTS):
    linhas.append(f'        <circle className="marca-vertebra" style={{{{ ["--v" as string]: {i} }}}} cx="{cx}" cy="{cy}" r="{r}" />')
linhas += ["      </g>", "    </svg>", "  );", "}"]

open(SAIDA, "w", encoding="utf-8").write("\n".join(linhas) + "\n")
print("escrito", SAIDA)

# --- o icone: so o verde, no mesmo espaco de coordenadas ---
# Quadrado centrado na coluna de vertebras, que e' o eixo do desenho.
gx = [c - r for c, _, r, _ in DISCOS] + [c + r for c, _, r, _ in DISCOS]
gx += [c - r for c, _, r in VERTS] + [c + r for c, _, r in VERTS]
gy = [c - r for _, c, _, r in DISCOS] + [c + r for _, c, _, r in DISCOS]
gy += [c - r for _, c, r in VERTS] + [c + r for _, c, r in VERTS]
lado = max(max(gx) - min(gx), max(gy) - min(gy))
ix = (min(gx) + max(gx)) / 2 - lado / 2
iy = (min(gy) + max(gy)) / 2 - lado / 2
icone = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(ix)} {n(iy)} {n(lado)} {n(lado)}">']
icone += [f'  <path d="{d}" fill="{VERDE}"/>' for d in paths_disco]
icone += [f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{VERDE}"/>' for cx, cy, r in VERTS]
icone.append("</svg>")
open(SAIDA_ICONE, "w", encoding="utf-8").write("\n".join(icone) + "\n")
print("escrito", SAIDA_ICONE, "viewBox", n(ix), n(iy), n(lado))
