# -*- coding: utf-8 -*-
"""Geometria das duas silhuetas, lida dos mesmos arquivos que o site usa.

Serve para o gerador nao adivinhar nada: o comprimento do fio de cada rotulo
sai do contorno medido naquele y, e a curva sagital da coluna sai da mesma
tabela que `figura-corpo-geometria.ts` interpola.

Nada aqui desenha. So mede.
"""
import io
import os
import re

COMPONENTES = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "components"
)


def _const(arquivo, nome):
    """O valor de uma constante string do TS, com as partes concatenadas."""
    txt = io.open(os.path.join(COMPONENTES, arquivo), encoding="utf-8").read()
    i = txt.index("export const %s =" % nome)
    j = txt.index(";", i)
    return "".join(re.findall(r'"([^"]*)"', txt[i:j]))


def _lista_de_numeros(arquivo, nome):
    txt = io.open(os.path.join(COMPONENTES, arquivo), encoding="utf-8").read()
    i = txt.index("export const %s" % nome)
    j = txt.index("];", i)
    return [float(v) for v in re.findall(r"-?\d+\.?\d*", txt[txt.index("[", i) : j])]


def achata(d, passos=32):
    """O path (so M/C/L/Z) virando poligono, para cortar por scanline."""
    toks = d.replace(",", " ").split()
    pts, i, cur, inicio = [], 0, None, None
    while i < len(toks):
        t = toks[i]
        if t == "M":
            cur = (float(toks[i + 1]), float(toks[i + 2]))
            inicio = cur
            pts.append(cur)
            i += 3
        elif t == "C":
            p1 = (float(toks[i + 1]), float(toks[i + 2]))
            p2 = (float(toks[i + 3]), float(toks[i + 4]))
            p3 = (float(toks[i + 5]), float(toks[i + 6]))
            p0 = cur
            for k in range(1, passos + 1):
                u = k / passos
                v = 1 - u
                pts.append(
                    (
                        v ** 3 * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u ** 3 * p3[0],
                        v ** 3 * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u ** 3 * p3[1],
                    )
                )
            cur = p3
            i += 7
        elif t == "L":
            cur = (float(toks[i + 1]), float(toks[i + 2]))
            pts.append(cur)
            i += 3
        elif t in ("Z", "z"):
            pts.append(inicio)
            i += 1
        else:
            raise ValueError("comando de path nao tratado: " + t)
    return pts


def cortes(poligono, y):
    """Os x onde a horizontal em y atravessa o contorno, ordenados."""
    xs = []
    for (x1, y1), (x2, y2) in zip(poligono, poligono[1:]):
        if y1 == y2:
            continue
        if (y1 - y) * (y2 - y) < 0 or y1 == y:
            u = (y - y1) / (y2 - y1)
            if 0 <= u <= 1:
                xs.append(x1 + u * (x2 - x1))
    return sorted(xs)


SILHUETAS = {
    "frontal": achata(_const("silhueta-corpo-path.ts", "SILHUETA_D")),
    "perfil": achata(_const("silhueta-perfil-path.ts", "SILHUETA_PERFIL_D")),
}


def borda(vista, y, lado):
    """x do contorno MAIS EXTERNO da figura em y, do lado pedido.

    E' o que decide onde a placa de um rotulo pode comecar: o fio atravessa o
    desenho (como as linhas de referencia do hero ja atravessam) e a placa so
    comeca depois da tinta.
    """
    xs = cortes(SILHUETAS[vista], y)
    if not xs:
        raise ValueError("nenhum corte em y=%s da vista %s" % (y, vista))
    return xs[0] if lado == "esq" else xs[-1]


# ---------------------------------------------------------------------------
# Curva sagital da coluna, agora lisa.
#
# COLUNA_PERFIL_X e' uma amostra por unidade de y, medida na mascara da
# referencia. O site interpola essa tabela LINEARMENTE, e a tangente de uma
# poligonal e' descontinua: era dai que vinha o giro irregular de vertebra
# para vertebra. Aqui a mesma medida entra num spline suavizado, que da x(y)
# e x'(y) continuos. A medida nao e' abandonada: o spline passa a menos de
# 0,2u dela (conferido no gerador).
# ---------------------------------------------------------------------------

COLUNA_Y0 = 80
COLUNA_X = _lista_de_numeros("silhueta-perfil-path.ts", "COLUNA_PERFIL_X")


def curva_da_coluna(suavidade=6.0):
    """(x(y), x'(y)) lisos, mais o erro maximo contra a medida."""
    import numpy as np
    from scipy.interpolate import UnivariateSpline

    ys = np.arange(COLUNA_Y0, COLUNA_Y0 + len(COLUNA_X), dtype=float)
    xs = np.array(COLUNA_X, dtype=float)
    spline = UnivariateSpline(ys, xs, s=suavidade, k=4)
    erro = float(np.max(np.abs(spline(ys) - xs)))
    return spline, spline.derivative(), erro
