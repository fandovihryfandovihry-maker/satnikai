import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // V Next 16 se serverActions často konfigurují přímo jako objekt
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ["192.168.100.163", "localhost:3000"],
    },
  },
  // Tohle zkusíme dát úplně mimo experimental, pokud to tvoje verze už vyžaduje v rootu
  // @ts-ignore
  allowedDevOrigins: ["192.168.100.163", "localhost:3000"],
};

export default nextConfig;