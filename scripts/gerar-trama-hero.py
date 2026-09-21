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
grid) -> reamostragem por comprimento de arco constante -> Catmull-Rom
escrito como cubicas (C e depois S).

A semente esta fixa: o arquivo gerado e' versionado e o script so roda de novo
se a composicao for para mudar.

2026-09-16, a coluna esquerda. A primeira versao tinha o canto superior
esquerdo em feixe: curvas apertadas (espacamento mediano 39u contra 42 a 59 no
resto) e 35% do comprimento em trecho reto, contra 1 a 6%. O canto inferior
esquerdo era a regiao mais densa da trama (37u), e o meio esquerdo tinha 24%
de reta. Os tres importam mais do que parece: em 390 e em 768 o hero e' alto,
o slice ancora a esquerda e o que aparece e' SO a faixa de x 0..284 e 0..563.
Eram duas causas, e as duas foram corrigidas:

1. O traco. Douglas-Peucker apaga os pontos de trecho quase reto e deixa
   vertice longe de vertice; a quadratica pelos pontos medios entao faz reta
   longa seguida de dobra curta. Troca: reamostrar a cada PASSO unidades e
   passar Catmull-Rom, que tem curvatura continua e nunca concentra a curva
   num vertice.
2. O campo. Nos dois cantos esquerdos a encosta da bolha principal somava com
   a de uma bolha fora do quadro e o campo virava rampa: gradiente alto (curva
   apertada) e quase plano (curva reta). Nenhuma bolha existente mudou:
   entraram bolhas de correcao a' esquerda (BOLHAS_CORRECAO) que abrandam a
   encosta e lhe dao curvatura propria. Os niveis agora sao absolutos
   (NIVEL_MIN/NIVEL_MAX), para que mexer num canto nao desloque as curvas do
   resto do quadro.
Numeros de antes e depois por regiao no commit que fez isto.
"""

import math
import numpy as np

SEMENTE = 20260915
LARG, ALT = 1440.0, 900.0
GX, GY = 300, 190  # grid do marching squares
NIVEIS = 11
# Niveis alem de NIVEL_MAX, no mesmo degrau. So existem por causa do morro da
# correcao: ele passou do ultimo nivel e o seu miolo ficava um vazio de 150u,
# o dobro do maior vazio do resto. O nivel extra (1,856) desenha ali um laco
# de raio ~95u dentro do de ~173u, a mesma proporcao do par de lacos da
# direita. Em nenhum outro ponto o campo chega a esse valor (a partir de
# x = 560 o maximo e' 1,75), entao ele nao acrescenta curva em outro lugar.
NIVEIS_ACIMA = 1
# Faixa de valor dos niveis. Eram o min e o max do campo da primeira versao;
# ficam fixos para que o nivel k seja o mesmo valor mesmo com o campo mudando
# num canto.
NIVEL_MIN, NIVEL_MAX = 1.0034268997363474, 1.8193589037942817
PERIMETRO_MIN = 150.0  # unidades de viewBox; abaixo disto vira cisco
PASSO = 22.0  # arco entre pontos do Catmull-Rom
SAIDA = "src/components/trama-hero-geometria.ts"

# --- campo -------------------------------------------------------------
# Bolhas, em fracao da largura (cy em fracao da altura). As duas listas abaixo
# sao as da primeira versao, sem mudanca; a separacao so' deixa claro quais
# encostas desciam para a coluna esquerda.
BOLHAS_CENTRO_DIREITA = [
    #  cx,    cy,   rx,   ry,  giro,  peso
    (0.78, 0.62, 0.26, 0.34, -0.50, 0.85),
    (0.50, 0.92, 0.42, 0.28, 0.15, 0.70),
    (1.16, 0.16, 0.52, 0.44, -0.30, 0.90),
    (0.42, -0.26, 0.60, 0.38, 0.05, 0.75),
    (1.05, 1.18, 0.40, 0.46, 0.80, 0.65),
]
BOLHAS_ESQUERDA = [
    (0.22, 0.30, 0.30, 0.42, 0.35, 1.00),
    (-0.18, 0.74, 0.46, 0.52, 0.60, 0.95),
]
# Correcao da coluna esquerda (2026-09-16). Tres bolhas largas (raio de 0,18 a
# 0,30 da largura, na escala das bolhas originais), com o centro na borda
# esquerda ou fora dela. A de cima levanta o fundo do vale do canto superior e
# transforma a rampa em encosta de morro: as curvas do canto deixam de ser
# riscos paralelos e passam a contornar o morro. A do meio, negativa, afasta o
# vale do meio da borda. A de baixo abranda a encosta do canto inferior, que
# era a regiao mais densa da trama.
# Os valores sairam de uma busca (evolucao diferencial) contra metricas por
# regiao medidas no traco final: espacamento mediano e p10 entre curvas
# vizinhas, fracao de janelas de 140u com flecha abaixo de 2u (trecho reto) e
# uma nota continua de retidao, curvatura em janela de 60u, inflexoes por
# comprimento, densidade e maior vazio; a metade direita da trama foi a
# referencia do "certo". Raios pequenos foram proibidos: com bolha de raio
# 0,10 a busca achava ondulacao curta e nervosa, suave mas em outra escala.
# A partir de x = 720 as curvas se movem no maximo alguns decimos de degrau.
BOLHAS_CORRECAO = [
    (-0.029, 0.299, 0.181, 0.302, 0.681, 0.426),
    (0.044, 0.571, 0.197, 0.214, -0.315, -0.564),
    (-0.006, 0.657, 0.277, 0.298, -1.57, 0.193),
]
ONDAS = (
    (2.1, 0.085, 0.7, 1.9),
    (3.3, 0.045, 2.4, 0.3),
    (1.4, 0.060, 5.1, 3.7),
)

xs = np.linspace(0.0, LARG, GX)
ys = np.linspace(0.0, ALT, GY)


def campo(bolhas, ondas=ONDAS):
    # coordenadas normalizadas pela largura nos dois eixos: bolha nao deforma
    X, Y = np.meshgrid(xs, ys)
    u = X / LARG
    v = Y / LARG
    f = np.zeros_like(X)
    for cx, cy, rx, ry, giro, peso in bolhas:
        du = u - cx
        dv = v - cy * (ALT / LARG)
        c, s = math.cos(giro), math.sin(giro)
        a = (du * c + dv * s) / rx
        b = (-du * s + dv * c) / ry
        f += peso * np.exp(-(a * a + b * b))
    # ondulacao de baixa frequencia: tira a regularidade concentrica das bolhas
    for fr, amp, fase_u, fase_v in ondas:
        f += amp * np.sin(fr * math.tau * u + fase_u) * np.cos(
            fr * 0.78 * math.tau * v + fase_v
        )
    return f


# --- marching squares --------------------------------------------------


def interp(p1, p2, v1, v2, nivel):
    t = 0.5 if v2 == v1 else (nivel - v1) / (v2 - v1)
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))


def segmentos(f, nivel):
    """Segmentos da isolinha, celula a celula (caso ambiguo resolvido pela media)."""
    saida = []
    for j in range(GY - 1):
        for i in range(GX - 1):
            v00 = f[j, i]
            v10 = f[j, i + 1]
            v11 = f[j + 1, i + 1]
            v01 = f[j + 1, i]
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


def reamostrar(pts, fechada, passo=PASSO):
    """Pontos a arco constante. E' o que impede vertice longe de vertice, que
    era a origem da reta seguida de dobra."""
    if fechada:
        pts = pts + [pts[0]]
    acum = [0.0]
    for a, b in zip(pts, pts[1:]):
        acum.append(acum[-1] + math.dist(a, b))
    total = acum[-1]
    n = max(4, round(total / passo))
    alvo = [total * k / n for k in range(n if fechada else n + 1)]
    out, j = [], 0
    for s in alvo:
        while j < len(acum) - 2 and acum[j + 1] < s:
            j += 1
        seg = acum[j + 1] - acum[j]
        t = 0.0 if seg == 0 else (s - acum[j]) / seg
        a, b = pts[j], pts[j + 1]
        out.append((a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])))
    return out


def caminho(pts, fechada):
    """Catmull-Rom uniforme como cubicas. O segundo controle de um trecho e o
    primeiro do seguinte sao simetricos no ponto, entao do segundo trecho em
    diante o controle 1 e' implicito e o comando e' S."""
    f = lambda n: f"{n:.1f}".rstrip("0").rstrip(".")
    n = len(pts)
    if fechada:
        P = lambda i: pts[i % n]
        faixa = range(n)
    else:
        P = lambda i: pts[min(max(i, 0), n - 1)]
        faixa = range(n - 1)
    d = [f"M{f(pts[0][0])} {f(pts[0][1])}"]
    for i in faixa:
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        if i == faixa[0]:
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            d.append(
                f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
            )
        else:
            d.append(f"S{f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    if fechada:
        d.append("Z")
    return "".join(d)


def curvas(f):
    niveis = [
        NIVEL_MIN + (NIVEL_MAX - NIVEL_MIN) * (k + 0.5) / NIVEIS
        for k in range(NIVEIS + NIVEIS_ACIMA)
    ]
    saida = []
    for nivel in niveis:
        for pts, fechada in costurar(segmentos(f, nivel)):
            if perimetro(pts) < PERIMETRO_MIN:
                continue
            s = reamostrar(chaikin(pts, fechada), fechada)
            if len(s) < 4:
                continue
            saida.append(caminho(s, fechada))
    return saida


def escrever(lista):
    texto = "\n".join(f'  "{c}",' for c in lista)
    conteudo = f'''/**
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
        fh.write(conteudo)
    return len(conteudo)


if __name__ == "__main__":
    lista = curvas(campo(BOLHAS_CENTRO_DIREITA + BOLHAS_ESQUERDA + BOLHAS_CORRECAO))
    tamanho = escrever(lista)
    print(f"{len(lista)} curvas, {tamanho / 1024:.1f} KB -> {SAIDA}")
