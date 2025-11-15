/**
 * 統一的 GCS 配置
 * 所有使用 GCS 的地方都應該從這裡取得配置
 */

// 統一使用 GCS_BUCKET_NAME 環境變數
export const GCS_CONFIG = {
  // 主要 bucket 名稱
  bucketName: process.env.GCS_BUCKET_NAME || 'ai-square-db-v2',

  // Google Cloud Project ID
  projectId: process.env.GOOGLE_CLOUD_PROJECT,

  // 本地開發時的認證檔案路徑
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,

  // 資料路徑前綴
  paths: {
    // 評估結果
    assessments: 'assessments',

    // 統一架構的資料路徑
    scenarios: 'v2/scenarios',
    programs: 'v2/programs',
    tasks: 'v2/tasks',
    evaluations: 'v2/evaluations',

    // CMS 資料
    cms: {
      overrides: 'cms/overrides',
      drafts: 'cms/drafts',
      history: 'cms/history',
      metadata: 'cms/metadata'
    }
  }
} as const;

// Storage 配置（用於初始化 GCS client）
export const getStorageConfig = () => {
  const config: {
    projectId?: string;
    keyFilename?: string;
  } = {
    projectId: GCS_CONFIG.projectId,
  };

  // 只在本地開發時使用金鑰檔案
  if (GCS_CONFIG.keyFilename) {
    config.keyFilename = GCS_CONFIG.keyFilename;
  }

  return config;
};

// 確保 bucket 名稱在 client 端也可用
export const PUBLIC_GCS_BUCKET = process.env.NEXT_PUBLIC_GCS_BUCKET || GCS_CONFIG.bucketName;
