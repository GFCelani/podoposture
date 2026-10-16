import { randomBytes } from "node:crypto";

import type { NextConfig } from "next";

/**
 * A versao deste build. Na Vercel, o commit (12 caracteres bastam para nao
 * repetir). Fora dela, a hora do build em milissegundos, inteira, e 4 bytes
 * ao acaso. A primeira versao cortava a hora em 12 caracteres, o que
 * deixava 6 digitos e dava a mesma versao a builds de quase 3 horas.
 *
 * Calculada uma vez e guardada no ambiente: o Next carrega este arquivo em
 * mais de um processo do mesmo build, e cada um com a sua hora poria uma
 * versao no codigo do navegador e outra no do servidor.
 */
const VERSAO =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  (process.env.VERSAO_DO_PAINEL_NESTE_BUILD ??= `local-${Date.now()}-${randomBytes(4).toString("hex")}`);

const nextConfig: NextConfig = {
  devIndicators: false,

  /**
   * A versao deste build, gravada no codigo do navegador e no do servidor.
   * O painel compara as duas no login: navegador ainda com o painel de antes
   * de um deploy recarrega (components/painel/Entrar.tsx). Ver VERSAO acima.
   */
  env: {
    NEXT_PUBLIC_VERSAO_DO_PAINEL: VERSAO,
  },

  async redirects() {
    return [
      /**
       * No GoDaddy, "/" e "/home" serviam conteudo identico (os mesmos 259 KB,
       * ambos HTTP 200, sem canonical entre eles) — duas URLs disputando as
       * mesmas buscas. Aqui a duplicacao e consolidada na raiz.
       *
       * Este e o unico redirect da migracao. As outras 88 URLs do site antigo
       * sao servidas nos proprios enderecos.
       *
       * O `source` e ASCII de proposito: em path-to-regexp, caracteres como "+"
       * (de "/metodo-posture+") sao modificadores de repeticao, e acento
       * dependeria de normalizacao Unicode. Rotas com esses casos ficam em
       * segmento dinamico, onde sao apenas texto.
       */
      { source: "/home", destination: "/", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
