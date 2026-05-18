import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Comunio Mundial 2026 — Porra del Mundial",
  description:
    "Compite con tus amigos prediciendo los resultados del Mundial de Fútbol 2026. Fase de grupos, eliminatorias, y predicciones del campeón.",
  keywords: ["mundial 2026", "porra", "predicciones", "fútbol", "world cup"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
