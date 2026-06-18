import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // web 폴더를 Turbopack 루트로 고정 (상위 package-lock.json 혼선 방지)
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
