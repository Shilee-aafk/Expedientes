import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AvisoActualizacion } from "@/components/Actualizaciones";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

const fuente = Inter({ variable: "--font-base", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expedientes SPR",
  description: "Checklist de expedientes de subdivisión para terceros autorizados",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0b09" },
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // El script ajusta data-theme antes de pintar; suppressHydrationWarning evita el aviso por ese cambio.
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={`${fuente.variable} font-sans antialiased`}>
        {children}
        <AvisoActualizacion />
      </body>
    </html>
  );
}
