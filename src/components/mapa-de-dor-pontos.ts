/**
 * GERADO por scripts/gerar-mapa-de-dor.py. Nao editar a mao: regerar.
 *
 * Os doze pontos clicaveis do mapa de dor do hero, seis por figura.
 * Coordenadas no viewBox da figura (frontal 221 x 560, perfil 118 x 560).
 * Curva sagital: spline suavizado sobre COLUNA_PERFIL_X, erro maximo de
 * 0.48u contra a medida.
 */

export type VistaDoMapa = "frontal" | "perfil";

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

export const MAPA_DE_DOR_PONTOS: Record<VistaDoMapa, PontosDaVista> = {
  "frontal": {
    "largura": 221,
    "pontos": [
      {
        "chave": "cefaleia",
        "rotulo": [
          "cefaleia",
          "tensional"
        ],
        "x": 126,
        "y": 43,
        "lado": "dir",
        "rota": "/tratamento-da-dtm",
        "aria": "Cefaleia tensional, vista frontal. Abrir a página Tratamento da DTM, cefaleias e dor orofacial",
        "dur": 4.4,
        "fase": 0.0,
        "fioU": 12.2,
        "alvoU": 43.1
      },
      {
        "chave": "dtm",
        "rotulo": [
          "DTM"
        ],
        "x": 95,
        "y": 73,
        "lado": "esq",
        "rota": "/tratamento-da-dtm",
        "aria": "DTM, disfunção da articulação temporomandibular, vista frontal. Abrir a página Tratamento da DTM",
        "dur": 3.8,
        "fase": 1.6,
        "fioU": 12.7,
        "alvoU": 43.1
      },
      {
        "chave": "postura",
        "rotulo": [
          "má postura"
        ],
        "x": 110.5,
        "y": 185,
        "lado": "dir",
        "rota": "/posturologia",
        "aria": "Má postura, vista frontal. Abrir a página Posturologia",
        "dur": 5.2,
        "fase": 4.0,
        "fioU": 81.7,
        "alvoU": 45.4
      },
      {
        "chave": "lombar",
        "rotulo": [
          "dor lombar"
        ],
        "x": 125,
        "y": 228,
        "lado": "dir",
        "rota": "/dor-lombar-crônica",
        "aria": "Dor lombar, vista frontal. Abrir a página Dor Lombar Crônica",
        "dur": 4.0,
        "fase": 2.9,
        "fioU": 72.6,
        "alvoU": 45.4
      },
      {
        "chave": "hernia",
        "rotulo": [
          "hérnia de",
          "disco"
        ],
        "x": 110.5,
        "y": 272,
        "lado": "dir",
        "rota": "/flexo-distração",
        "aria": "Hérnia de disco, vista frontal. Abrir a página Flexo-distração",
        "dur": 4.6,
        "fase": 1.4,
        "fioU": 90.5,
        "alvoU": 46.3
      },
      {
        "chave": "morton",
        "rotulo": [
          "neuroma de",
          "Morton"
        ],
        "x": 139,
        "y": 525,
        "lado": "dir",
        "rota": "/palmilhas-personalizadas",
        "aria": "Neuroma de Morton, vista frontal. Abrir a página Palmilhas Personalizadas",
        "dur": 4.9,
        "fase": 2.9,
        "fioU": 20.7,
        "alvoU": 254.6
      }
    ]
  },
  "perfil": {
    "largura": 118,
    "pontos": [
      {
        "chave": "zumbido",
        "rotulo": [
          "zumbido"
        ],
        "x": 52,
        "y": 64,
        "lado": "dir",
        "rota": "/tratamento-do-zumbido",
        "aria": "Zumbido, vista de perfil. Abrir a página Tratamento do Zumbido",
        "dur": 4.2,
        "fase": 0.7,
        "fioU": 37.7,
        "alvoU": 74.0
      },
      {
        "chave": "postura",
        "rotulo": [
          "má postura"
        ],
        "x": 33.2,
        "y": 135.6,
        "lado": "esq",
        "rota": "/posturologia",
        "aria": "Má postura, vista de perfil. Abrir a página Posturologia",
        "dur": 5.2,
        "fase": 2.2,
        "fioU": 21.1,
        "alvoU": 74.0
      },
      {
        "chave": "lombar",
        "rotulo": [
          "dor lombar"
        ],
        "x": 41.8,
        "y": 229.5,
        "lado": "esq",
        "rota": "/dor-lombar-crônica",
        "aria": "Dor lombar, vista de perfil. Abrir a página Dor Lombar Crônica",
        "dur": 4.0,
        "fase": 1.1,
        "fioU": 11.0,
        "alvoU": 42.7
      },
      {
        "chave": "hernia",
        "rotulo": [
          "hérnia de",
          "disco"
        ],
        "x": 50.1,
        "y": 271.4,
        "lado": "esq",
        "rota": "/flexo-distração",
        "aria": "Hérnia de disco, vista de perfil. Abrir a página Flexo-distração",
        "dur": 4.6,
        "fase": 3.3,
        "fioU": 28.5,
        "alvoU": 42.7
      },
      {
        "chave": "ciatica",
        "rotulo": [
          "dor ciática"
        ],
        "x": 40,
        "y": 340,
        "lado": "esq",
        "rota": "/flexo-distração",
        "aria": "Dor ciática, vista de perfil. Abrir a página Flexo-distração",
        "dur": 5.0,
        "fase": 0.4,
        "fioU": 13.7,
        "alvoU": 69.3
      },
      {
        "chave": "fascite",
        "rotulo": [
          "fascite",
          "plantar"
        ],
        "x": 42,
        "y": 527,
        "lado": "esq",
        "rota": "/palmilhas-personalizadas",
        "aria": "Fascite plantar, vista de perfil. Abrir a página Palmilhas Personalizadas",
        "dur": 4.3,
        "fase": 2.6,
        "fioU": 12.9,
        "alvoU": 187.0
      }
    ]
  }
};
