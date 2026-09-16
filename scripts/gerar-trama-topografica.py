"""
Gera src/components/trama-topografica-paths.ts: as curvas de nivel da camada
de fundo do hero.

Nao sao blobs desenhados a mao. Sao isolinhas de verdade, extraidas por
marching squares de um campo escalar suave (ruido de gradiente, tres oitavas)
com niveis igualmente espacados. E' o que garante as duas exigencias do
desenho ao mesmo tempo:

  - forma: isolinha de campo continuo nunca tem trecho reto nem quina; onde o
    campo tem um pico ou uma bacia ela fecha, e os formatos saem variados
    porque o campo nao e' simetrico em lugar nenhum.
  - densidade: o ruido de gradiente e' estatisticamente homogeneo, entao com
    nivel igualmente espacado a quantidade de linha por area e' a mesma em
    todo canto. Nenhum canto concentra mais curva que o resto, e isso e'
    propriedade do campo, nao ajuste a olho.

O campo e' amostrado alem do viewBox (MARGEM) para as curvas entrarem e
sairem do quadro em vez de fecharem todas dentro dele. O que fica dentro do
viewBox e' recortado pelo proprio viewport do SVG.

Semente fixa: o desenho e' sempre o mesmo build a build.
"""
import math
import random
from pathlib import Path

import numpy as np

# --- quadro -----------------------------------------------------------------
LARGURA = 1440
ALTURA = 960
MARGEM = 260          # campo amostrado alem do quadro, dos dois lados
PASSO = 5             # grade do marching squares, em px do viewBox

# --- campo ------------------------------------------------------------------
# O campo e' uma DISTANCIA, nao um ruido. A troca foi feita pela densidade:
# a distancia entre duas curvas vizinhas vale (passo de nivel)/(gradiente do
# campo), e num campo de ruido o gradiente varia muito, entao as curvas se
# amontoam nas encostas e somem nos planaltos. Num campo de distancia o
# gradiente vale 1 em qualquer ponto, logo o espacamento entre as curvas e' o
# mesmo em todo canto por construcao, e nao por ajuste a olho.
#
# A distancia e' medida ate a borda de manchas organicas sorteadas (ruido de
# gradiente cortado num limiar). Sao elas que dao formato e escala variados:
# dentro de cada mancha as curvas fecham em volta do miolo, fora delas
# contornam o grupo. Depois o campo passa por um borrao gaussiano, que
# arredonda as cristas (o lugar equidistante de duas manchas, onde a curva
# de nivel de uma distancia crua faria bico) sem mexer no espacamento longe
# delas.
SEMENTE = 20260915
ONDA_MANCHA = 490.0   # escala das manchas
DETALHE_MANCHA = 0.42 # peso da segunda oitava: recorta a borda da mancha
LIMIAR = 0.02         # corte do ruido: define quanto do plano e' mancha
BORRAO = 42           # sigma do borrao, em px: arredonda crista e vale
ESPACO = 72           # distancia entre duas curvas vizinhas, em px
FASE = 0.5            # deslocamento dos niveis, em fracao de ESPACO

# --- saida ------------------------------------------------------------------
PERIMETRO_MINIMO = 210   # laco menor que isto vira pastilha, nao curva
REDONDEZA_MINIMA = 0.3   # 4*pi*area/perimetro^2: 1 e' circulo, ~0 e' agulha
PASSO_DO_NO = 40         # reamostragem antes de suavizar, em px de arco
DESTINO = Path("src/components/trama-topografica-paths.ts")


# --- ruido de gradiente -----------------------------------------------------
rnd = random.Random(SEMENTE)
TAMANHO_TABELA = 512
_perm = list(range(TAMANHO_TABELA))
rnd.shuffle(_perm)
_perm = _perm * 2
_gradientes = []
for _ in range(TAMANHO_TABELA):
    a = rnd.uniform(0, 2 * math.pi)
    _gradientes.append((math.cos(a), math.sin(a)))


def _suave(t):
    # quintica: primeira e segunda derivadas nulas na celula, entao o ruido
    # nao tem dobra nas bordas da grade e a mancha nao nasce com quina
    return t * t * t * (t * (t * 6 - 15) + 10)


def _perlin(x, y):
    """Perlin 2d em array numpy."""
    xi, yi = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    xf, yf = x - xi, y - yi
    u, v = _suave(xf), _suave(yf)
    tabela = np.array(_perm, dtype=np.int64)
    gx = np.array([g[0] for g in _gradientes])
    gy = np.array([g[1] for g in _gradientes])
    canto = []
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        i = tabela[(tabela[(xi + dx) & 511] + yi + dy) & 511] & 511
        canto.append(gx[i] * (xf - dx) + gy[i] * (yf - dy))
    n0 = canto[0] + u * (canto[1] - canto[0])
    n1 = canto[2] + u * (canto[3] - canto[2])
    return n0 + v * (n1 - n0)


# --- transformada de distancia ----------------------------------------------
def _distancia_1d(f):
    """Felzenszwalb & Huttenlocher: envoltoria inferior das parabolas, por
    linha. Exata e linear no tamanho."""
    n = f.shape[0]
    d = np.empty(n)
    v = np.zeros(n, dtype=np.int64)
    z = np.empty(n + 1)
    k = 0
    v[0] = 0
    z[0], z[1] = -np.inf, np.inf
    for q in range(1, n):
        while True:
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
            if s <= z[k] and k > 0:
                k -= 1
            else:
                break
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = np.inf
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        d[q] = (q - v[k]) ** 2 + f[v[k]]
    return d


def _edt(mascara):
    """Distancia euclidiana, em celulas, ate a celula True mais proxima."""
    grande = 1e12
    f = np.where(mascara, 0.0, grande)
    for eixo in (0, 1):
        f = np.apply_along_axis(_distancia_1d, eixo, f)
    return np.sqrt(f)


def _borra(a, sigma):
    """Gaussiana separavel, borda por repeticao."""
    raio = int(math.ceil(3 * sigma))
    x = np.arange(-raio, raio + 1)
    nucleo = np.exp(-(x ** 2) / (2 * sigma * sigma))
    nucleo /= nucleo.sum()
    for eixo in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[eixo] = (raio, raio)
        estendido = np.pad(a, pad, mode="edge")
        a = np.apply_along_axis(
            lambda linha: np.convolve(linha, nucleo, mode="valid"), eixo, estendido)
    return a


# --- marching squares -------------------------------------------------------
x0, y0 = -MARGEM, -MARGEM
colunas = int((LARGURA + 2 * MARGEM) / PASSO) + 1
linhas = int((ALTURA + 2 * MARGEM) / PASSO) + 1

_gx = x0 + np.arange(colunas) * PASSO
_gy = y0 + np.arange(linhas) * PASSO
_X, _Y = np.meshgrid(_gx, _gy)
_ruido = (_perlin(_X / ONDA_MANCHA, _Y / ONDA_MANCHA)
          + DETALHE_MANCHA * _perlin(_X / (ONDA_MANCHA / 2.3) + 37.1,
                                     _Y / (ONDA_MANCHA / 2.3) - 19.4))
_mancha = _ruido > LIMIAR * (1 + DETALHE_MANCHA)

# distancia com sinal ate a BORDA da mancha: positiva fora, negativa dentro.
# Dentro da mancha a borda e' a celula de fora mais proxima, e vice-versa.
_ate_fora = _edt(~_mancha) * PASSO
_ate_mancha = _edt(_mancha) * PASSO
_sdf = np.where(_mancha, -_ate_fora, _ate_mancha)
grade = _borra(_sdf, BORRAO / PASSO).tolist()


def _corta(a, b, va, vb, nivel):
    t = (nivel - va) / (vb - va)
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def segmentos_do_nivel(nivel):
    """Um segmento por celula da grade, pelo caso do marching squares."""
    saida = []
    for l in range(linhas - 1):
        for c in range(colunas - 1):
            px, py = x0 + c * PASSO, y0 + l * PASSO
            cantos = [(px, py), (px + PASSO, py),
                      (px + PASSO, py + PASSO), (px, py + PASSO)]
            valores = [grade[l][c], grade[l][c + 1],
                       grade[l + 1][c + 1], grade[l + 1][c]]
            caso = sum((1 << i) for i, v in enumerate(valores) if v > nivel)
            if caso in (0, 15):
                continue
            arestas = {
                0: (cantos[0], cantos[1], valores[0], valores[1]),
                1: (cantos[1], cantos[2], valores[1], valores[2]),
                2: (cantos[2], cantos[3], valores[2], valores[3]),
                3: (cantos[3], cantos[0], valores[3], valores[0]),
            }
            tabela = {
                1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)],
                6: [(0, 2)], 7: [(3, 2)], 8: [(2, 3)], 9: [(2, 0)],
                11: [(2, 1)], 12: [(1, 3)], 13: [(1, 0)], 14: [(0, 3)],
                # ambiguos: decide pelo valor do centro da celula, que e' o
                # que evita o "X" e mantem as duas curvas separadas
                5: [(3, 0), (1, 2)], 10: [(0, 1), (2, 3)],
            }
            pares = tabela[caso]
            if caso in (5, 10):
                centro = sum(valores) / 4
                if (centro > nivel) != (caso == 5):
                    pares = [(3, 2), (1, 0)] if caso == 5 else [(0, 3), (2, 1)]
            for a, b in pares:
                saida.append((_corta(*arestas[a], nivel),
                              _corta(*arestas[b], nivel)))
    return saida


def encadeia(segmentos):
    """Costura os segmentos em polilinhas, fechando o que for laco."""
    def chave(p):
        return (round(p[0], 3), round(p[1], 3))

    por_inicio = {}
    for i, (a, _b) in enumerate(segmentos):
        por_inicio.setdefault(chave(a), []).append(i)

    # ponta de curva aberta primeiro, laco depois: comecando no meio de uma
    # curva aberta ela sairia partida em dois caminhos, e o pedaco curto
    # morreria no corte de perimetro, abrindo buraco no traco.
    chegadas = {chave(b) for _a, b in segmentos}
    ordem = sorted(range(len(segmentos)),
                   key=lambda i: chave(segmentos[i][0]) in chegadas)

    usados = set()
    polilinhas = []
    for i in ordem:
        a, b = segmentos[i]
        if i in usados:
            continue
        # o encadeamento so anda para frente; o marching squares ja orienta
        # todos os segmentos no mesmo sentido em volta da area alta
        pontos = [a, b]
        usados.add(i)
        atual = b
        while True:
            j = next((k for k in por_inicio.get(chave(atual), [])
                      if k not in usados), None)
            if j is None:
                break
            usados.add(j)
            atual = segmentos[j][1]
            pontos.append(atual)
            if chave(atual) == chave(pontos[0]):
                break
        polilinhas.append(pontos)
    return polilinhas


def redondeza(pontos):
    """4*pi*A/P^2 do laco fechado. Nivel que passa rente ao nucleo sai como
    agulha (duas retas coladas), que nao e' curva de nivel legivel: cai
    fora por aqui, e nao por ajuste do primeiro nivel, que muda de nucleo
    para nucleo."""
    fechado = pontos + [pontos[0]]
    area = abs(sum(fechado[i][0] * fechado[i + 1][1] - fechado[i + 1][0] * fechado[i][1]
                   for i in range(len(fechado) - 1))) / 2
    return 4 * math.pi * area / max(perimetro(fechado) ** 2, 1e-9)


def perimetro(pontos):
    return sum(math.dist(pontos[i], pontos[i + 1])
               for i in range(len(pontos) - 1))


def reamostra(pontos, fechada):
    """Reamostra por comprimento de arco: no' a cada PASSO_DO_NO."""
    total = perimetro(pontos)
    quantos = max(6 if fechada else 3, round(total / PASSO_DO_NO))
    alvo = total / quantos
    saida = [pontos[0]]
    acumulado = 0.0
    proximo = alvo
    for i in range(len(pontos) - 1):
        a, b = pontos[i], pontos[i + 1]
        d = math.dist(a, b)
        if d == 0:
            continue
        while acumulado + d >= proximo - 1e-9 and len(saida) <= quantos:
            t = (proximo - acumulado) / d
            saida.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            proximo += alvo
        acumulado += d
    if fechada:
        return saida[:quantos]
    if math.dist(saida[-1], pontos[-1]) > 1e-6:
        saida.append(pontos[-1])
    return saida


def para_bezier(pontos, fechada):
    """Catmull-Rom uniforme -> cubicas. Continuidade C1 em todo no': nenhuma
    mudanca brusca de direcao, que e' a exigencia do desenho."""
    n = len(pontos)

    def no(i):
        if fechada:
            return pontos[i % n]
        return pontos[min(max(i, 0), n - 1)]

    def num(v):
        return f"{v:.1f}".rstrip("0").rstrip(".")

    d = [f"M{num(pontos[0][0])} {num(pontos[0][1])}"]
    ultimo = n if fechada else n - 1
    for i in range(ultimo):
        p0, p1, p2, p3 = no(i - 1), no(i), no(i + 1), no(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{num(c1[0])} {num(c1[1])} {num(c2[0])} {num(c2[1])} "
                 f"{num(p2[0])} {num(p2[1])}")
    if fechada:
        d.append("Z")
    return "".join(d)


def dentro_do_quadro(pontos):
    """Descarta o que cai inteiro fora do viewBox: e' peso de arquivo que
    nunca aparece em nenhuma largura."""
    folga = 40
    return any(-folga <= x <= LARGURA + folga and -folga <= y <= ALTURA + folga
               for x, y in pontos)


menor = min(min(linha) for linha in grade)
maior = max(max(linha) for linha in grade)
niveis = []
n = math.floor(menor / ESPACO - FASE) + 1
while (n + FASE) * ESPACO < maior:
    niveis.append((n + FASE) * ESPACO)
    n += 1

curvas = []
for nivel in niveis:
    for pontos in encadeia(segmentos_do_nivel(nivel)):
        fechada = math.dist(pontos[0], pontos[-1]) < 1e-6
        if fechada:
            pontos = pontos[:-1]
            if len(pontos) < 6 or perimetro(pontos + [pontos[0]]) < PERIMETRO_MINIMO:
                continue
            if redondeza(pontos) < REDONDEZA_MINIMA:
                continue
        elif len(pontos) < 4 or perimetro(pontos) < PERIMETRO_MINIMO:
            continue
        if not dentro_do_quadro(pontos):
            continue
        curvas.append(para_bezier(reamostra(pontos, fechada), fechada))

corpo = "\n".join(f'  "{d}",' for d in curvas)
DESTINO.write_text(
    "// GERADO por scripts/gerar-trama-topografica.py. Nao editar a mao.\n"
    "// Isolinhas de um campo de ruido de gradiente (marching squares).\n"
    "// Ver o cabecalho do script para o porque da tecnica.\n\n"
    f"export const TRAMA_VIEWBOX = {{ largura: {LARGURA}, altura: {ALTURA} }};\n\n"
    f"export const TRAMA_CURVAS = [\n{corpo}\n] as const;\n",
    encoding="utf-8",
)
print(len(niveis), "niveis")
print(f"{len(curvas)} curvas, {DESTINO.stat().st_size / 1024:.1f} KB")
