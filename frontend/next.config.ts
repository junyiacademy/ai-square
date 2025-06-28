import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 優化配置
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  
  // 實驗性功能
  experimental: {
    // 優化包大小
    optimizePackageImports: [
      'recharts',
      'd3',
      'react-i18next',
      '@sentry/nextjs',
      'react-markdown',
    ],
  },

  // Webpack 配置
  webpack: (config, { isServer }) => {
    // Tree shaking 優化
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // 減少 moment.js 大小（如果有使用）
        'moment': 'moment/min/moment.min.js',
      };
    }
    
    return config;
  },


  // 生產環境優化
  productionBrowserSourceMaps: false,
  
  // 壓縮配置
  compress: true,

  // 跳過 ESLint 檢查（暫時）
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 跳過 TypeScript 檢查（暫時）
  typescript: {
    ignoreBuildErrors: true,
  },
};

// Bundle Analyzer 配置
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}