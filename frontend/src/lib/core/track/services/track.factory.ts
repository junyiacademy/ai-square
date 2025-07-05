/**
 * Track Service Factory
 * 根據環境配置創建適當的 Track Service
 */

import { TrackService } from './track.service';
import { TrackRepository } from '../repositories/track.repository';
import { GCSTrackRepository } from '../repositories/gcs-track.repository';
import { EvaluationRepository } from '../repositories/evaluation.repository';
import { LocalStorageProvider } from '../../storage/providers/local-storage.provider';
import { UserCentricGCSProvider } from '../../storage/providers/user-centric-gcs.provider';
import { IStorageProvider } from '../../storage/interfaces/storage.interface';

export interface TrackServiceConfig {
  storage: 'local' | 'gcs' | 'hybrid';
  gcsConfig?: {
    bucketName: string;
    projectId?: string;
    keyFilename?: string;
  };
  enableCache?: boolean;
  cacheTimeout?: number;
  indexUpdateInterval?: number;
}

/**
 * 創建 Track Service 實例
 */
export function createTrackService(config: TrackServiceConfig): TrackService {
  let storageProvider: IStorageProvider;
  let trackRepository: TrackRepository | GCSTrackRepository;

  // 根據配置選擇儲存提供者
  switch (config.storage) {
    case 'local':
      storageProvider = new LocalStorageProvider();
      trackRepository = new TrackRepository(storageProvider);
      break;

    case 'gcs':
      if (!config.gcsConfig?.bucketName) {
        throw new Error('GCS bucket name is required');
      }
      
      storageProvider = new UserCentricGCSProvider({
        bucketName: config.gcsConfig.bucketName,
        projectId: config.gcsConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT,
        keyFilename: config.gcsConfig.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS,
        indexUpdateInterval: config.indexUpdateInterval || 5000 // 預設 5 秒
      });
      
      trackRepository = new GCSTrackRepository(storageProvider);
      break;

    case 'hybrid':
      // 混合模式：本地快取 + GCS 持久化
      // TODO: 實作 HybridStorageProvider
      throw new Error('Hybrid storage not yet implemented');

    default:
      throw new Error(`Unknown storage type: ${config.storage}`);
  }

  // 創建 Evaluation Repository
  const evaluationRepository = new EvaluationRepository(storageProvider);

  // 創建 Track Service
  const trackService = new TrackService(trackRepository, evaluationRepository);

  // 配置快取（如果啟用）
  if (config.enableCache) {
    // TODO: 實作快取裝飾器
    console.log('Cache enabled with timeout:', config.cacheTimeout);
  }

  return trackService;
}

/**
 * 獲取預設的 Track Service
 */
let defaultTrackService: TrackService | null = null;

export function getDefaultTrackService(): TrackService {
  if (!defaultTrackService) {
    const config: TrackServiceConfig = {
      storage: process.env.NODE_ENV === 'production' ? 'gcs' : 'local',
      gcsConfig: {
        bucketName: process.env.GCS_BUCKET_NAME || 'ai-square-storage',
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      },
      enableCache: true,
      cacheTimeout: 300, // 5 分鐘
      indexUpdateInterval: 10000 // 10 秒
    };
    
    defaultTrackService = createTrackService(config);
  }
  
  return defaultTrackService;
}

/**
 * 重置預設 Track Service（主要用於測試）
 */
export function resetDefaultTrackService(): void {
  defaultTrackService = null;
}