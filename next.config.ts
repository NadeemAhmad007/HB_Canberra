import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75, 90],
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
