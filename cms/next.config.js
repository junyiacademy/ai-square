/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 環境變數
  env: {
    GITHUB_OWNER: process.env.GITHUB_OWNER || 'your-username',
    GITHUB_REPO: process.env.GITHUB_REPO || 'ai-square',
    GITHUB_CONTENT_PATH: process.env.GITHUB_CONTENT_PATH || 'cms/content',
    GCS_BUCKET: process.env.GCS_BUCKET || 'ai-square-content',
  },
  
  // 開發體驗優化
  experimental: {
    // 更好的錯誤處理
    serverComponentsExternalPackages: ['@octokit/rest'],
  },
  
  // Webpack 配置
  webpack: (config, { dev, isServer }) => {
    // 開發模式優化
    if (dev && !isServer) {
      // 啟用更好的錯誤覆蓋層
      config.resolve.alias = {
        ...config.resolve.alias,
        'react': require.resolve('react'),
      }
    }
    
    return config
  },
  
  // 開發伺服器配置
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // 忽略 TypeScript 錯誤（暫時）
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // 忽略 ESLint 錯誤（暫時）
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig