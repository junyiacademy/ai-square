import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 輸出配置 (for Docker deployment)
  output: 'standalone',
  
  // 安全標頭配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://storage.googleapis.com https://generativelanguage.googleapis.com https://aiplatform.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

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
      
      // Bundle 分割優化
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Google 服務單獨打包
            google: {
              test: /[\\/]node_modules[\\/](@google|google-)/,
              name: 'google-services',
              chunks: 'all',
              priority: 30,
            },
            // 圖表庫單獨打包
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3|chart\.js|react-chartjs-2)/,
              name: 'charts',
              chunks: 'all',
              priority: 25,
            },
            // i18n 相關單獨打包
            i18n: {
              test: /[\\/]node_modules[\\/](i18next|react-i18next|next-i18next)/,
              name: 'i18n',
              chunks: 'all',
              priority: 20,
            },
            // React 生態系統
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)/,
              name: 'react',
              chunks: 'all',
              priority: 15,
            },
            // 其他第三方庫
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }
    
    // Suppress OpenTelemetry instrumentation warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@opentelemetry\/instrumentation/,
        message: /Critical dependency/,
      },
    ];
    
    return config;
  },


  // 生產環境優化
  productionBrowserSourceMaps: false,
  
  // 壓縮配置
  compress: true,

  // ESLint 檢查 - 已啟用品質檢查
  eslint: {
    ignoreDuringBuilds: false, // 啟用 ESLint 檢查確保代碼品質
  },

  // TypeScript 檢查 - 已啟用類型檢查
  typescript: {
    ignoreBuildErrors: false, // 啟用 TypeScript 檢查確保類型安全
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