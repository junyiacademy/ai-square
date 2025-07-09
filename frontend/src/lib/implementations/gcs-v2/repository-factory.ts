/**
 * Repository Factory
 * 統一管理所有 GCS Repository 實例
 */

import { GCSScenarioRepository } from './repositories/gcs-scenario-repository';
import { GCSProgramRepository } from './repositories/gcs-program-repository';
import { GCSTaskRepository } from './repositories/gcs-task-repository';
import { GCSEvaluationRepository } from './repositories/gcs-evaluation-repository';

class RepositoryFactory {
  private static instance: RepositoryFactory;
  
  private scenarioRepo?: GCSScenarioRepository;
  private programRepo?: GCSProgramRepository;
  private taskRepo?: GCSTaskRepository;
  private evaluationRepo?: GCSEvaluationRepository;
  
  private constructor() {}
  
  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }
  
  /**
   * 取得 Scenario Repository
   */
  getScenarioRepository(): GCSScenarioRepository {
    if (!this.scenarioRepo) {
      this.scenarioRepo = new GCSScenarioRepository();
    }
    return this.scenarioRepo;
  }
  
  /**
   * 取得 Program Repository
   */
  getProgramRepository(): GCSProgramRepository {
    if (!this.programRepo) {
      this.programRepo = new GCSProgramRepository();
    }
    return this.programRepo;
  }
  
  /**
   * 取得 Task Repository
   */
  getTaskRepository(): GCSTaskRepository {
    if (!this.taskRepo) {
      this.taskRepo = new GCSTaskRepository();
    }
    return this.taskRepo;
  }
  
  /**
   * 取得 Evaluation Repository
   */
  getEvaluationRepository(): GCSEvaluationRepository {
    if (!this.evaluationRepo) {
      this.evaluationRepo = new GCSEvaluationRepository();
    }
    return this.evaluationRepo;
  }
  
  /**
   * 清除所有 repository 實例（用於測試）
   */
  clearInstances(): void {
    this.scenarioRepo = undefined;
    this.programRepo = undefined;
    this.taskRepo = undefined;
    this.evaluationRepo = undefined;
  }
}

// Export singleton instance
export const repositoryFactory = RepositoryFactory.getInstance();

// Export convenience functions
export const getScenarioRepository = () => repositoryFactory.getScenarioRepository();
export const getProgramRepository = () => repositoryFactory.getProgramRepository();
export const getTaskRepository = () => repositoryFactory.getTaskRepository();
export const getEvaluationRepository = () => repositoryFactory.getEvaluationRepository();