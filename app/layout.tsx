import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PabloDev — Gerador de Posts LinkedIn",
  description: "Gere posts autênticos para LinkedIn baseados nos seus projetos reais do GitHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-poppins)]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
