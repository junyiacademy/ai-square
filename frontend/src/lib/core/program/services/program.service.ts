/**
 * Program Service
 * 統一管理所有類型的 Program
 */

import { 
  IProgram,
  ISoftDeletableProgram,
  ProgramType,
  ProgramStatus,
  CreateProgramParams,
  UpdateProgramParams,
  ProgramQueryOptions,
  ProgramStatistics,
  IPBLProgram,
  IAssessmentProgram,
  IDiscoveryProgram,
  IChatProgram,
  isPBLProgram,
  isAssessmentProgram,
  isDiscoveryProgram,
  isChatProgram
} from '../types';
import { BaseProgramRepository } from '../repositories/base-program.repository';
import { PBLProgramRepository } from '../repositories/pbl-program.repository';

export class ProgramService {
  private repositories: Map<ProgramType, BaseProgramRepository>;

  constructor(
    private defaultRepository: BaseProgramRepository,
    repositories?: {
      pbl?: PBLProgramRepository;
      assessment?: BaseProgramRepository;
      discovery?: BaseProgramRepository;
      chat?: BaseProgramRepository;
    }
  ) {
    this.repositories = new Map();
    
    if (repositories?.pbl) {
      this.repositories.set(ProgramType.PBL, repositories.pbl);
    }
    if (repositories?.assessment) {
      this.repositories.set(ProgramType.ASSESSMENT, repositories.assessment);
    }
    if (repositories?.discovery) {
      this.repositories.set(ProgramType.DISCOVERY, repositories.discovery);
    }
    if (repositories?.chat) {
      this.repositories.set(ProgramType.CHAT, repositories.chat);
    }
  }

  /**
   * 獲取特定類型的 Repository
   */
  private getRepository(type: ProgramType): BaseProgramRepository {
    return this.repositories.get(type) || this.defaultRepository;
  }

  /**
   * 生成 Program ID (格式: prog_timestamp_random)
   */
  generateProgramId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `prog_${timestamp}_${random}`;
  }

  /**
   * 創建 Program
   */
  async createProgram(params: CreateProgramParams): Promise<ISoftDeletableProgram> {
    const repository = this.getRepository(params.type);
    
    // 如果是 PBL 且有專門的 repository
    if (params.type === ProgramType.PBL && repository instanceof PBLProgramRepository) {
      return repository.createPBLProgram(params as any);
    }
    
    return repository.create(params);
  }

  /**
   * 獲取 Program
   */
  async getProgram(userId: string, programId: string): Promise<ISoftDeletableProgram | null> {
    // 嘗試從各個 repository 查找
    for (const [type, repo] of this.repositories) {
      const program = await repo.getByUserAndId(userId, programId);
      if (program) {
        return program;
      }
    }
    
    // 降級到預設 repository
    return this.defaultRepository.getByUserAndId(userId, programId);
  }

  /**
   * 更新 Program
   */
  async updateProgram(
    userId: string, 
    programId: string, 
    updates: UpdateProgramParams
  ): Promise<ISoftDeletableProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return null;
    }
    
    const repository = this.getRepository(program.type);
    return repository.updateProgram(userId, programId, updates);
  }

  /**
   * 查詢 Programs
   */
  async queryPrograms(options: ProgramQueryOptions): Promise<ISoftDeletableProgram[]> {
    if (options.type) {
      // 查詢特定類型
      const repository = this.getRepository(options.type);
      return repository.query(options);
    }
    
    // 查詢所有類型
    const allPrograms: ISoftDeletableProgram[] = [];
    for (const [type, repo] of this.repositories) {
      const programs = await repo.query({ ...options, type });
      allPrograms.push(...programs);
    }
    
    // 排序
    allPrograms.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return allPrograms;
  }

  /**
   * 開始 Program
   */
  async startProgram(userId: string, programId: string): Promise<ISoftDeletableProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return null;
    }
    
    const repository = this.getRepository(program.type);
    return repository.start(userId, programId);
  }

  /**
   * 暫停 Program
   */
  async pauseProgram(userId: string, programId: string): Promise<ISoftDeletableProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return null;
    }
    
    const repository = this.getRepository(program.type);
    return repository.pause(userId, programId);
  }

  /**
   * 恢復 Program
   */
  async resumeProgram(userId: string, programId: string): Promise<ISoftDeletableProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return null;
    }
    
    const repository = this.getRepository(program.type);
    return repository.resume(userId, programId);
  }

  /**
   * 完成 Program
   */
  async completeProgram(userId: string, programId: string): Promise<ISoftDeletableProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return null;
    }
    
    const repository = this.getRepository(program.type);
    return repository.complete(userId, programId);
  }

  /**
   * 放棄 Program
   */
  async abandonProgram(userId: string, programId: string): Promise<ISoftDeletableProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return null;
    }
    
    const repository = this.getRepository(program.type);
    return repository.abandon(userId, programId);
  }

  /**
   * 刪除 Program（軟刪除）
   */
  async deleteProgram(userId: string, programId: string): Promise<boolean> {
    const program = await this.getProgram(userId, programId);
    if (!program) {
      return false;
    }
    
    const repository = this.getRepository(program.type);
    return repository.softDelete(userId, programId);
  }

  /**
   * 獲取統計資料
   */
  async getStatistics(userId?: string): Promise<ProgramStatistics> {
    const allStats: ProgramStatistics[] = [];
    
    for (const [type, repo] of this.repositories) {
      const stats = await repo.getStatistics(userId);
      allStats.push(stats);
    }
    
    // 合併統計資料
    return this.mergeStatistics(allStats);
  }

  /**
   * PBL 特定方法：完成任務
   */
  async completePBLTask(
    userId: string,
    programId: string,
    taskId: string,
    score: number
  ): Promise<IPBLProgram | null> {
    const program = await this.getProgram(userId, programId);
    if (!program || !isPBLProgram(program)) {
      return null;
    }
    
    const repository = this.getRepository(ProgramType.PBL) as PBLProgramRepository;
    return repository.completeTask(userId, programId, taskId, score);
  }

  /**
   * PBL 特定方法：獲取平均分數
   */
  async getPBLAverageScore(userId: string, programId: string): Promise<number> {
    const program = await this.getProgram(userId, programId);
    if (!program || !isPBLProgram(program)) {
      return 0;
    }
    
    const repository = this.getRepository(ProgramType.PBL) as PBLProgramRepository;
    return repository.getAverageScore(userId, programId);
  }

  /**
   * Helper: 合併統計資料
   */
  private mergeStatistics(stats: ProgramStatistics[]): ProgramStatistics {
    const merged: ProgramStatistics = {
      total: 0,
      byType: {
        [ProgramType.PBL]: 0,
        [ProgramType.ASSESSMENT]: 0,
        [ProgramType.DISCOVERY]: 0,
        [ProgramType.CHAT]: 0
      },
      byStatus: {
        [ProgramStatus.NOT_STARTED]: 0,
        [ProgramStatus.IN_PROGRESS]: 0,
        [ProgramStatus.PAUSED]: 0,
        [ProgramStatus.COMPLETED]: 0,
        [ProgramStatus.ABANDONED]: 0
      },
      averageCompletionRate: 0,
      averageTimeSpent: 0
    };

    let totalWeightedCompletion = 0;
    let totalWeightedTime = 0;
    let totalPrograms = 0;

    for (const stat of stats) {
      merged.total += stat.total;
      
      // 合併類型統計
      for (const type in stat.byType) {
        merged.byType[type as ProgramType] += stat.byType[type as ProgramType];
      }
      
      // 合併狀態統計
      for (const status in stat.byStatus) {
        merged.byStatus[status as ProgramStatus] += stat.byStatus[status as ProgramStatus];
      }
      
      // 加權平均
      if (stat.total > 0) {
        totalWeightedCompletion += stat.averageCompletionRate * stat.total;
        totalWeightedTime += stat.averageTimeSpent * stat.total;
        totalPrograms += stat.total;
      }
    }

    merged.averageCompletionRate = totalPrograms > 0 ? totalWeightedCompletion / totalPrograms : 0;
    merged.averageTimeSpent = totalPrograms > 0 ? totalWeightedTime / totalPrograms : 0;

    return merged;
  }
}