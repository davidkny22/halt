import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@halt/shared"],
  outputFileTracingRoot: join(__dirname, "../../"),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

