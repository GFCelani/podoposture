import type { Metadata } from "next";
import { Newsreader, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Newsreader e Public Sans sao variaveis: sem `weight`, o next/font baixa o
// arquivo variavel e todos os pesos ficam disponiveis. Com `weight` explicito
// ele baixava uma estatica por peso e por estilo. IBM Plex Mono nao e variavel,
// entao continua declarando o peso, e so o 400 e usado.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

/**
 * Base por env: em producao vem do dominio proprio, e sem ela as URLs
 * absolutas de OG saem apontando para localhost.
 */
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const DESCRICAO =
  "Integração terapêutica efetiva, inovadora com resultados rápidos e eficazes. Osteopatia, posturologia e acupuntura em Copacabana, Rio de Janeiro.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: "Podoposture | Coluna Vertebral, Dor Crônica",
  description: DESCRICAO,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Podoposture",
    title: "Podoposture | Coluna Vertebral, Dor Crônica",
    description: DESCRICAO,
    url: "/",
    // public/og.png: captura do proprio hero em 1200x630, para o cartao nunca
    // divergir do site. Regerar quando o hero mudar.
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Podoposture" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Podoposture | Coluna Vertebral, Dor Crônica",
    description: DESCRICAO,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${newsreader.variable} ${publicSans.variable} ${plexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
