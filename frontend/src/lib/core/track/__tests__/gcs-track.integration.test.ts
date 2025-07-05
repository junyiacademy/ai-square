/**
 * GCS Track Integration Test
 * 測試用戶優先的 GCS 儲存結構
 */

import { UserCentricGCSProvider } from '../../storage/providers/user-centric-gcs.provider';
import { GCSTrackRepository } from '../repositories/gcs-track.repository';
import { TrackService } from '../services/track.service';
import { EvaluationRepository } from '../repositories/evaluation.repository';
import { TrackType, TrackStatus } from '../types';

// Mock GCS
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockImplementation((path: string) => ({
        exists: jest.fn().mockResolvedValue([false]),
        save: jest.fn().mockResolvedValue(undefined),
        download: jest.fn().mockResolvedValue([Buffer.from('{}')]),
        delete: jest.fn().mockResolvedValue(undefined),
        getMetadata: jest.fn().mockResolvedValue([{
          size: '1024',
          updated: new Date().toISOString(),
          contentType: 'application/json'
        }])
      })),
      getFiles: jest.fn().mockResolvedValue([[]]),
      deleteFiles: jest.fn().mockResolvedValue(undefined)
    })
  }))
}));

describe('GCS Track Integration', () => {
  let storageProvider: UserCentricGCSProvider;
  let trackRepository: GCSTrackRepository;
  let evaluationRepository: EvaluationRepository;
  let trackService: TrackService;
  
  const testUser1 = 'test1@example.com';
  const testUser2 = 'test2@example.com';

  beforeEach(() => {
    // 初始化
    storageProvider = new UserCentricGCSProvider({
      bucketName: 'test-bucket',
      projectId: 'test-project',
      indexUpdateInterval: 100 // 100ms for testing
    });
    
    trackRepository = new GCSTrackRepository(storageProvider);
    evaluationRepository = new EvaluationRepository(storageProvider);
    trackService = new TrackService(trackRepository, evaluationRepository);
  });

  afterEach(async () => {
    // 清理
    await storageProvider.dispose();
  });

  describe('用戶優先的目錄結構', () => {
    it('應該將 Track 儲存在正確的用戶目錄下', async () => {
      // 創建 Track
      const track = await trackService.createTrack({
        userId: testUser1,
        projectId: 'ai-ethics',
        type: TrackType.PBL,
        metadata: {
          title: 'AI 倫理學習',
          language: 'zh-TW'
        },
        context: {
          type: 'pbl',
          scenarioId: 'ai-ethics',
          programId: 'prog_123'
        }
      });

      // 驗證儲存路徑
      const mockBucket = (storageProvider as any).bucket;
      const mockFile = mockBucket.file;
      
      expect(mockFile).toHaveBeenCalledWith(
        expect.stringMatching(`users/${testUser1}/tracks/${track.id}.json`)
      );
    });

    it('應該能查詢特定用戶的所有 Tracks', async () => {
      // Mock 回傳資料
      const mockTracks = [
        {
          id: 'track_1',
          userId: testUser1,
          type: TrackType.PBL,
          status: TrackStatus.ACTIVE
        },
        {
          id: 'track_2',
          userId: testUser1,
          type: TrackType.ASSESSMENT,
          status: TrackStatus.COMPLETED
        }
      ];

      // Mock getFiles 回傳
      const mockBucket = (storageProvider as any).bucket;
      mockBucket.getFiles.mockResolvedValueOnce([
        mockTracks.map(t => ({
          name: `users/${testUser1}/tracks/${t.id}.json`,
          download: jest.fn().mockResolvedValue([
            Buffer.from(JSON.stringify({ value: t }))
          ])
        }))
      ]);

      // 查詢
      const tracks = await trackService.queryTracks({
        userId: testUser1
      });

      expect(tracks).toHaveLength(2);
      expect(tracks[0].userId).toBe(testUser1);
      expect(tracks[1].userId).toBe(testUser1);
    });

    it('應該更新用戶索引', async () => {
      // 創建 Track
      const track = await trackService.createTrack({
        userId: testUser1,
        projectId: 'test-project',
        type: TrackType.DISCOVERY,
        metadata: {
          title: '探索 AI'
        }
      });

      // 等待索引更新
      await new Promise(resolve => setTimeout(resolve, 150));

      // 驗證索引檔案被創建
      const mockBucket = (storageProvider as any).bucket;
      const mockFile = mockBucket.file;
      
      // 應該更新用戶索引
      expect(mockFile).toHaveBeenCalledWith(
        expect.stringContaining(`indexes/users/${testUser1}/summary.json`)
      );
    });
  });

  describe('Track 生命週期管理', () => {
    let testTrack: any;

    beforeEach(async () => {
      // Mock 創建成功
      const mockBucket = (storageProvider as any).bucket;
      mockBucket.file.mockImplementation((path: string) => ({
        exists: jest.fn().mockResolvedValue([true]),
        save: jest.fn().mockResolvedValue(undefined),
        download: jest.fn().mockImplementation(() => {
          if (path.includes('track_test')) {
            return Promise.resolve([Buffer.from(JSON.stringify({
              value: testTrack
            }))]);
          }
          return Promise.resolve([Buffer.from('{}')]);
        }),
        delete: jest.fn().mockResolvedValue(undefined)
      }));

      testTrack = await trackService.createTrack({
        userId: testUser1,
        projectId: 'test',
        type: TrackType.PBL,
        metadata: { title: 'Test Track' }
      });
      testTrack.id = 'track_test'; // 固定 ID for mocking
    });

    it('應該能暫停和恢復 Track', async () => {
      // 暫停
      const pausedTrack = await trackService.pauseTrack(testTrack.id);
      expect(pausedTrack?.status).toBe(TrackStatus.PAUSED);
      expect(pausedTrack?.pausedAt).toBeDefined();

      // 恢復
      const resumedTrack = await trackService.resumeTrack(testTrack.id);
      expect(resumedTrack?.status).toBe(TrackStatus.ACTIVE);
      expect(resumedTrack?.resumedAt).toBeDefined();
    });

    it('應該能完成 Track', async () => {
      const completedTrack = await trackService.completeTrack(testTrack.id);
      expect(completedTrack?.status).toBe(TrackStatus.COMPLETED);
      expect(completedTrack?.completedAt).toBeDefined();
    });

    it('應該能軟刪除 Track', async () => {
      const result = await trackService.deleteTrack(testTrack.id);
      expect(result).toBe(true);
      
      // 驗證被標記為刪除
      const deletedTrack = await trackService.getTrack(testTrack.id);
      expect(deletedTrack?.deletedAt).toBeDefined();
      expect(deletedTrack?.status).toBe(TrackStatus.ABANDONED);
    });
  });

  describe('統計功能', () => {
    it('應該能計算用戶的 Track 統計', async () => {
      // Mock 多個 Tracks
      const mockTracks = [
        { type: TrackType.PBL, status: TrackStatus.ACTIVE },
        { type: TrackType.PBL, status: TrackStatus.COMPLETED },
        { type: TrackType.ASSESSMENT, status: TrackStatus.ACTIVE },
        { type: TrackType.DISCOVERY, status: TrackStatus.PAUSED }
      ].map((t, i) => ({
        id: `track_${i}`,
        userId: testUser1,
        ...t
      }));

      const mockBucket = (storageProvider as any).bucket;
      mockBucket.getFiles.mockResolvedValueOnce([
        mockTracks.map(t => ({
          name: `users/${testUser1}/tracks/${t.id}.json`,
          download: jest.fn().mockResolvedValue([
            Buffer.from(JSON.stringify({ value: t }))
          ])
        }))
      ]);

      // 獲取統計
      const stats = await trackService.getStatistics(testUser1);
      
      expect(stats.total).toBe(4);
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.paused).toBe(1);
      expect(stats.byType[TrackType.PBL]).toBe(2);
      expect(stats.byType[TrackType.ASSESSMENT]).toBe(1);
      expect(stats.byType[TrackType.DISCOVERY]).toBe(1);
    });
  });

  describe('資料一致性', () => {
    it('應該在更新 Track 時保持 userId 不變', async () => {
      // 創建 Track
      const track = await trackService.createTrack({
        userId: testUser1,
        projectId: 'test',
        type: TrackType.PBL
      });

      // 嘗試更新（不應該改變 userId）
      const updated = await trackService.updateTrack(track.id, {
        metadata: { title: 'Updated Title' },
        userId: testUser2 // 這應該被忽略
      } as any);

      expect(updated?.userId).toBe(testUser1); // userId 應該保持不變
    });

    it('應該正確處理並發更新', async () => {
      const track = await trackService.createTrack({
        userId: testUser1,
        projectId: 'test',
        type: TrackType.PBL
      });

      // 模擬並發更新
      const updates = Promise.all([
        trackService.updateTrack(track.id, { metadata: { title: 'Title 1' } }),
        trackService.updateTrack(track.id, { metadata: { title: 'Title 2' } }),
        trackService.updateTrack(track.id, { metadata: { title: 'Title 3' } })
      ]);

      const results = await updates;
      
      // 所有更新都應該成功
      expect(results.every(r => r !== null)).toBe(true);
      
      // 最終狀態應該是其中一個更新的結果
      const finalTrack = await trackService.getTrack(track.id);
      expect(['Title 1', 'Title 2', 'Title 3']).toContain(
        finalTrack?.metadata.title
      );
    });
  });
});