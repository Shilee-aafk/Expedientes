import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor autocontenido (.next/standalone): lo usa la app de escritorio
  output: "standalone",
  // No se usa next/image: sin sharp, el servidor no lleva binarios propios de un sistema operativo
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "*": ["node_modules/@img/**", "node_modules/sharp/**", "node_modules/typescript/**"],
  },
};

export default nextConfig;
