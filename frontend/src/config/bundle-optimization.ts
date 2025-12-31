/**
 * Bundle 優化配置
 * 定義延遲載入和代碼分割策略
 */

// 需要延遲載入的路由
export const LAZY_ROUTES = ["/pbl/history", "/admin", "/settings"];

// 需要預載的關鍵資源
export const PRELOAD_RESOURCES = ["/api/relations", "/api/auth/check"];

// 圖片優化配置
export const IMAGE_CONFIG = {
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96],
  formats: ["image/webp", "image/avif"],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天
};

// 第三方庫的 CDN 配置（生產環境）
export const CDN_LIBRARIES =
  process.env.NODE_ENV === "production"
    ? {
        react: "https://unpkg.com/react@19.0.0/umd/react.production.min.js",
        "react-dom":
          "https://unpkg.com/react-dom@19.0.0/umd/react-dom.production.min.js",
      }
    : {};

// 需要外部化的大型庫（減少 bundle 大小）
export const EXTERNAL_LIBRARIES = [
  // 這些庫將通過 CDN 載入
  // 'react',
  // 'react-dom',
];

// Webpack module interface
interface WebpackModule {
  context: string;
}

// 代碼分割點
export const SPLIT_CHUNKS = {
  // 供應商庫分組
  vendor: {
    test: /[\\/]node_modules[\\/]/,
    name(module: WebpackModule) {
      // Handle both regular and scoped packages
      const match = module.context.match(
        /[\\/]node_modules[\\/]((?:@[^/\\]+[\\/])?[^/\\]+)/,
      );
      const packageName = match?.[1] || "unknown";
      return `vendor.${packageName.replace("@", "")}`;
    },
  },
  // 通用元件分組
  common: {
    minChunks: 2,
    priority: -10,
    reuseExistingChunk: true,
  },
  // 大型庫單獨分組
  charts: {
    test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)/,
    name: "charts",
    priority: 10,
  },
  i18n: {
    test: /[\\/]node_modules[\\/](i18next|react-i18next)/,
    name: "i18n",
    priority: 10,
  },
};

// 壓縮配置
export const COMPRESSION_CONFIG = {
  threshold: 10240, // 10KB
  algorithm: "gzip",
  test: /\.(js|css|html|svg)$/,
  deleteOriginalAssets: false,
};

// Service Worker 配置（PWA）
export const SW_CONFIG = {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
        },
      },
    },
  ],
};
