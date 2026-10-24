import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MVP 不启用 Cache Components（PPR 新模型），保持传统 RSC 动态渲染，降低复杂度
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
