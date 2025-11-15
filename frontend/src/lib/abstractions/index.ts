/**
 * 統一抽象層導出
 * Unified Abstraction Layer Exports
 */

// Learning Service
export { BaseLearningService } from './base-learning-service';

// Re-export commonly used services
export { cacheService } from '@/lib/cache/cache-service';
export { captureError, captureApiError, captureUserError } from '@/lib/error-tracking/error-tracker';
export type { CacheOptions } from '@/lib/cache/cache-service';
export type { ErrorContext, ErrorReport } from '@/lib/error-tracking/error-tracker';
