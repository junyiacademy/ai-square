/**
 * 統一抽象層導出
 * Unified Abstraction Layer Exports
 */

// API Handler
export { BaseApiHandler } from './base-api-handler';
export type { ApiResponse, RequestContext } from './base-api-handler';

// Storage Service
export { BaseStorageService } from './base-storage-service';
export type { StorageOptions, StorageResult } from './base-storage-service';

// AI Service
export { BaseAIService } from './base-ai-service';
export type { AIServiceOptions, AIResponse, ChatMessage } from './base-ai-service';

// YAML Loader
export { BaseYAMLLoader } from './base-yaml-loader';
export type { YAMLLoaderOptions, LoadResult } from './base-yaml-loader';

// Re-export commonly used services
export { cacheService } from '@/lib/cache/cache-service';
export { captureError, captureApiError, captureUserError } from '@/lib/error-tracking/error-tracker';
export type { CacheOptions } from '@/lib/cache/cache-service';
export type { ErrorContext, ErrorReport } from '@/lib/error-tracking/error-tracker';