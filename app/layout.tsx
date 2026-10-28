import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const fuente = Inter({ variable: "--font-base", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expedientes SPR",
  description: "Checklist de expedientes de subdivisión para terceros autorizados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${fuente.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
