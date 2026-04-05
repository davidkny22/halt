import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@clawnitor/shared"],
  outputFileTracingRoot: join(__dirname, "../../"),
  images: {
    // Avoid server-side image optimization cache growth risk.
    unoptimized: true,
  },
};

export default nextConfig;

