# -*- coding: utf-8 -*-
"""Os doze pontos do mapa de dor: posição no viewBox, rota e copy verbatim
da cliente. Os da coluna de perfil saem da geometria (desenho.niveis).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import desenho
from geometria import borda, curva_da_coluna
EIXO_FRONTAL = 110.5

def pontos_do_perfil():
    """Os seis do perfil, com os da coluna derivados da geometria nova."""
    import numpy as np

    spline, _, _ = curva_da_coluna()
    vs = desenho.niveis()

    ys = np.linspace(115, 175, 601)
    y_apice = float(ys[int(np.argmin(spline(ys)))])
    x_apice = float(spline(y_apice))

    l1, l2 = vs[19], vs[20]  # L1 e L2
    y_lombar = (l1["base"] + l2["topo"]) / 2
    l5 = vs[-1]
    y_disco_l5s1 = l5["base"] + desenho.VAO_SACRO / 2

    return [
        dict(
            chave="zumbido",
            rotulo="zumbido",
            x=52, y=64, lado="dir",
            rota="/tratamento-do-zumbido",
            aria="Zumbido, vista de perfil. Abrir a página Tratamento do Zumbido",
            onde="orelha",
            dur=4.2, fase=0.7,
        ),
        dict(
            chave="postura",
            rotulo="má postura",
            # no ápice da cifose, entre o corpo vertebral e a ponta dos
            # processos: é o alto da corcunda, que é o que "má postura" diz
            # quando se olha alguém de lado
            x=round(x_apice - 4.2, 1), y=round(y_apice, 1), lado="esq",
            rota="/posturologia",
            aria="Má postura, vista de perfil. Abrir a página Posturologia",
            onde="ápice da curvatura dorsal",
            dur=5.2, fase=2.2,
        ),
        dict(
            chave="lombar",
            rotulo="dor lombar",
            x=round(float(spline(y_lombar)) - 14.0, 1), y=round(y_lombar, 1), lado="esq",
            rota="/dor-lombar-crônica",
            aria="Dor lombar, vista de perfil. Abrir a página Dor Lombar Crônica",
            onde="massa paravertebral, nível L1-L2",
            dur=4.0, fase=1.1,
        ),
        dict(
            chave="hernia",
            rotulo=("hérnia de", "disco"),
            x=round(float(spline(y_disco_l5s1)), 1), y=round(y_disco_l5s1, 1), lado="esq",
            rota="/flexo-distração",
            aria="Hérnia de disco, vista de perfil. Abrir a página Flexo-distração",
            onde="disco L5-S1",
            dur=4.6, fase=3.3,
        ),
        dict(
            chave="ciatica",
            rotulo="dor ciática",
            x=40, y=340, lado="esq",
            rota="/flexo-distração",
            aria="Dor ciática, vista de perfil. Abrir a página Flexo-distração",
            onde="nádega e face posterior da coxa",
            dur=5.0, fase=0.4,
        ),
        dict(
            chave="fascite",
            rotulo=("fascite", "plantar"),
            x=42, y=527, lado="esq",
            rota="/palmilhas-personalizadas",
            aria="Fascite plantar, vista de perfil. Abrir a página Palmilhas Personalizadas",
            onde="calcâneo, inserção da fáscia",
            dur=4.3, fase=2.6,
        ),
    ]


FRONTAL = [
    dict(
        chave="cefaleia",
        rotulo=("cefaleia", "tensional"),
        x=126, y=43, lado="dir",
        rota="/tratamento-da-dtm",
        aria="Cefaleia tensional, vista frontal. Abrir a página Tratamento da DTM, cefaleias e dor orofacial",
        onde="têmpora",
        dur=4.4, fase=0.0,
    ),
    dict(
        chave="dtm",
        rotulo="DTM",
        x=95, y=73, lado="esq",
        rota="/tratamento-da-dtm",
        aria="DTM, disfunção da articulação temporomandibular, vista frontal. Abrir a página Tratamento da DTM",
        onde="ATM, à frente da orelha",
        dur=3.8, fase=1.6,
    ),
    dict(
        chave="postura",
        rotulo="má postura",
        # de frente a coluna é reta sobre o prumo, e é o prumo que a
        # posturologia lê: o ponto vai SOBRE o eixo, na torácica média
        x=EIXO_FRONTAL, y=185, lado="dir",
        rota="/posturologia",
        aria="Má postura, vista frontal. Abrir a página Posturologia",
        onde="eixo do corpo, torácica média",
        dur=5.2, fase=4.0,
    ),
    dict(
        chave="lombar",
        rotulo="dor lombar",
        x=125, y=228, lado="dir",
        rota="/dor-lombar-crônica",
        aria="Dor lombar, vista frontal. Abrir a página Dor Lombar Crônica",
        onde="massa paravertebral, nível L1",
        dur=4.0, fase=2.9,
    ),
    dict(
        chave="hernia",
        rotulo=("hérnia de", "disco"),
        x=EIXO_FRONTAL, y=272, lado="dir",
        rota="/flexo-distração",
        aria="Hérnia de disco, vista frontal. Abrir a página Flexo-distração",
        onde="disco L5-S1",
        dur=4.6, fase=1.4,
    ),
    dict(
        chave="morton",
        rotulo=("neuroma de", "Morton"),
        x=139, y=525, lado="dir",
        rota="/palmilhas-personalizadas",
        aria="Neuroma de Morton, vista frontal. Abrir a página Palmilhas Personalizadas",
        onde="antepé, cabeças dos metatarsos",
        dur=4.9, fase=2.9,
    ),
]


PERFIL = pontos_do_perfil()


# Guarda de sanidade: abaixo desta distância (unidades do viewBox) dois alvos
# se sobreporiam mesmo no piso de 26px, na figura de 405px do telefone.
FOLGA_MINIMA = 36.0

# Folga entre o fim do fio e a tinta da figura: a placa do rótulo começa
# depois do contorno, medido naquele y.
FOLGA_DA_PLACA = 5.0


def confere_folga(vista, pontos):
    for i, a in enumerate(pontos):
        for b in pontos[i + 1:]:
            d = ((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2) ** 0.5
            assert d >= FOLGA_MINIMA, (
                "%s: %s e %s a %.1f unidades, abaixo das %.0f que o alvo de "
                "toque precisa" % (vista, a["chave"], b["chave"], d, FOLGA_MINIMA)
            )


def vizinho_mais_proximo(p, pontos):
    """Distância, em unidades do viewBox, até o ponto mais próximo da figura."""
    return min(
        ((p["x"] - q["x"]) ** 2 + (p["y"] - q["y"]) ** 2) ** 0.5
        for q in pontos
        if q is not p
    )


def fio_do_ponto(vista, p):
    """Comprimento do fio, em unidades do viewBox, medido no contorno."""
    x_borda = borda(vista, p["y"], p["lado"])
    if p["lado"] == "dir":
        return max(11.0, x_borda + FOLGA_DA_PLACA - p["x"])
    return max(11.0, p["x"] - (x_borda - FOLGA_DA_PLACA))
