# -*- coding: utf-8 -*-
"""Geometria do mapa de dor do hero: a COLUNA das duas vistas e a CADEIA.

Tudo em coordenadas absolutas do viewBox, calculado aqui: o SVG que sai nao
tem transform aninhado, entao cada vertebra e um caminho fechado e o
navegador nao empilha matriz nenhuma.

=============================================================================
COLUNA DE PERFIL - o que estava errado e o que mudou
=============================================================================

1. A CURVA. `figura-corpo-geometria.ts` interpola COLUNA_PERFIL_X
   LINEARMENTE e tira o giro de cada vertebra da diferenca finita dessa
   poligonal. A tangente de uma poligonal e descontinua: o giro pulava de
   vertebra para vertebra e a curvatura lia como irregular. Agora a mesma
   medida entra num spline suavizado (k=4, s=6): x(y) e x'(y) continuos, erro
   maximo de 0,49u contra a medida. A curvatura sai da medicao, nao de
   invencao; o que sai e o serrote.

2. AS REGIOES. Eram tres blocos com VAO entre eles (118->122, 220->225) e salto
   de tamanho na fronteira (altura 1,9 -> 4,2, ou seja +121% de um nivel para o
   seguinte). Era esse salto que fazia a transicao nao convencer. Agora nao ha
   fronteira na geometria: os 24 niveis saem de UMA rampa continua de passo
   (4,4u em C1 a 11,0u em L5), somando os mesmos 185u de C1 a L5. Onde a
   rampa poe C7 (124,8) e T12 (220,7) e consequencia, nao decisao - e cai
   praticamente onde estava.

3. O GLIFO. Retangulo arredondado sozinho le como tijolo. De perfil, o que faz
   uma vertebra ser uma vertebra e o PROCESSO ESPINHOSO apontando para tras, e
   e ele que da o serrote do dorso. Cada nivel agora e corpo + processo, com
   o angulo e o comprimento do processo variando como variam de verdade: quase
   horizontal na cervical, caindo a 55 graus na toracica media, voltando a
   horizontal na lombar.

4. OS VAOS. Disco era um traco no meio do vao, e o vao em volta ficava vazio:
   dai a leitura de pecas empilhadas. Agora o disco e a peca que FECHA o vao,
   um quadrilatero entre a face de baixo de uma vertebra e a de cima da
   seguinte. A coluna passa a ser continua, e as faces ficam paralelas porque
   as duas saem da mesma tangente.

5. O SACRO. Era um retangulo com giro fixo de -29 graus. Agora sao cinco segmentos
   fundidos, em cunha, saindo da face inferior de L5 com a inclinacao lombossacra, afina ate a
   ponta e termina no coccix. A curva medida nao cobre o sacro (a tabela vai
   ate y=299 e foi medida na coluna), entao aqui a inclinacao e anatomica e
   explicita, nao extrapolada.

6. O MOVIMENTO. Eram 24 animacoes defasadas, uma sobreposicao em papel
   acendendo por vertebra: lido de perto, pisca. Agora e UMA faixa de luz que
   desce a coluna, feita de mascara com traco tracejado sobre a propria curva
   (a mesma tecnica do traco da marcha do hero) e desfocada para a borda nao
   cortar seco. Uma propriedade animada, continua, 11s por ciclo. O grupo
   iluminado nasce em opacity 0: com prefers-reduced-motion ele nao existe e a
   coluna fica inteira e parada.
"""
import math

from geometria import curva_da_coluna

AZUL = "var(--color-accent-light)"
PAPEL = "var(--color-paper)"

N_VERTEBRAS = 24
Y_TOPO = 88.0  # face de cima de C1, logo abaixo da base do cranio (78)
Y_BASE = 273.0  # face de baixo de L5


def _rampa(t, ancoras):
    """Interpolacao linear por partes sobre ancoras [(t, valor), ...]."""
    for (t0, v0), (t1, v1) in zip(ancoras, ancoras[1:]):
        if t <= t1:
            f = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return v0 + (v1 - v0) * max(0.0, min(1.0, f))
    return ancoras[-1][1]


# Fracao do passo que e corpo vertebral; o resto e disco. Disco cervical e
# lombar e proporcionalmente mais alto que o toracico, e e isso que a rampa diz.
FRACAO_CORPO = [(0.0, 0.72), (0.30, 0.77), (0.55, 0.80), (0.78, 0.77), (1.0, 0.71)]

# Profundidade antero-posterior do corpo. Cresce de C1 a L5 sem degrau.
def _largura(t):
    return 6.0 + 10.4 * (t ** 1.25)


# Processo espinhoso: comprimento e angulo com a horizontal (negativo = para
# baixo). O toracico medio e o mais longo e o mais inclinado; o lombar volta
# a horizontal. E o que da o desenho do dorso.
COMPRIMENTO_PROCESSO = [
    (0.0, 2.4), (0.26, 3.6), (0.45, 6.4), (0.62, 6.6), (0.78, 5.8), (1.0, 5.0)
]
ANGULO_PROCESSO = [
    (0.0, -18), (0.26, -30), (0.42, -52), (0.58, -55), (0.72, -42), (0.83, -14), (1.0, -6)
]


def _passo(i):
    """Passo (corpo + disco) do nivel i. Rampa linear, sem fronteira."""
    return 4.4 + (11.0 - 4.4) * i / (N_VERTEBRAS - 1)


def _monta_niveis():
    """Os 24 niveis ja posicionados na curva, com corpo, processo e disco."""
    spline, derivada, _ = curva_da_coluna()

    passos = [_passo(i) for i in range(N_VERTEBRAS)]
    escala = (Y_BASE - Y_TOPO) / sum(passos)
    passos = [p * escala for p in passos]

    saida, topo = [], Y_TOPO
    for i, passo in enumerate(passos):
        t = i / (N_VERTEBRAS - 1)
        h = passo * _rampa(t, FRACAO_CORPO)
        cy = topo + h / 2
        cx = float(spline(cy))
        ang = math.atan(float(derivada(cy)))  # tangente, medida da vertical
        saida.append(
            dict(
                i=i,
                t=t,
                cx=cx,
                cy=cy,
                h=h,
                w=_largura(t),
                ang=ang,
                # a face de baixo do corpo e a face de cima do proximo
                base=topo + h,
                topo=topo,
                proc_len=_rampa(t, COMPRIMENTO_PROCESSO),
                proc_ang=math.radians(_rampa(t, ANGULO_PROCESSO)),
                vao_abaixo=passo - h,
            )
        )
        topo += passo
    return saida


_CACHE = []


def niveis():
    if not _CACHE:
        _CACHE.extend(_monta_niveis())
    return _CACHE


# O disco L5-S1 existe, e e o mais herniado dos vinte e quatro: o sacro nao
# nasce colado em L5, nasce depois deste vao, e o vao e preenchido pelo disco
# como todos os outros. O ponto clicavel de "hernia de disco" mora aqui.
VAO_SACRO = niveis()[-1]["vao_abaixo"]


def _eixos(ang):
    """(u, n): u desce ao longo da coluna, n aponta para a frente (+x)."""
    return (math.sin(ang), math.cos(ang)), (math.cos(ang), -math.sin(ang))


def _p(c, u, n, du, dn):
    return (c[0] + u[0] * du + n[0] * dn, c[1] + u[1] * du + n[1] * dn)


def _d(pontos, fechar=True):
    partes = ["M %.2f %.2f" % pontos[0]]
    partes += ["L %.2f %.2f" % p for p in pontos[1:]]
    if fechar:
        partes.append("Z")
    return " ".join(partes)


def _corpo_d(v, raio=0.9):
    """Corpo vertebral: retangulo de cantos arredondados, em absoluto.

    Os cantos saem em quadratica sobre as proprias arestas, entao o glifo
    continua geometrico (nada de arco anatomico) e nao precisa de transform.
    """
    c = (v["cx"], v["cy"])
    u, n = _eixos(v["ang"])
    meia_h, meia_w = v["h"] / 2, v["w"] / 2
    r = min(raio, meia_h * 0.7, meia_w * 0.35)
    # quatro cantos: (du, dn)
    cantos = [(-meia_h, -meia_w), (-meia_h, meia_w), (meia_h, meia_w), (meia_h, -meia_w)]
    partes = []
    for k in range(4):
        a = cantos[k]
        b = cantos[(k + 1) % 4]
        # ponto de entrada e de saida do canto, recuados de r sobre cada aresta
        anterior = cantos[(k - 1) % 4]
        def recua(de, para, quanto):
            vx, vy = para[0] - de[0], para[1] - de[1]
            comp = math.hypot(vx, vy)
            return (de[0] + vx / comp * quanto, de[1] + vy / comp * quanto)

        entra = recua(a, anterior, r)
        sai = recua(a, b, r)
        pe = _p(c, u, n, *entra)
        ps = _p(c, u, n, *sai)
        pv = _p(c, u, n, *a)
        if k == 0:
            partes.append("M %.2f %.2f" % pe)
        else:
            partes.append("L %.2f %.2f" % pe)
        partes.append("Q %.2f %.2f %.2f %.2f" % (pv[0], pv[1], ps[0], ps[1]))
    partes.append("Z")
    return " ".join(partes)


def _processo_d(v):
    """Processo espinhoso: cunha saindo da face posterior, para tras e para baixo.

    Nasce com a altura de metade do corpo e termina numa ponta arredondada.
    O angulo e dado no quadro do corpo, entao ele acompanha o giro da vertebra.
    """
    c = (v["cx"], v["cy"])
    u, n = _eixos(v["ang"])
    meia_h, meia_w = v["h"] / 2, v["w"] / 2
    # base do processo, na face de tras do corpo
    base_alta = (-meia_h * 0.45, -meia_w * 0.94)
    base_baixa = (meia_h * 0.85, -meia_w * 0.94)
    meio_du = (base_alta[0] + base_baixa[0]) / 2
    # a direcao sai DA FACE, nao do centro: para tras (dn<0) e para baixo
    # (du>0, porque proc_ang e negativo)
    a = v["proc_ang"]
    ponta_du = meio_du - math.sin(a) * v["proc_len"]
    ponta_dn = -meia_w * 0.94 - math.cos(a) * v["proc_len"]
    meia_ponta = max(0.55, v["h"] * 0.20)
    ponta_alta = (ponta_du - meia_ponta, ponta_dn)
    ponta_baixa = (ponta_du + meia_ponta, ponta_dn)
    pts = [
        _p(c, u, n, *base_alta),
        _p(c, u, n, *ponta_alta),
        _p(c, u, n, *ponta_baixa),
        _p(c, u, n, *base_baixa),
    ]
    return (
        "M %.2f %.2f L %.2f %.2f Q %.2f %.2f %.2f %.2f L %.2f %.2f Z"
        % (
            pts[0][0], pts[0][1],
            pts[1][0], pts[1][1],
            # ponta: um vertice de controle um pouco alem, para arredondar
            (pts[1][0] + pts[2][0]) / 2 + (pts[1][0] - pts[0][0]) * 0.12,
            (pts[1][1] + pts[2][1]) / 2 + (pts[1][1] - pts[0][1]) * 0.12,
            pts[2][0], pts[2][1],
            pts[3][0], pts[3][1],
        )
    )


def _disco_d(a, b):
    """Disco: o quadrilatero que FECHA o vao entre duas vertebras.

    Face de baixo de `a` e face de cima de `b`. As duas saem da tangente da
    curva no y de cada uma, entao as faces ficam paralelas ao que a curva pede
    e o vao nunca aparece.
    """
    ca, cb = (a["cx"], a["cy"]), (b["cx"], b["cy"])
    ua, na_ = _eixos(a["ang"])
    ub, nb = _eixos(b["ang"])
    pts = [
        _p(ca, ua, na_, a["h"] / 2, -a["w"] / 2 * 0.82),
        _p(ca, ua, na_, a["h"] / 2, a["w"] / 2 * 0.82),
        _p(cb, ub, nb, -b["h"] / 2, b["w"] / 2 * 0.82),
        _p(cb, ub, nb, -b["h"] / 2, -b["w"] / 2 * 0.82),
    ]
    return _d(pts)


# Inclinacao que o sacro ganha sobre o eixo de L5. O angulo lombossacro real
# fica entre 30 graus e 45 graus: e o que faz o sacro apontar para baixo e para tras em
# vez de continuar a coluna em linha. A curva medida nao cobre o sacro (a
# tabela vai ate y=299 e foi medida na coluna), entao aqui a inclinacao e
# anatomica e explicita, nao extrapolacao do spline.
INCLINACAO_SACRO = math.radians(-24.0)
COMPRIMENTO_SACRO = 21.0
SEGMENTOS_SACRO = 5


def _sacro(l5):
    """(disco L5-S1, [5 segmentos do sacro], coccix). Tudo em absoluto.

    O sacro sao cinco vertebras fundidas, e e assim que ele e desenhado: cinco
    trapezios na mesma logica dos corpos vertebrais, com vao minimo entre eles,
    afinando ate a ponta. Uma cunha lisa lia como aleta; com os cinco
    segmentos ela le como continuacao da coluna, que e o que e.
    """
    c = (l5["cx"], l5["cy"])
    u, n = _eixos(l5["ang"])

    # o "nivel" de topo do sacro: mesma face de um corpo vertebral, ja com
    # parte da inclinacao sacra, para o disco L5-S1 abrir para a frente como
    # abre de verdade
    ang_topo = l5["ang"] + INCLINACAO_SACRO * 0.34
    meia_w = l5["w"] / 2 * 0.98
    centro_topo = _p(c, u, n, l5["h"] / 2 + VAO_SACRO, 0.0)
    topo = dict(cx=centro_topo[0], cy=centro_topo[1], ang=ang_topo, h=0.0, w=meia_w * 2 / 0.94)
    disco = _disco_d(l5, topo)

    # a linha de centro do sacro, amostrada; cada segmento sai de dois pontos
    # consecutivos dela
    passos = SEGMENTOS_SACRO
    eixo, larguras = [(centro_topo, ang_topo)], [meia_w]
    x, y = centro_topo
    for k in range(1, passos + 1):
        f = k / passos
        ang = ang_topo + (INCLINACAO_SACRO - INCLINACAO_SACRO * 0.34) * (f ** 0.8)
        u2, _ = _eixos(ang)
        d = COMPRIMENTO_SACRO / passos
        x += u2[0] * d
        y += u2[1] * d
        eixo.append(((x, y), ang))
        larguras.append(meia_w * (1 - 0.52 * f))

    vao = 0.28
    segmentos = []
    for k in range(passos):
        (ca, aa), (cb, ab) = eixo[k], eixo[k + 1]
        _, na_ = _eixos(aa)
        ub, nb = _eixos(ab)
        ua, _ = _eixos(aa)
        wa, wb = larguras[k], larguras[k + 1]
        a0 = (ca[0] + ua[0] * vao / 2, ca[1] + ua[1] * vao / 2)
        b0 = (cb[0] - ub[0] * vao / 2, cb[1] - ub[1] * vao / 2)
        segmentos.append(
            _d(
                [
                    (a0[0] + na_[0] * -wa, a0[1] + na_[1] * -wa),
                    (a0[0] + na_[0] * wa, a0[1] + na_[1] * wa),
                    (b0[0] + nb[0] * wb, b0[1] + nb[1] * wb),
                    (b0[0] + nb[0] * -wb, b0[1] + nb[1] * -wb),
                ]
            )
        )

    # coccix: continua a cunha, mais inclinado, e termina em ponta
    (fim, ang_fim) = eixo[-1]
    u3, n3 = _eixos(ang_fim + math.radians(-16.0))
    meia = larguras[-1]
    ponta = (fim[0] + u3[0] * 5.0, fim[1] + u3[1] * 5.0)
    coccix = _d(
        [
            (fim[0] + n3[0] * -meia, fim[1] + n3[1] * -meia),
            (ponta[0] + n3[0] * -meia * 0.3, ponta[1] + n3[1] * -meia * 0.3),
            (ponta[0] + n3[0] * meia * 0.3, ponta[1] + n3[1] * meia * 0.3),
            (fim[0] + n3[0] * meia, fim[1] + n3[1] * meia),
        ]
    )
    return disco, segmentos, coccix


def _curva_d(vs, passo=4):
    """A linha de centro da coluna, do alto de C1 a ponta do coccix.

    Serve de traco da mascara: e sobre ela que a faixa de luz anda, entao
    precisa cobrir tambem o sacro, que nao sai do spline.
    """
    spline, _, _ = curva_da_coluna()
    ys = [Y_TOPO + i for i in range(0, int(Y_BASE - Y_TOPO) + 1, passo)]
    pts = [(float(spline(y)), y) for y in ys]
    l5 = vs[-1]
    c = (l5["cx"], l5["cy"])
    u, n = _eixos(l5["ang"])
    x, y = _p(c, u, n, l5["h"] / 2 + VAO_SACRO, 0.0)
    for k in range(1, 9):
        f = k / 8
        u2, _ = _eixos(l5["ang"] + INCLINACAO_SACRO * (f ** 0.8))
        x += u2[0] * (COMPRIMENTO_SACRO + 6.0) / 8
        y += u2[1] * (COMPRIMENTO_SACRO + 6.0) / 8
        pts.append((x, y))
    return _d(pts, fechar=False)


# =============================================================================
# COLUNA FRONTAL
# =============================================================================
#
# De frente a coluna fica reta sobre o prumo (fingir desvio lateral seria
# desenhar uma escoliose que a clinica trata), entao a curva nao entra aqui: o
# que entra e o MESMO sistema de niveis da de perfil - a rampa continua de
# passo, o disco fechando o vao, o sacro de verdade e a faixa de luz. Era isso
# que estava desencontrado: lado a lado, a coluna de frente lia como pilha de
# tracinhos ao lado de uma coluna desenhada.
#
# O glifo e o da vista frontal, nao o de perfil: corpo mais dois processos
# TRANSVERSOS saindo dos lados. O processo espinhoso, de frente, aponta para
# quem olha e nao tem silhueta; desenha-lo seria inventar. As transversas sao
# curtas na cervical, longas na toracica e mais longas ainda em L3, como sao.

EIXO_FRONTAL = 110.5

# Largura do corpo na vista frontal. Mantem a faixa que a figura ja tinha
# (6,4 a 16), agora como rampa continua em vez de tres blocos.
def _largura_frontal(t):
    return 6.6 + 10.4 * (t ** 1.15)


COMPRIMENTO_TRANSVERSA = [
    (0.0, 2.0), (0.26, 3.4), (0.45, 5.4), (0.62, 5.2), (0.80, 6.2), (1.0, 5.0)
]


def _wings_d(cx, cy, h, w, comp):
    """As duas transversas: cunhas curtas saindo dos lados do corpo."""
    meia_w = w / 2
    grossura = max(0.55, h * 0.20)
    # as transversas nascem no nivel do pediculo, um pouco acima do meio do
    # corpo, e afinam para a ponta
    cy = cy - h * 0.09
    saida = []
    for lado in (-1, 1):
        x0 = cx + lado * meia_w * 0.98
        x1 = cx + lado * (meia_w + comp)
        saida.append(
            _d(
                [
                    (x0, cy - grossura),
                    (x1, cy - grossura * 0.42),
                    (x1, cy + grossura * 0.42),
                    (x0, cy + grossura),
                ]
            )
        )
    return saida


# =============================================================================
# CADEIA
# =============================================================================
#
# Era um punhado de segmentos soltos entre aneis de articulacao: cada segmento
# comecava e acabava no ar, e os aneis competiam com os pontos clicaveis. O
# desenho novo:
#
#   - uma POLILINHA CONTINUA por membro, da coluna ate a extremidade. Comeca
#     numa peca que existe (a vertebra, o sacro) e termina DENTRO da mao ou do
#     pe, medido no contorno. Nenhuma ponta no nada.
#   - marca de articulacao em CRUZ, nao em anel: 1px, papel a 0,45, 5u de
#     braco. E marca de medida, nao botao, e nenhum olho a confunde com um
#     ponto de 13px com halo verde.
#   - a cruz SAI se o vertice estiver a menos de 45u de um ponto clicavel.
#     O vertice continua existindo na polilinha; o que sai e a marca.
#   - um ponto correndo a polilinha inteira por offset-path (11 a 15s), em vez
#     de um ponto por segmento. Nasce em opacity 0, entao com movimento
#     reduzido nao existe.
#
# No PERFIL nao ha cadeia de braco: de lado o braco se projeta sobre o tronco,
# e uma linha ali cruzaria a coluna, que e justamente a peca principal daquela
# figura. Fica a cadeia inferior, que e a que a leitura sagital usa.

# Distancia minima entre uma cruz de articulacao e um ponto clicavel. Nao e
# para "nao competirem" por tamanho - uma cruz de 6px nao compete com um anel
# verde de 13px com halo -, e so para as duas marcas nao se encostarem.
FOLGA_DA_CRUZ = 30.0


def _polilinha_d(pts):
    return _d(pts, fechar=False)




# =============================================================================
# DADOS PARA O SITE
# =============================================================================
#
# O site nao recebe SVG pronto: recebe listas de caminhos. O peso (traco e
# opacidade) e o movimento sao decididos no componente e no CSS; aqui so ha
# geometria.


def coluna(vista):
    """Os caminhos da coluna de uma vista, agrupados por peca."""
    vs = niveis()
    if vista == "perfil":
        disco_sacro, sacro, coccix = _sacro(vs[-1])
        return dict(
            discos=[_disco_d(a, b) for a, b in zip(vs, vs[1:])] + [disco_sacro],
            processos=[_processo_d(v) for v in vs],
            corpos=[_corpo_d(v) for v in vs],
            sacro=sacro,
            coccix=coccix,
            traco=_curva_d(vs),
        )

    retos = [dict(v, cx=EIXO_FRONTAL, ang=0.0, w=_largura_frontal(v["t"])) for v in vs]
    transversas = []
    for r in retos:
        transversas.extend(
            _wings_d(EIXO_FRONTAL, r["cy"], r["h"], r["w"], _rampa(r["t"], COMPRIMENTO_TRANSVERSA))
        )
    discos = [_disco_d(a, b) for a, b in zip(retos, retos[1:])]

    # sacro de frente: triangulo de ponta para baixo, cinco segmentos
    # fundidos, mais o coccix. E' a forma que o sacro tem em AP.
    l5 = retos[-1]
    topo_y = l5["cy"] + l5["h"] / 2 + VAO_SACRO
    meia_w = l5["w"] / 2 * 1.62
    comp = 21.0
    segs, vao = [], 0.4
    for k in range(SEGMENTOS_SACRO):
        f0, f1 = k / SEGMENTOS_SACRO, (k + 1) / SEGMENTOS_SACRO
        y0 = topo_y + comp * f0 + vao / 2
        y1 = topo_y + comp * f1 - vao / 2
        w0 = meia_w * (1 - 0.66 * f0 ** 0.85)
        w1 = meia_w * (1 - 0.66 * f1 ** 0.85)
        segs.append(
            _d(
                [
                    (EIXO_FRONTAL - w0, y0),
                    (EIXO_FRONTAL + w0, y0),
                    (EIXO_FRONTAL + w1, y1),
                    (EIXO_FRONTAL - w1, y1),
                ]
            )
        )
    ponta = topo_y + comp
    wc = meia_w * 0.24
    coccix = _d(
        [
            (EIXO_FRONTAL - wc, ponta + vao),
            (EIXO_FRONTAL + wc, ponta + vao),
            (EIXO_FRONTAL + wc * 0.3, ponta + vao + 5.0),
            (EIXO_FRONTAL - wc * 0.3, ponta + vao + 5.0),
        ]
    )
    discos.append(
        _d(
            [
                (EIXO_FRONTAL - l5["w"] / 2 * 0.82, l5["cy"] + l5["h"] / 2),
                (EIXO_FRONTAL + l5["w"] / 2 * 0.82, l5["cy"] + l5["h"] / 2),
                (EIXO_FRONTAL + meia_w * 0.82, topo_y),
                (EIXO_FRONTAL - meia_w * 0.82, topo_y),
            ]
        )
    )
    return dict(
        discos=discos,
        processos=transversas,
        corpos=[_corpo_d(r) for r in retos],
        sacro=segs,
        coccix=coccix,
        traco=_d([(EIXO_FRONTAL, Y_TOPO - 2), (EIXO_FRONTAL, ponta + 7)], fechar=False),
    )


def cadeia(vista, pontos_clicaveis):
    """Polilinhas (com duracao e fase do ponto que corre) e cruzes, de uma vista."""
    if vista == "frontal":
        E = EIXO_FRONTAL

        def espelha(pts):
            return [(2 * E - x, y) for x, y in pts]

        # o braco sai da coluna na altura de T1 e termina DENTRO da mao
        # (medido: em y=306 a mao vai de 23,3 a 33,8); a perna sai da asa do
        # sacro, que e' onde a sacroiliaca fica, e termina dentro do pe
        braco = [(E, 122.0), (54.5, 149.5), (36.7, 250.5), (29.0, 306.0)]
        perna = [(E - 11.0, 277.0), (82.9, 309.5), (78.8, 408.0), (84.4, 489.3), (80.0, 528.0)]
        correntes = [
            (braco, 12.0, 0.0),
            (espelha(braco), 12.0, 3.4),
            (perna, 14.5, 1.7),
            (espelha(perna), 14.5, 6.1),
        ]
    else:
        # do sacro ao antepe: a cadeia que a leitura sagital usa
        perna = [(40.0, 287.0), (56.5, 309.5), (50.0, 408.0), (46.0, 489.3), (76.0, 526.0)]
        correntes = [(perna, 15.0, 1.1)]

    def livre(x, y):
        return all(
            math.hypot(x - p["x"], y - p["y"]) >= FOLGA_DA_CRUZ for p in pontos_clicaveis
        )

    # cruz nos vertices internos e na ponta da extremidade (e' ela que faz a
    # polilinha terminar em alguma coisa); a regra do espelho vale so para os
    # internos da frontal, onde a figura e' simetrica
    cruzes = []
    for pts, _, _ in correntes:
        for k, (x, y) in enumerate(pts[1:], start=1):
            interna = k < len(pts) - 1
            ok = livre(x, y)
            if ok and interna and vista == "frontal":
                ok = livre(2 * EIXO_FRONTAL - x, y)
            if ok:
                cruzes.append(
                    "M %.1f %.1f H %.1f M %.1f %.1f V %.1f"
                    % (x - 2.6, y, x + 2.6, x, y - 2.6, y + 2.6)
                )

    return dict(
        polilinhas=[dict(d=_polilinha_d(pts), dur=dur, fase=fase) for pts, dur, fase in correntes],
        cruzes=cruzes,
    )
