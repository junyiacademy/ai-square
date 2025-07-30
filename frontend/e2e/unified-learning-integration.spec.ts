/**
 * 統一學習架構整合測試
 * 驗證三種學習模式的基本整合功能
 */

import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// 資料庫配置
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'ai_square_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

test.describe.configure({ mode: 'serial' });
test.describe('統一學習架構整合測試', () => {
  let testUserId: string;
  let testUserEmail: string;

  test.beforeAll(async () => {
    testUserId = uuidv4();
    testUserEmail = `test-integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    
    // 清理可能存在的測試資料
    await pool.query('DELETE FROM user_achievements WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM evaluations WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id = $1)', [testUserId]);
    await pool.query('DELETE FROM programs WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test-integration-%@example.com']);
    
    // 創建測試用戶
    await pool.query(`
      INSERT INTO users (id, email, name, preferred_language, level, total_xp, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [testUserId, testUserEmail, 'Integration Test User', 'en', 1, 0, true]);
  });

  test.afterAll(async () => {
    // 清理測試資料
    await pool.query('DELETE FROM user_achievements WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM evaluations WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id = $1)', [testUserId]);
    await pool.query('DELETE FROM programs WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    
    await pool.end();
  });

  test('資料庫中存在所有三種學習模式的 scenarios', async () => {
    const assessmentCount = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['assessment']);
    const pblCount = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['pbl']);
    const discoveryCount = await pool.query('SELECT COUNT(*) FROM scenarios WHERE mode = $1', ['discovery']);

    expect(parseInt(assessmentCount.rows[0].count)).toBeGreaterThan(0);
    expect(parseInt(pblCount.rows[0].count)).toBeGreaterThan(0);
    expect(parseInt(discoveryCount.rows[0].count)).toBeGreaterThan(0);
  });

  test('能夠創建 Assessment Program', async () => {
    // 獲取第一個 Assessment scenario
    const scenarioResult = await pool.query(
      'SELECT id, title FROM scenarios WHERE mode = $1 AND status = $2 LIMIT 1',
      ['assessment', 'active']
    );
    
    expect(scenarioResult.rows.length).toBe(1);
    
    const scenario = scenarioResult.rows[0];
    const programId = uuidv4();
    
    // 創建 Program
    await pool.query(`
      INSERT INTO programs (
        id, user_id, scenario_id, mode, status, current_task_index,
        completed_task_count, total_task_count, total_score, domain_scores,
        xp_earned, badges_earned, created_at, started_at, updated_at,
        last_activity_at, time_spent_seconds, pbl_data, discovery_data,
        assessment_data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      programId, testUserId, scenario.id, 'assessment', 'active', 0,
      0, 1, 0, {}, 0, [], new Date().toISOString(), new Date().toISOString(),
      new Date().toISOString(), new Date().toISOString(), 0, {}, {},
      { selectedQuestions: [], timeStarted: new Date().toISOString() },
      { language: 'en' }
    ]);
    
    // 驗證 Program 創建成功
    const programResult = await pool.query('SELECT * FROM programs WHERE id = $1', [programId]);
    expect(programResult.rows.length).toBe(1);
    expect(programResult.rows[0].mode).toBe('assessment');
  });

  test('能夠創建 PBL Program', async () => {
    // 獲取第一個 PBL scenario
    const scenarioResult = await pool.query(
      'SELECT id, title, task_templates FROM scenarios WHERE mode = $1 AND status = $2 LIMIT 1',
      ['pbl', 'active']
    );
    
    expect(scenarioResult.rows.length).toBe(1);
    
    const scenario = scenarioResult.rows[0];
    const programId = uuidv4();
    const taskTemplates = scenario.task_templates || [];
    
    // 創建 Program
    await pool.query(`
      INSERT INTO programs (
        id, user_id, scenario_id, mode, status, current_task_index,
        completed_task_count, total_task_count, total_score, domain_scores,
        xp_earned, badges_earned, created_at, started_at, updated_at,
        last_activity_at, time_spent_seconds, pbl_data, discovery_data,
        assessment_data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      programId, testUserId, scenario.id, 'pbl', 'active', 0,
      0, taskTemplates.length, 0, {}, 0, [], new Date().toISOString(),
      new Date().toISOString(), new Date().toISOString(), new Date().toISOString(),
      0, { language: 'en', currentPhase: 'understanding' }, {}, {}, { language: 'en' }
    ]);
    
    // 驗證 Program 創建成功
    const programResult = await pool.query('SELECT * FROM programs WHERE id = $1', [programId]);
    expect(programResult.rows.length).toBe(1);
    expect(programResult.rows[0].mode).toBe('pbl');
  });

  test('能夠創建 Discovery Program', async () => {
    // 獲取第一個 Discovery scenario
    const scenarioResult = await pool.query(
      'SELECT id, title, discovery_data FROM scenarios WHERE mode = $1 AND status = $2 LIMIT 1',
      ['discovery', 'active']
    );
    
    expect(scenarioResult.rows.length).toBe(1);
    
    const scenario = scenarioResult.rows[0];
    const programId = uuidv4();
    const discoveryData = scenario.discovery_data;
    
    // 創建 Program
    await pool.query(`
      INSERT INTO programs (
        id, user_id, scenario_id, mode, status, current_task_index,
        completed_task_count, total_task_count, total_score, domain_scores,
        xp_earned, badges_earned, created_at, started_at, updated_at,
        last_activity_at, time_spent_seconds, pbl_data, discovery_data,
        assessment_data, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      programId, testUserId, scenario.id, 'discovery', 'active', 0,
      0, 4, 0, {}, 0, [], new Date().toISOString(), new Date().toISOString(),
      new Date().toISOString(), new Date().toISOString(), 0, {}, 
      JSON.stringify({
        totalXP: 0,
        level: 1,
        achievements: [],
        unlockedSkills: [],
        completedChallenges: [],
        currentCareer: discoveryData.pathId || 'unknown',
        worldSetting: discoveryData.worldSetting?.name?.en || 'Adventure World'
      }),
      {}, { language: 'en' }
    ]);
    
    // 驗證 Program 創建成功
    const programResult = await pool.query('SELECT * FROM programs WHERE id = $1', [programId]);
    expect(programResult.rows.length).toBe(1);
    expect(programResult.rows[0].mode).toBe('discovery');
  });

  test('驗證模式傳播正確性', async () => {
    // 檢查所有 programs 的模式傳播
    const modeCheck = await pool.query(`
      SELECT 
        s.mode as scenario_mode,
        p.mode as program_mode,
        COUNT(*) as count
      FROM scenarios s
      JOIN programs p ON s.id = p.scenario_id
      WHERE p.user_id = $1
      GROUP BY s.mode, p.mode
    `, [testUserId]);
    
    // 驗證每個 program 的 mode 都與對應 scenario 的 mode 一致
    modeCheck.rows.forEach(row => {
      expect(row.scenario_mode).toBe(row.program_mode);
    });
    
    // 驗證有三種不同的模式
    expect(modeCheck.rows.length).toBe(3);
  });
});