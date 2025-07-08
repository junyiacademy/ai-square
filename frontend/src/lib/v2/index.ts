/**
 * V2 Library Exports
 * Central export point for all V2 modules
 */

// Types
export * from './types';

// Core classes
export { BaseRepository } from './core/base-repository';
export { BaseService } from './core/base-service';
export { BaseApiHandler } from './core/base-api-handler';

// Repositories
export { ScenarioRepositoryV2 } from './repositories/scenario-repository';
export { ProgramRepositoryV2 } from './repositories/program-repository';
export { TaskRepositoryV2 } from './repositories/task-repository';
export { ProjectRepositoryV2 } from './repositories/project-repository';
export { LogRepositoryV2 } from './repositories/log-repository';

// Services
export { StorageService } from './services/storage-service';
export { BaseLearningServiceV2 } from './services/base-learning-service';
export { ScenarioService } from './services/scenario-service';
export { PBLServiceV2 } from './services/pbl-service';
export { DiscoveryServiceV2 } from './services/discovery-service';
export { AssessmentServiceV2 } from './services/assessment-service';

// Utils
export {
  DatabaseFactory,
  QueryBuilder,
  MigrationRunner,
  type DatabaseConfig,
  type DatabaseConnection,
  type QueryResult,
  type Migration
} from './utils/database';

// Constants
export const V2_API_PREFIX = '/api/v2';
export const V2_STORAGE_BUCKET = 'ai-square-db-v2';
export const V2_TABLE_PREFIX = '_v2';

// Helper functions
export const buildV2ApiUrl = (path: string): string => {
  return `${V2_API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
};

export const buildV2TableName = (baseName: string): string => {
  return `${baseName}${V2_TABLE_PREFIX}`;
};