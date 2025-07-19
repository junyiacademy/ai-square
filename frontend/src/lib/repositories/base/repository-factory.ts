/**
 * Repository Factory
 * 統一管理所有 Repository 的創建
 * 明確分離 PostgreSQL 和 GCS 的責任
 */

import { Pool } from 'pg';
import { Storage } from '@google-cloud/storage';

// PostgreSQL Repositories
import { PostgreSQLUserRepository } from '../postgresql/user-repository';
import { PostgreSQLProgramRepository } from '../postgresql/program-repository';
import { PostgreSQLTaskRepository } from '../postgresql/task-repository';
import { PostgreSQLEvaluationRepository } from '../postgresql/evaluation-repository';
import { PostgreSQLScenarioRepository } from '../postgresql/scenario-repository';

// GCS Repositories (for content only)
import { GCSContentRepository } from '../gcs/content-repository';
import { GCSMediaRepository } from '../gcs/media-repository';

// Interfaces
import type { 
  IUserRepository,
  IProgramRepository,
  ITaskRepository,
  IEvaluationRepository,
  IScenarioRepository,
  IContentRepository,
  IMediaRepository
} from '../interfaces';

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private pool: Pool;
  private storage: Storage;

  private constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize GCS client
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  // ========================================
  // PostgreSQL Repositories (動態資料)
  // ========================================

  public getUserRepository(): IUserRepository {
    return new PostgreSQLUserRepository(this.pool);
  }

  public getProgramRepository(): IProgramRepository {
    return new PostgreSQLProgramRepository(this.pool);
  }

  public getTaskRepository(): ITaskRepository {
    return new PostgreSQLTaskRepository(this.pool);
  }

  public getEvaluationRepository(): IEvaluationRepository {
    return new PostgreSQLEvaluationRepository(this.pool);
  }

  public getScenarioRepository(): IScenarioRepository {
    return new PostgreSQLScenarioRepository(this.pool);
  }

  // ========================================
  // GCS Repositories (靜態內容)
  // ========================================

  public getContentRepository(): IContentRepository {
    const bucketName = process.env.GCS_CONTENT_BUCKET || 'ai-square-content';
    return new GCSContentRepository(this.storage, bucketName);
  }

  public getMediaRepository(): IMediaRepository {
    const bucketName = process.env.GCS_MEDIA_BUCKET || 'ai-square-media';
    return new GCSMediaRepository(this.storage, bucketName);
  }

  // ========================================
  // Utility methods
  // ========================================

  public async healthCheck(): Promise<{
    postgresql: boolean;
    gcs: boolean;
    details: Record<string, unknown>;
  }> {
    const results = {
      postgresql: false,
      gcs: false,
      details: {} as Record<string, unknown>
    };

    // Check PostgreSQL
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      results.postgresql = true;
      results.details.postgresql = {
        status: 'connected',
        time: result.rows[0].now
      };
    } catch (error) {
      results.details.postgresql = {
        status: 'error',
        error: error.message
      };
    }

    // Check GCS
    try {
      const [buckets] = await this.storage.getBuckets({ maxResults: 1 });
      results.gcs = true;
      results.details.gcs = {
        status: 'connected',
        bucketsAccessible: buckets.length > 0
      };
    } catch (error) {
      results.details.gcs = {
        status: 'error',
        error: error.message
      };
    }

    return results;
  }

  public async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const repositoryFactory = RepositoryFactory.getInstance();