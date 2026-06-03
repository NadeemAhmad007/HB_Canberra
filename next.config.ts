import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75, 90],
  },
  allowedDevOrigins: ["192.168.178.22"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
