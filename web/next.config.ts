import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
// npm workspaces — next 패키지는 레포 루트 node_modules에 설치됨
const monorepoRoot = path.join(appDir, "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@tripitkorea/shared"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
