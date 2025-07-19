/**
 * Storage Configuration
 * 支援在 GCS 和 PostgreSQL 之間切換
 */

export type StorageBackend = 'gcs' | 'postgresql';

export interface StorageConfig {
  backend: StorageBackend;
  gcs?: {
    bucketName: string;
    projectId?: string;
    keyFilename?: string;
  };
  postgresql?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  };
  // 可以設定混合模式：某些資料用 GCS，某些用 PostgreSQL
  hybrid?: {
    users: StorageBackend;
    programs: StorageBackend;
    scenarios: StorageBackend;
    tasks: StorageBackend;
    evaluations: StorageBackend;
    content: StorageBackend; // YAML content files
  };
}

// 從環境變數讀取設定
export function getStorageConfig(): StorageConfig {
  const backend = (process.env.STORAGE_BACKEND as StorageBackend) || 'gcs';
  
  const config: StorageConfig = {
    backend,
    gcs: {
      bucketName: process.env.GCS_BUCKET_NAME || 'ai-square-db-v2',
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
    postgresql: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true',
    }
  };

  // 支援混合模式設定
  if (process.env.STORAGE_HYBRID_MODE === 'true') {
    config.hybrid = {
      users: (process.env.STORAGE_USERS as StorageBackend) || backend,
      programs: (process.env.STORAGE_PROGRAMS as StorageBackend) || backend,
      scenarios: (process.env.STORAGE_SCENARIOS as StorageBackend) || backend,
      tasks: (process.env.STORAGE_TASKS as StorageBackend) || backend,
      evaluations: (process.env.STORAGE_EVALUATIONS as StorageBackend) || backend,
      content: 'gcs', // YAML content always from GCS/files
    };
  }

  return config;
}

// 取得特定實體的 storage backend
export function getBackendForEntity(entity: keyof NonNullable<StorageConfig['hybrid']>): StorageBackend {
  const config = getStorageConfig();
  
  // 如果啟用混合模式，返回特定實體的設定
  if (config.hybrid) {
    return config.hybrid[entity];
  }
  
  // 否則返回全域設定
  return config.backend;
}

// 檢查是否使用 PostgreSQL
export function isUsingPostgreSQL(entity?: keyof NonNullable<StorageConfig['hybrid']>): boolean {
  if (entity) {
    return getBackendForEntity(entity) === 'postgresql';
  }
  const config = getStorageConfig();
  return config.backend === 'postgresql';
}

// 檢查是否使用 GCS
export function isUsingGCS(entity?: keyof NonNullable<StorageConfig['hybrid']>): boolean {
  if (entity) {
    return getBackendForEntity(entity) === 'gcs';
  }
  const config = getStorageConfig();
  return config.backend === 'gcs';
}