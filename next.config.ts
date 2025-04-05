import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    forceSwcTransforms: true, // Babelが存在してもSWCを強制使用
  },
};

export default nextConfig;
