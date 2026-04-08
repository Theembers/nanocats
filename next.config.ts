import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 配置：允许 import .md 文件作为字符串
  turbopack: {
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  // 允许开发环境跨域访问
  allowedDevOrigins: ["192.168.20.200", "localhost"],
};

export default nextConfig;
