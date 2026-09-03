import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

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
