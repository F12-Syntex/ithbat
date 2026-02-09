import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "typst-raster",
    "@myriaddreamin/typst-ts-node-compiler",
  ],
};

export default nextConfig;
