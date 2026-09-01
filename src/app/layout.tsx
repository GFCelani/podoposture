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

export const metadata: Metadata = {
  title: "Podoposture | Coluna Vertebral, Dor Crônica",
  description:
    "Integração terapêutica efetiva, inovadora com resultados rápidos e eficazes. Osteopatia, posturologia e acupuntura em Copacabana, Rio de Janeiro.",
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
