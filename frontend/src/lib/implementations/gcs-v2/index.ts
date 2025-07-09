/**
 * GCS V2 實作導出
 * 統一學習架構的 GCS 實作
 */

// Export repositories
export { GCSScenarioRepository } from './repositories/gcs-scenario-repository';
export { GCSProgramRepository } from './repositories/gcs-program-repository';
export { GCSTaskRepository } from './repositories/gcs-task-repository';
export { GCSEvaluationRepository } from './repositories/gcs-evaluation-repository';

// Export repository factory
export {
  repositoryFactory,
  getScenarioRepository,
  getProgramRepository,
  getTaskRepository,
  getEvaluationRepository,
} from './repository-factory';

// Export base class (for extending)
export { GCSRepositoryBase } from './base/gcs-repository-base';