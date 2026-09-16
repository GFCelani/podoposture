"""
Gera src/components/trama-hero-geometria.ts: as curvas de nivel da camada de
fundo do hero.

O desenho nao e' escolhido curva a curva. Existe um campo escalar suave sobre
o quadro de 1440x900 (soma de bolhas gaussianas anisotropicas, algumas com o
centro FORA do quadro para que as curvas saiam cortadas pela borda, mais uma
ondulacao de baixa frequencia que tira a simetria da elipse), e a trama e' o
conjunto de isolinhas desse campo em niveis igualmente espacados. E' o mesmo
principio de um mapa topografico, e e' de la que vem o que se pediu: curvas
fechadas, aninhadas, de escalas diferentes, com espacamento irregular.

Pipeline: campo -> marching squares -> Chaikin (arredonda o serrilhado do
grid) -> Douglas-Peucker (tira ponto que nao muda a forma) -> caminho em
quadraticas pelos pontos medios (curva de verdade, nao poligonal).

A semente esta fixa: o arquivo gerado e' versionado e o script so roda de novo
se a composicao for para mudar.
"""

import math
import numpy as np

SEMENTE = 20260915
LARG, ALT = 1440.0, 900.0
GX, GY = 300, 190  # grid do marching squares
NIVEIS = 11
PERIMETRO_MIN = 150.0  # unidades de viewBox; abaixo disto vira cisco
TOL_DP = 0.9
SAIDA = "src/components/trama-hero-geometria.ts"

rng = np.random.default_rng(SEMENTE)

# --- campo -------------------------------------------------------------
# Sete bolhas. Tres com o centro dentro do quadro (dao os grupos aninhados
# completos), quatro com o centro fora (dao as curvas amplas que atravessam a
# area e morrem na borda). Raios entre 0,22 e 0,95 da largura: e' isso que faz
# a "escala variada" do pedido.
BOLHAS = [
    #  cx,    cy,   rx,   ry,  giro,  peso
    (0.22, 0.30, 0.30, 0.42, 0.35, 1.00),
    (0.78, 0.62, 0.26, 0.34, -0.50, 0.85),
    (0.50, 0.92, 0.42, 0.28, 0.15, 0.70),
    (-0.18, 0.74, 0.46, 0.52, 0.60, 0.95),
    (1.16, 0.16, 0.52, 0.44, -0.30, 0.90),
    (0.42, -0.26, 0.60, 0.38, 0.05, 0.75),
    (1.05, 1.18, 0.40, 0.46, 0.80, 0.65),
]

xs = np.linspace(0.0, LARG, GX)
ys = np.linspace(0.0, ALT, GY)
X, Y = np.meshgrid(xs, ys)

# coordenadas normalizadas pela largura nos dois eixos: bolha nao deforma
u = X / LARG
v = Y / LARG * (LARG / ALT) * (ALT / LARG)  # = Y / LARG
v = Y / LARG

campo = np.zeros_like(X)
for cx, cy, rx, ry, giro, peso in BOLHAS:
    du = u - cx
    dv = v - cy * (ALT / LARG)
    c, s = math.cos(giro), math.sin(giro)
    a = (du * c + dv * s) / rx
    b = (-du * s + dv * c) / ry
    campo += peso * np.exp(-(a * a + b * b))

# ondulacao de baixa frequencia: tira a regularidade concentrica das bolhas
for f, amp, fase_u, fase_v in (
    (2.1, 0.085, 0.7, 1.9),
    (3.3, 0.045, 2.4, 0.3),
    (1.4, 0.060, 5.1, 3.7),
):
    campo += amp * np.sin(f * math.tau * u + fase_u) * np.cos(
        f * 0.78 * math.tau * v + fase_v
    )

# --- marching squares --------------------------------------------------


def interp(p1, p2, v1, v2, nivel):
    t = 0.5 if v2 == v1 else (nivel - v1) / (v2 - v1)
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))


def segmentos(nivel):
    """Segmentos da isolinha, celula a celula (caso ambiguo resolvido pela media)."""
    saida = []
    for j in range(GY - 1):
        for i in range(GX - 1):
            v00 = campo[j, i]
            v10 = campo[j, i + 1]
            v11 = campo[j + 1, i + 1]
            v01 = campo[j + 1, i]
            idx = (
                (1 if v00 > nivel else 0)
                | (2 if v10 > nivel else 0)
                | (4 if v11 > nivel else 0)
                | (8 if v01 > nivel else 0)
            )
            if idx in (0, 15):
                continue
            p00 = (xs[i], ys[j])
            p10 = (xs[i + 1], ys[j])
            p11 = (xs[i + 1], ys[j + 1])
            p01 = (xs[i], ys[j + 1])
            baixo = interp(p00, p10, v00, v10, nivel)
            dire = interp(p10, p11, v10, v11, nivel)
            cima = interp(p01, p11, v01, v11, nivel)
            esq = interp(p00, p01, v00, v01, nivel)
            if idx in (1, 14):
                saida.append((esq, baixo))
            elif idx in (2, 13):
                saida.append((baixo, dire))
            elif idx in (3, 12):
                saida.append((esq, dire))
            elif idx in (4, 11):
                saida.append((dire, cima))
            elif idx in (6, 9):
                saida.append((baixo, cima))
            elif idx in (7, 8):
                saida.append((esq, cima))
            else:  # 5 e 10: sela
                media = (v00 + v10 + v11 + v01) / 4
                if (idx == 5) == (media > nivel):
                    saida.append((esq, cima))
                    saida.append((baixo, dire))
                else:
                    saida.append((esq, baixo))
                    saida.append((dire, cima))
    return saida


def costurar(segs):
    """Junta os segmentos soltos em polilinhas (fechadas quando dao a volta)."""
    chave = lambda p: (round(p[0], 4), round(p[1], 4))
    adj = {}
    for a, b in segs:
        adj.setdefault(chave(a), []).append((chave(b), b))
        adj.setdefault(chave(b), []).append((chave(a), a))
    visitados = set()
    linhas = []
    # comeca pelas pontas soltas (curva cortada pela borda), depois pelos ciclos
    inicios = [k for k, vs in adj.items() if len(vs) == 1] + list(adj.keys())
    for ini in inicios:
        if ini in visitados or ini not in adj:
            continue
        linha = [ini]
        visitados.add(ini)
        atual = ini
        while True:
            prox = None
            for k, p in adj[atual]:
                if k not in visitados:
                    prox = k
                    break
            if prox is None:
                break
            visitados.add(prox)
            linha.append(prox)
            atual = prox
        if len(linha) < 4:
            continue
        fechada = (
            math.dist(linha[0], linha[-1])
            < 2.5 * max(LARG / GX, ALT / GY)
            and len(linha) > 8
        )
        linhas.append((linha, fechada))
    return linhas


def perimetro(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def chaikin(pts, fechada, voltas=2):
    for _ in range(voltas):
        novo = [] if fechada else [pts[0]]
        n = len(pts)
        faixa = range(n) if fechada else range(n - 1)
        for i in faixa:
            a, b = pts[i], pts[(i + 1) % n]
            novo.append((a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25))
            novo.append((a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75))
        if not fechada:
            novo.append(pts[-1])
        pts = novo
    return pts


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    norma = math.hypot(dx, dy)
    pior, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        if norma == 0:
            d = math.dist(p, a)
        else:
            d = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / norma
        if d > pior:
            pior, idx = d, i
    if pior <= tol:
        return [a, b]
    return dp(pts[: idx + 1], tol)[:-1] + dp(pts[idx:], tol)


def caminho(pts, fechada):
    """Quadraticas pelos pontos medios: cada vertice vira controle, e o traco
    sai curvo sem precisar de mais pontos."""
    f = lambda n: f"{n:.1f}".rstrip("0").rstrip(".")
    if fechada:
        meio = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        p0 = meio(pts[-1], pts[0])
        d = [f"M{f(p0[0])} {f(p0[1])}"]
        n = len(pts)
        for i in range(n):
            c = pts[i]
            m = meio(pts[i], pts[(i + 1) % n])
            d.append(f"Q{f(c[0])} {f(c[1])} {f(m[0])} {f(m[1])}")
        d.append("Z")
        return "".join(d)
    d = [f"M{f(pts[0][0])} {f(pts[0][1])}"]
    for i in range(1, len(pts) - 1):
        c = pts[i]
        m = ((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
        d.append(f"Q{f(c[0])} {f(c[1])} {f(m[0])} {f(m[1])}")
    d.append(f"L{f(pts[-1][0])} {f(pts[-1][1])}")
    return "".join(d)


lo, hi = float(campo.min()), float(campo.max())
niveis = [lo + (hi - lo) * (k + 0.5) / NIVEIS for k in range(NIVEIS)]

curvas = []
for nivel in niveis:
    for pts, fechada in costurar(segmentos(nivel)):
        if perimetro(pts) < PERIMETRO_MIN:
            continue
        s = chaikin(pts, fechada)
        if fechada:
            s = s + [s[0]]
        s = dp(s, TOL_DP)
        if fechada:
            s = s[:-1]
        if len(s) < 4:
            continue
        curvas.append(caminho(s, fechada))

texto = "\n".join(f'  "{c}",' for c in curvas)
cabecalho = f'''/**
 * Curvas de nivel da camada de fundo do hero. GERADO por
 * scripts/gerar-trama-hero.py (semente {SEMENTE}); nao editar a mao.
 *
 * Isolinhas de um campo escalar suave no quadro de {int(LARG)} x {int(ALT)},
 * {NIVEIS} niveis. O comentario do script explica o campo e o pipeline.
 */
export const TRAMA_QUADRO = {{ largura: {int(LARG)}, altura: {int(ALT)} }};

export const TRAMA_CURVAS = [
{texto}
] as const;
'''

with open(SAIDA, "w", encoding="utf-8") as fh:
    fh.write(cabecalho)

print(f"{len(curvas)} curvas, {len(cabecalho) / 1024:.1f} KB -> {SAIDA}")
