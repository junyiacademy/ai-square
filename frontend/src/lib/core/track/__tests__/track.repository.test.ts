/**
 * TrackRepository 測試
 */

import { TrackRepository } from '../repositories/track.repository';
import { MockStorageProvider } from '../../storage/providers/mock-storage.provider';
import {
  TrackType,
  TrackStatus,
  CreateTrackParams,
  PBLTrackContext
} from '../types';

describe('TrackRepository', () => {
  let repository: TrackRepository;
  let storage: MockStorageProvider;
  
  beforeEach(() => {
    storage = new MockStorageProvider();
    repository = new TrackRepository(storage);
  });
  
  describe('createTrack', () => {
    it('should create a new track with default values', async () => {
      const params: CreateTrackParams = {
        userId: 'user123',
        projectId: 'project456',
        type: TrackType.PBL,
        context: {
          scenarioId: 'scenario1',
          programId: 'program1'
        }
      };
      
      const track = await repository.createTrack(params);
      
      expect(track).toMatchObject({
        id: expect.any(String),
        userId: 'user123',
        projectId: 'project456',
        type: TrackType.PBL,
        status: TrackStatus.ACTIVE,
        startedAt: expect.any(Date),
        metadata: {
          language: 'en',
          version: '1.0.0'
        },
        isDeleted: false,
        deletedAt: null
      });
      
      // 檢查 context 初始化
      const context = track.context as PBLTrackContext;
      expect(context.type).toBe('pbl');
      expect(context.scenarioId).toBe('scenario1');
      expect(context.programId).toBe('program1');
      expect(context.completedTaskIds).toEqual([]);
      expect(context.taskProgress).toEqual({});
    });
    
    it('should merge provided metadata', async () => {
      const params: CreateTrackParams = {
        userId: 'user123',
        projectId: 'project456',
        type: TrackType.ASSESSMENT,
        metadata: {
          language: 'zh-TW',
          title: 'My Assessment',
          tags: ['test', 'demo']
        },
        context: {
          assessmentId: 'assessment1'
        }
      };
      
      const track = await repository.createTrack(params);
      
      expect(track.metadata).toMatchObject({
        language: 'zh-TW',
        version: '1.0.0',
        title: 'My Assessment',
        tags: ['test', 'demo']
      });
    });
  });
  
  describe('track lifecycle', () => {
    let trackId: string;
    
    beforeEach(async () => {
      const track = await repository.createTrack({
        userId: 'user123',
        projectId: 'project456',
        type: TrackType.PBL,
        context: {}
      });
      trackId = track.id;
    });
    
    it('should pause a track', async () => {
      const paused = await repository.pauseTrack(trackId);
      expect(paused.status).toBe(TrackStatus.PAUSED);
    });
    
    it('should resume a paused track', async () => {
      await repository.pauseTrack(trackId);
      const resumed = await repository.resumeTrack(trackId);
      expect(resumed.status).toBe(TrackStatus.ACTIVE);
    });
    
    it('should not resume a non-paused track', async () => {
      await expect(repository.resumeTrack(trackId)).rejects.toThrow('is not paused');
    });
    
    it('should complete a track', async () => {
      const completed = await repository.completeTrack(trackId);
      expect(completed.status).toBe(TrackStatus.COMPLETED);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
    
    it('should abandon a track', async () => {
      const abandoned = await repository.abandonTrack(trackId);
      expect(abandoned.status).toBe(TrackStatus.ABANDONED);
    });
  });
  
  describe('findActiveTracksByUser', () => {
    beforeEach(async () => {
      // 創建多個不同狀態的 tracks
      await repository.createTrack({
        userId: 'user123',
        projectId: 'project1',
        type: TrackType.PBL,
        context: {}
      });
      
      const track2 = await repository.createTrack({
        userId: 'user123',
        projectId: 'project2',
        type: TrackType.ASSESSMENT,
        context: {}
      });
      await repository.completeTrack(track2.id);
      
      await repository.createTrack({
        userId: 'user456',
        projectId: 'project3',
        type: TrackType.DISCOVERY,
        context: {}
      });
    });
    
    it('should find only active tracks for a user', async () => {
      const activeTracks = await repository.findActiveTracksByUser('user123');
      
      expect(activeTracks).toHaveLength(1);
      expect(activeTracks[0].userId).toBe('user123');
      expect(activeTracks[0].status).toBe(TrackStatus.ACTIVE);
      expect(activeTracks[0].type).toBe(TrackType.PBL);
    });
  });
  
  describe('updateTrack', () => {
    let trackId: string;
    
    beforeEach(async () => {
      const track = await repository.createTrack({
        userId: 'user123',
        projectId: 'project456',
        type: TrackType.PBL,
        context: {
          scenarioId: 'scenario1',
          programId: 'program1'
        }
      });
      trackId = track.id;
    });
    
    it('should update track metadata', async () => {
      const updated = await repository.updateTrack(trackId, {
        metadata: {
          title: 'Updated Title',
          description: 'New description'
        }
      });
      
      expect(updated.metadata.title).toBe('Updated Title');
      expect(updated.metadata.description).toBe('New description');
      expect(updated.metadata.language).toBe('en'); // 保留原有值
    });
    
    it('should merge context updates', async () => {
      const updated = await repository.updateTrack(trackId, {
        context: {
          currentTaskId: 'task1',
          completedTaskIds: ['task0']
        }
      });
      
      const context = updated.context as PBLTrackContext;
      expect(context.type).toBe('pbl'); // 保留 type
      expect(context.currentTaskId).toBe('task1');
      expect(context.completedTaskIds).toEqual(['task0']);
      expect(context.scenarioId).toBe('scenario1'); // 保留原有值
    });
    
    it('should handle array merging in context', async () => {
      // 先更新一次
      await repository.updateTrack(trackId, {
        context: {
          completedTaskIds: ['task1', 'task2']
        }
      });
      
      // 再更新，應該合併而不是覆蓋
      const updated = await repository.updateTrack(trackId, {
        context: {
          completedTaskIds: ['task2', 'task3']
        }
      });
      
      const context = updated.context as PBLTrackContext;
      expect(context.completedTaskIds).toEqual(['task1', 'task2', 'task3']);
    });
  });
  
  describe('getTrackStats', () => {
    beforeEach(async () => {
      // 創建測試資料
      const track1 = await repository.createTrack({
        userId: 'user123',
        projectId: 'project1',
        type: TrackType.PBL,
        context: {}
      });
      
      const track2 = await repository.createTrack({
        userId: 'user123',
        projectId: 'project2',
        type: TrackType.ASSESSMENT,
        context: {}
      });
      await repository.completeTrack(track2.id);
      
      const track3 = await repository.createTrack({
        userId: 'user123',
        projectId: 'project3',
        type: TrackType.PBL,
        context: {}
      });
      await repository.pauseTrack(track3.id);
      
      const track4 = await repository.createTrack({
        userId: 'user123',
        projectId: 'project4',
        type: TrackType.DISCOVERY,
        context: {}
      });
      await repository.abandonTrack(track4.id);
    });
    
    it('should calculate correct statistics', async () => {
      const stats = await repository.getTrackStats('user123');
      
      expect(stats).toMatchObject({
        total: 4,
        active: 1,
        completed: 1,
        abandoned: 1,
        paused: 1,
        byType: {
          [TrackType.PBL]: 2,
          [TrackType.ASSESSMENT]: 1,
          [TrackType.DISCOVERY]: 1
        },
        completionRate: 25 // 1/4 = 25%
      });
    });
  });
  
  describe('cleanupExpiredTracks', () => {
    it('should cleanup soft deleted tracks older than specified days', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-15');
      jest.setSystemTime(now);
      
      // 創建並軟刪除一個舊 track
      const oldTrack = await repository.createTrack({
        userId: 'user123',
        projectId: 'old-project',
        type: TrackType.PBL,
        context: {}
      });
      await repository.softDelete(oldTrack.id);
      
      // 前進時間
      jest.setSystemTime(new Date('2024-02-20'));
      
      // 創建一個新的 track
      const newTrack = await repository.createTrack({
        userId: 'user123',
        projectId: 'new-project',
        type: TrackType.PBL,
        context: {}
      });
      await repository.softDelete(newTrack.id);
      
      // 清理超過 30 天的
      const cleaned = await repository.cleanupExpiredTracks(30);
      
      expect(cleaned).toBe(1);
      
      // 檢查結果
      const allTracks = await repository.findAll({ includeDeleted: true });
      expect(allTracks).toHaveLength(1);
      expect(allTracks[0].id).toBe(newTrack.id);
      
      jest.useRealTimers();
    });
    
    it('should cleanup abandoned tracks older than specified days', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-15');
      jest.setSystemTime(now);
      
      const track = await repository.createTrack({
        userId: 'user123',
        projectId: 'project',
        type: TrackType.PBL,
        context: {}
      });
      await repository.abandonTrack(track.id);
      
      // 前進時間
      jest.setSystemTime(new Date('2024-02-20'));
      
      const cleaned = await repository.cleanupExpiredTracks(30);
      
      expect(cleaned).toBe(1);
      
      jest.useRealTimers();
    });
  });
});