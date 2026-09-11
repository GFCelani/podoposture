# -*- coding: utf-8 -*-
"""
Gera a geometria do mapa de dor do hero, em dois arquivos:

  src/components/mapa-de-dor-pontos.ts   os doze pontos (posicao, rota, copy,
                                         fio e alvo). Vai para o cliente, entao
                                         e' pequeno de proposito.
  src/components/mapa-de-dor-desenho.ts  a coluna das duas vistas e a cadeia.
                                         So o servidor le: sao ~60KB de
                                         caminhos que nao entram no bundle.

Nada aqui e' desenhado a mao, como a silhueta (silhueta-*-path.ts):
  - a curva sagital da coluna sai de COLUNA_PERFIL_X, a mesma medida que a
    figura sempre usou, agora num spline suavizado (scripts/mapa_de_dor/
    geometria.py). A interpolacao linear da tabela era o que deixava o giro
    das vertebras irregular.
  - os 24 niveis saem de uma rampa continua de passo, sem fronteira de regiao
    (scripts/mapa_de_dor/desenho.py).
  - o fio de cada rotulo sai do contorno da silhueta medido naquele y, e o
    alvo de toque da distancia ao vizinho mais proximo (pontos.py).

Rodar da raiz do projeto:  py scripts/gerar-mapa-de-dor.py
Depende de numpy e scipy.

O peso da coluna (traco, opacidade) e o movimento NAO estao aqui: estao em
figura-corpo.tsx e em globals.css. Mudar peso nao exige regerar.
"""
import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "mapa_de_dor"))

import desenho  # noqa: E402
import pontos as P  # noqa: E402
from geometria import curva_da_coluna  # noqa: E402

COMPONENTES = os.path.join(AQUI, "..", "src", "components")
LARGURA = {"frontal": 221, "perfil": 118}
FONTES = {"frontal": P.FRONTAL, "perfil": P.PERFIL}


def ponto(vista, p, todos):
    return {
        "chave": p["chave"],
        "rotulo": [p["rotulo"]] if isinstance(p["rotulo"], str) else list(p["rotulo"]),
        "x": round(p["x"], 1),
        "y": round(p["y"], 1),
        "lado": p["lado"],
        "rota": p["rota"],
        "aria": p["aria"],
        "dur": p["dur"],
        "fase": p["fase"],
        "fioU": round(P.fio_do_ponto(vista, p), 1),
        "alvoU": round(P.vizinho_mais_proximo(p, todos), 1),
    }


CABECALHO = """/**
 * GERADO por scripts/gerar-mapa-de-dor.py. Nao editar a mao: regerar.
 *
 * %(o_que)s
 * Coordenadas no viewBox da figura (frontal 221 x 560, perfil 118 x 560).
 * Curva sagital: spline suavizado sobre COLUNA_PERFIL_X, erro maximo de
 * %(erro).2fu contra a medida.
 */
"""

TIPOS_PONTOS = """export type VistaDoMapa = "frontal" | "perfil";

export type PontoDeDor = {
  chave: string;
  /** Nome da condicao verbatim da cliente, com a quebra de linha escrita. */
  rotulo: readonly string[];
  x: number;
  y: number;
  /** Para que lado o rotulo sai: sempre para fora do corpo. */
  lado: "esq" | "dir";
  rota: string;
  aria: string;
  /** Ciclo e fase do sonar, em segundos. */
  dur: number;
  fase: number;
  /** Fio ate a placa, em unidades do viewBox, medido no contorno. */
  fioU: number;
  /** Distancia ao vizinho mais proximo, em unidades: dimensiona o alvo. */
  alvoU: number;
};

export type PontosDaVista = {
  largura: number;
  pontos: readonly PontoDeDor[];
};

"""

TIPOS_DESENHO = """import type { VistaDoMapa } from "./mapa-de-dor-pontos";

export type ColunaDoMapa = {
  discos: readonly string[];
  /** Espinhosos no perfil; transversos na frontal. */
  processos: readonly string[];
  corpos: readonly string[];
  /** Cinco segmentos fundidos. */
  sacro: readonly string[];
  coccix: string;
  /** Linha de centro: e' sobre ela que a faixa de luz anda. */
  traco: string;
};

export type CadeiaDoMapa = {
  polilinhas: readonly { d: string; dur: number; fase: number }[];
  cruzes: readonly string[];
};

export type DesenhoDaVista = {
  coluna: ColunaDoMapa;
  cadeia: CadeiaDoMapa;
};

"""


def main():
    pontos_ts, desenho_ts = {}, {}
    for vista, lista in FONTES.items():
        P.confere_folga(vista, lista)
        pontos_ts[vista] = {
            "largura": LARGURA[vista],
            "pontos": [ponto(vista, p, lista) for p in lista],
        }
        desenho_ts[vista] = {
            "coluna": desenho.coluna(vista),
            "cadeia": desenho.cadeia(vista, lista),
        }

    _, _, erro = curva_da_coluna()

    def escreve(nome, o_que, tipos, constante, tipo, dados):
        corpo = json.dumps(dados, ensure_ascii=False, indent=2)
        ts = (
            CABECALHO % dict(o_que=o_que, erro=erro)
            + "\n"
            + tipos
            + "export const %s: Record<VistaDoMapa, %s> = %s;\n" % (constante, tipo, corpo)
        )
        caminho = os.path.join(COMPONENTES, nome)
        io.open(caminho, "w", encoding="utf-8", newline="\n").write(ts)
        print("escrito %s (%.1f KB)" % (nome, len(ts.encode("utf-8")) / 1024))

    escreve(
        "mapa-de-dor-pontos.ts",
        "Os doze pontos clicaveis do mapa de dor do hero, seis por figura.",
        TIPOS_PONTOS,
        "MAPA_DE_DOR_PONTOS",
        "PontosDaVista",
        pontos_ts,
    )
    escreve(
        "mapa-de-dor-desenho.ts",
        "Coluna e cadeia das duas figuras do hero. So o servidor importa.",
        TIPOS_DESENHO,
        "MAPA_DE_DOR_DESENHO",
        "DesenhoDaVista",
        desenho_ts,
    )


if __name__ == "__main__":
    main()
