/**
 * GCS Program Repository
 * 使用 GCS 儲存的 Program Repository 實作
 */

import { UserCentricGCSProvider } from '../../storage/providers/user-centric-gcs.provider';
import { BaseProgramRepository } from './base-program.repository';
import { ISoftDeletableProgram } from '../types';

export class GCSProgramRepository extends BaseProgramRepository {
  constructor(storageProvider: UserCentricGCSProvider) {
    super(storageProvider);
  }

  /**
   * Implementation of abstract method from BaseProgramRepository
   */
  protected async queryByTrackId(trackId: string): Promise<ISoftDeletableProgram[]> {
    // GCS doesn't support direct query by trackId without userId
    // This method requires scanning all users which is not efficient
    // In practice, always use query() with userId parameter
    console.warn('queryByTrackId without userId is not efficient in GCS implementation');
    return [];
  }

  /**
   * 查詢用戶的所有 Programs
   */
  protected async queryUserPrograms(userId: string): Promise<ISoftDeletableProgram[]> {
    try {
      const prefix = `program:${userId}:`;
      return await this.storageProvider.list<ISoftDeletableProgram>(prefix);
    } catch (error) {
      console.error('Error querying user programs:', error);
      return [];
    }
  }

  /**
   * 查詢 Track 的所有 Programs
   */
  protected async queryTrackPrograms(userId: string, trackId: string): Promise<ISoftDeletableProgram[]> {
    try {
      // 先獲取用戶所有 Programs，然後篩選
      const allPrograms = await this.queryUserPrograms(userId);
      return allPrograms.filter(program => program.trackId === trackId);
    } catch (error) {
      console.error('Error querying track programs:', error);
      return [];
    }
  }

  /**
   * 更新 Track 的程序索引
   */
  protected async updateTrackProgramIndex(
    userId: string,
    trackId: string,
    programId: string
  ): Promise<void> {
    try {
      // 更新 Track 的程序列表索引
      const trackProgramIndexKey = `index:track:${userId}:${trackId}:programs`;
      const trackProgramIndex = await this.storageProvider.get<string[]>(trackProgramIndexKey) || [];
      
      const programKey = this.getProgramKey(userId, programId);
      if (!trackProgramIndex.includes(programKey)) {
        trackProgramIndex.push(programKey);
        await this.storageProvider.set(trackProgramIndexKey, trackProgramIndex);
      }

      // 更新用戶程序索引
      const userProgramIndexKey = `index:user:${userId}:programs`;
      const userProgramIndex = await this.storageProvider.get<string[]>(userProgramIndexKey) || [];
      
      if (!userProgramIndex.includes(programKey)) {
        userProgramIndex.push(programKey);
        await this.storageProvider.set(userProgramIndexKey, userProgramIndex);
      }
    } catch (error) {
      console.error('Error updating program index:', error);
    }
  }

  /**
   * 獲取 Track 的所有 Programs
   */
  async getProgramsByTrack(userId: string, trackId: string): Promise<ISoftDeletableProgram[]> {
    try {
      const allPrograms = await this.queryUserPrograms(userId);
      return allPrograms.filter(program => 
        program.trackId === trackId && !program.deletedAt
      );
    } catch (error) {
      console.error('Error getting programs by track:', error);
      return [];
    }
  }

  /**
   * 獲取用戶的活躍 Programs
   */
  async getActivePrograms(userId: string): Promise<ISoftDeletableProgram[]> {
    try {
      const allPrograms = await this.queryUserPrograms(userId);
      return allPrograms.filter(program => 
        (program.status === 'IN_PROGRESS' || program.status === 'PAUSED') && 
        !program.deletedAt
      );
    } catch (error) {
      console.error('Error getting active programs:', error);
      return [];
    }
  }

  /**
   * 清理索引（移除已刪除的程序）
   */
  async cleanupIndex(userId: string, trackId?: string): Promise<void> {
    try {
      if (trackId) {
        // 清理 Track 程序索引
        const trackProgramIndexKey = `index:track:${userId}:${trackId}:programs`;
        const trackProgramIndex = await this.storageProvider.get<string[]>(trackProgramIndexKey) || [];
        
        const validPrograms = [];
        for (const programKey of trackProgramIndex) {
          const program = await this.storageProvider.get<ISoftDeletableProgram>(programKey);
          if (program && !program.deletedAt) {
            validPrograms.push(programKey);
          }
        }
        
        await this.storageProvider.set(trackProgramIndexKey, validPrograms);
      } else {
        // 清理用戶程序索引
        const userProgramIndexKey = `index:user:${userId}:programs`;
        const userProgramIndex = await this.storageProvider.get<string[]>(userProgramIndexKey) || [];
        
        const validPrograms = [];
        for (const programKey of userProgramIndex) {
          const program = await this.storageProvider.get<ISoftDeletableProgram>(programKey);
          if (program && !program.deletedAt) {
            validPrograms.push(programKey);
          }
        }
        
        await this.storageProvider.set(userProgramIndexKey, validPrograms);
      }
    } catch (error) {
      console.error('Error cleaning up program index:', error);
    }
  }
}