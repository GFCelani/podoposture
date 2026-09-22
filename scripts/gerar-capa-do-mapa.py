"""
Gera public/img/mapa-capa.svg: a capa que fica no lugar do mapa do Google ate
a pessoa pedir o mapa.

O iframe do Google Maps carregava sozinho e, com ele, os cookies do Google.
Agora ele so e' montado com um clique (`components/mapa-sob-demanda.tsx`), e o
disco precisa mostrar alguma coisa antes disso. Em vez de um cinza vazio, a
capa e' um desenho de linha do mesmo recorte que o embed mostra em z=14: a
orla de Copacabana e Ipanema, a Lagoa e as vias principais, com o pino na
clinica. Assim a pessoa ja situa o endereco sem chamar o Google.

Os dados vem do OpenStreetMap (Overpass), licenca ODbL: o credito
"Desenho © OpenStreetMap", com link para a pagina de direitos do OSM, vai no
rodape do disco enquanto a capa estiver na tela. As cores sao os tokens de
`globals.css` escritos em hex, porque o SVG e' servido como arquivo (fica em
cache e nao pesa no HTML) e ali nao ha variavel CSS.

O arquivo gerado e' versionado; o script so roda de novo se o recorte mudar.
Uso: python scripts/gerar-capa-do-mapa.py
"""

import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

# O mesmo ponto de `COORDENADAS` em src/lib/site.ts.
CENTRO = (-22.9711, -43.1863)
# Meia largura do recorte, em km. 3,2 km para cada lado cobre o arco de
# Copacabana, o Arpoador, o comeco de Ipanema e a metade leste da Lagoa.
MEIO_KM = 3.2
LADO = 600  # viewBox quadrado; o disco recorta o que sobra nos cantos

PAPEL = "#F5EFE6"  # --color-surface
MAR = "#E4EEF2"  # surface com um fio de accent, para a agua ler como agua
ORLA = "#0B6A9C"  # --color-accent
VIA = "#DED2C0"  # --color-rule
VIA_FORTE = "#C9B89F"
PINO = "#062c42"  # --color-accent-deep

KM_LAT = 110.57
KM_LON = 111.32 * math.cos(math.radians(CENTRO[0]))
D_LAT = MEIO_KM / KM_LAT
D_LON = MEIO_KM / KM_LON
SUL, NORTE = CENTRO[0] - D_LAT, CENTRO[0] + D_LAT
OESTE, LESTE = CENTRO[1] - D_LON, CENTRO[1] + D_LON

CONSULTA = f"""
[out:json][timeout:60];
(
  way["natural"="coastline"]({SUL},{OESTE},{NORTE},{LESTE});
  nwr["natural"="water"]["name"~"Rodrigo de Freitas"]({SUL},{OESTE},{NORTE},{LESTE});
  way["highway"~"^(trunk|primary|secondary)$"]({SUL},{OESTE},{NORTE},{LESTE});
);
out geom;
"""


def projetar(lat, lon):
    x = (lon - OESTE) / (LESTE - OESTE) * LADO
    y = (NORTE - lat) / (NORTE - SUL) * LADO
    return x, y


def simplificar(pts, tol=1.2):
    """Douglas-Peucker: em 600 px, detalhe abaixo de ~1 px e' so peso."""
    if len(pts) < 3:
        return pts
    if pts[0] == pts[-1]:
        # Anel: com as pontas iguais a reta de referencia some; corta ao meio.
        meio = len(pts) // 2
        return simplificar(pts[: meio + 1], tol)[:-1] + simplificar(pts[meio:], tol)
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norma = math.hypot(dx, dy) or 1e-9
    maior, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / norma
        if d > maior:
            maior, idx = d, i
    if maior <= tol:
        return [pts[0], pts[-1]]
    return simplificar(pts[: idx + 1], tol)[:-1] + simplificar(pts[idx:], tol)


def caminho(pts, fechado=False):
    corpo = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f"M{corpo}{'Z' if fechado else ''}"


def encadear(trechos):
    """A orla vem em varios `way` que se tocam pela ponta; junta em cadeias."""
    cadeias = [list(t) for t in trechos]
    juntou = True
    while juntou:
        juntou = False
        for i, a in enumerate(cadeias):
            for j, b in enumerate(cadeias):
                if i != j and a[-1] == b[0]:
                    cadeias[i] = a + b[1:]
                    del cadeias[j]
                    juntou = True
                    break
            if juntou:
                break
    return cadeias


# Moldura folgada: a orla e' cortada nela e o mar e' fechado pelo contorno.
# O SVG recorta no viewBox, entao a folga nao aparece.
M0, M1 = -150.0, LADO + 150.0


def na_moldura(x, y):
    return M0 <= x <= M1 and M0 <= y <= M1


def posicao_no_contorno(x, y):
    """Distancia ao longo da moldura, no sentido horario a partir do canto superior esquerdo."""
    lado = M1 - M0
    x, y = min(max(x, M0), M1), min(max(y, M0), M1)
    d = {abs(y - M0): 0, abs(x - M1): 1, abs(y - M1): 2, abs(x - M0): 3}
    borda = d[min(d)]
    return [x - M0, lado + y - M0, 2 * lado + M1 - x, 3 * lado + M1 - y][borda]


def cantos_entre(t0, t1):
    """Cantos da moldura percorridos de t0 a t1 no sentido horario."""
    lado = M1 - M0
    cantos = [(lado, (M1, M0)), (2 * lado, (M1, M1)), (3 * lado, (M0, M1)), (4 * lado, (M0, M0))]
    if t1 < t0:
        t1 += 4 * lado
    saida = []
    for volta in (0, 4 * lado):
        for t, p in cantos:
            if t0 < t + volta < t1:
                saida.append(p)
    return saida


def mar(cadeia):
    """Poligono do mar a partir de uma cadeia aberta da orla.

    No OSM a terra fica a esquerda do sentido da linha, entao o mar fica a
    direita; na tela (y para baixo) isso fecha pelo contorno em sentido horario,
    da saida da cadeia ate a entrada.
    """
    dentro = [p for p in cadeia if na_moldura(*p)]
    if len(dentro) < 2:
        return None
    t_fim, t_ini = posicao_no_contorno(*dentro[-1]), posicao_no_contorno(*dentro[0])
    return dentro + cantos_entre(t_fim, t_ini)


def baixar():
    dados = urllib.parse.urlencode({"data": CONSULTA}).encode()
    pedido = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=dados,
        headers={"User-Agent": "podoposture-capa-do-mapa/1.0"},
    )
    with urllib.request.urlopen(pedido, timeout=90) as r:
        return json.load(r)["elements"]


def main():
    trechos, lagoa, vias, fortes = [], [], [], []
    for el in baixar():
        tags = el.get("tags", {})
        if el["type"] == "relation":
            # A Lagoa e' multipoligono: o contorno vem em pedacos "outer".
            pedacos = [
                [projetar(p["lat"], p["lon"]) for p in m["geometry"]]
                for m in el.get("members", [])
                if m.get("role") == "outer" and m.get("geometry")
            ]
            lagoa += [caminho(simplificar(a), fechado=True) for a in encadear(pedacos)]
            continue
        bruto = [projetar(p["lat"], p["lon"]) for p in el.get("geometry", [])]
        if tags.get("natural") == "coastline":
            # Encadeia antes de simplificar: as pontas precisam bater exatas.
            trechos.append(bruto)
            continue
        pts = simplificar(bruto)
        if len(pts) < 2:
            continue
        if tags.get("highway") in ("trunk", "primary"):
            fortes.append(caminho(pts))
        else:
            vias.append(caminho(pts))

    orla, aguas, ilhas = [], [], []
    for cadeia in encadear(trechos):
        pts = simplificar(cadeia)
        if cadeia[0] == cadeia[-1]:
            # Anel fechado de orla e' ilha: terra pintada por cima do mar.
            ilhas.append(caminho(pts, fechado=True))
            orla.append(caminho(pts, fechado=True))
            continue
        orla.append(caminho(pts))
        poligono = mar(pts)
        if poligono:
            aguas.append(caminho(poligono, fechado=True))

    cx, cy = projetar(*CENTRO)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LADO} {LADO}" width="{LADO}" height="{LADO}">
<rect width="{LADO}" height="{LADO}" fill="{PAPEL}"/>
<g fill="{MAR}">{"".join(f'<path d="{d}"/>' for d in aguas)}</g>
<g fill="{PAPEL}">{"".join(f'<path d="{d}"/>' for d in ilhas)}</g>
<g fill="{MAR}" stroke="{ORLA}" stroke-width="1.2" stroke-opacity=".55">{"".join(f'<path d="{d}"/>' for d in lagoa)}</g>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<g stroke="{VIA}" stroke-width="1.4">{"".join(f'<path d="{d}"/>' for d in vias)}</g>
<g stroke="{VIA_FORTE}" stroke-width="2.2">{"".join(f'<path d="{d}"/>' for d in fortes)}</g>
<g stroke="{ORLA}" stroke-width="2.4">{"".join(f'<path d="{d}"/>' for d in orla)}</g>
</g>
<circle cx="{cx:.1f}" cy="{cy:.1f}" r="22" fill="{ORLA}" fill-opacity=".12"/>
<path d="M{cx:.1f} {cy:.1f}c-2.6-6.4-10-11.2-10-18.6a10 10 0 0 1 20 0c0 7.4-7.4 12.2-10 18.6z" fill="{PINO}"/>
<circle cx="{cx:.1f}" cy="{cy - 18.6:.1f}" r="3.6" fill="{PAPEL}"/>
</svg>
"""
    destino = Path(__file__).resolve().parent.parent / "public" / "img" / "mapa-capa.svg"
    destino.write_text(svg, encoding="utf-8")
    print(f"{destino}: {len(svg) / 1024:.1f} KB, orla {len(orla)}, lagoa {len(lagoa)}, vias {len(vias) + len(fortes)}")


if __name__ == "__main__":
    main()
