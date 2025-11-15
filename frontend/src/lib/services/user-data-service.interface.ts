/**
 * User Data Service Interface
 *
 * Defines the contract that all user data service implementations must follow
 */

import type {
  UserDataOperations,
  EvaluationOperations
} from '@/lib/types/user-data';

/**
 * Complete interface for user data services
 * Combines user data operations with evaluation operations
 */
export interface IUserDataService extends UserDataOperations, EvaluationOperations {
  // Additional methods that may be implementation-specific
  clearCache?: () => void;
}

/**
 * Service configuration options
 */
export interface UserDataServiceConfig {
  userId: string;
  userEmail?: string;
  cacheEnabled?: boolean;
  cacheExpiry?: number;
}

/**
 * Factory function type for creating service instances
 */
export type UserDataServiceFactory = (config: UserDataServiceConfig) => IUserDataService;
