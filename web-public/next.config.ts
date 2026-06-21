import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@tripitkorea/shared"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
