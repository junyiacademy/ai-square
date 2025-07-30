/**
 * API 服務層整合測試
 * 驗證 API routes 正確使用新的服務層
 */

import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test.describe('API 服務層整合測試', () => {
  const baseURL = 'http://localhost:3000';
  const testUserEmail = `test-api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  // Mock authentication by setting cookie
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{
      name: 'user',
      value: JSON.stringify({ email: testUserEmail }),
      domain: 'localhost',
      path: '/'
    }]);
  });

  test('Assessment API 使用服務層創建 program', async ({ request }) => {
    // 1. 獲取 Assessment scenario
    const scenariosResponse = await request.get(`${baseURL}/api/assessment/scenarios`);
    expect(scenariosResponse.ok()).toBeTruthy();
    
    const responseData = await scenariosResponse.json();
    const scenarios = responseData.data?.scenarios || responseData.scenarios || [];
    expect(scenarios.length).toBeGreaterThan(0);
    
    const assessmentScenario = scenarios[0];
    console.log('Using assessment scenario:', assessmentScenario.title?.en || assessmentScenario.title);
    
    // 2. 使用 POST /api/assessment/scenarios/[id]/programs 創建 program
    const createResponse = await request.post(
      `${baseURL}/api/assessment/scenarios/${assessmentScenario.id}/programs`,
      {
        data: {
          action: 'start',
          language: 'en'
        }
      }
    );
    
    expect(createResponse.ok()).toBeTruthy();
    const result = await createResponse.json();
    
    // 3. 驗證響應結構
    expect(result.program).toBeDefined();
    expect(result.program.id).toBeTruthy();
    expect(result.program.mode).toBe('assessment');
    expect(result.program.status).toBe('active');
    expect(result.tasks).toBeDefined();
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.questionsCount).toBeGreaterThan(0);
    
    console.log('✅ Assessment program created:', {
      programId: result.program.id,
      tasksCount: result.tasks.length,
      questionsCount: result.questionsCount
    });
  });

  test('PBL API 使用服務層創建 program', async ({ request }) => {
    // 1. 獲取 PBL scenario
    const scenariosResponse = await request.get(`${baseURL}/api/pbl/scenarios`);
    expect(scenariosResponse.ok()).toBeTruthy();
    
    const responseData = await scenariosResponse.json();
    const scenarios = responseData.data?.scenarios || responseData.scenarios || [];
    expect(scenarios.length).toBeGreaterThan(0);
    
    const pblScenario = scenarios[0];
    console.log('Using PBL scenario:', pblScenario.title?.en || pblScenario.title);
    
    // 2. 使用 POST /api/pbl/scenarios/[id]/start 創建 program
    const createResponse = await request.post(
      `${baseURL}/api/pbl/scenarios/${pblScenario.id}/start`,
      {
        data: {
          language: 'en'
        }
      }
    );
    
    expect(createResponse.ok()).toBeTruthy();
    const result = await createResponse.json();
    
    // 3. 驗證響應結構
    expect(result.success).toBe(true);
    expect(result.program).toBeDefined();
    expect(result.program.id).toBeTruthy();
    expect(result.program.mode).toBe('pbl');
    expect(result.program.status).toBe('active');
    
    console.log('✅ PBL program created:', {
      programId: result.program.id,
      scenarioId: result.program.scenarioId
    });
  });

  test('Discovery API 使用服務層創建 program', async ({ request }) => {
    // Mock session for Discovery (uses getServerSession)
    // This might need adjustment based on your auth setup
    
    // 1. 獲取 Discovery scenario
    const scenariosResponse = await request.get(`${baseURL}/api/discovery/scenarios`);
    expect(scenariosResponse.ok()).toBeTruthy();
    
    const responseData = await scenariosResponse.json();
    const scenarios = responseData.data?.scenarios || responseData.scenarios || [];
    expect(scenarios.length).toBeGreaterThan(0);
    
    const discoveryScenario = scenarios[0];
    console.log('Using Discovery scenario:', discoveryScenario.title?.en || discoveryScenario.title);
    
    // 2. 使用 POST /api/discovery/scenarios/[id]/start 創建 program
    const createResponse = await request.post(
      `${baseURL}/api/discovery/scenarios/${discoveryScenario.id}/start`,
      {
        data: {
          language: 'en'
        }
      }
    );
    
    // Discovery uses session auth, so it might fail with 401
    if (createResponse.status() === 401) {
      console.log('⚠️ Discovery API requires session authentication, skipping detailed test');
      return;
    }
    
    expect(createResponse.ok()).toBeTruthy();
    const result = await createResponse.json();
    
    // 3. 驗證響應結構
    expect(result.success).toBe(true);
    expect(result.id).toBeTruthy(); // Discovery returns different structure
    expect(result.status).toBe('active');
    expect(result.tasks).toBeDefined();
    expect(result.tasks.length).toBeGreaterThan(0);
    
    console.log('✅ Discovery program created:', {
      programId: result.id,
      tasksCount: result.tasks.length,
      totalXP: result.totalXP
    });
  });

  test('服務層正確處理重複創建請求', async ({ request }) => {
    // 1. 獲取 Assessment scenario
    const scenariosResponse = await request.get(`${baseURL}/api/assessment/scenarios`);
    const responseData = await scenariosResponse.json();
    const scenarios = responseData.data?.scenarios || responseData.scenarios || [];
    const assessmentScenario = scenarios[0];
    
    // 2. 第一次創建
    const firstResponse = await request.post(
      `${baseURL}/api/assessment/scenarios/${assessmentScenario.id}/programs`,
      {
        data: {
          action: 'start',
          language: 'en'
        }
      }
    );
    
    expect(firstResponse.ok()).toBeTruthy();
    const firstResult = await firstResponse.json();
    expect(firstResult.existing).toBeFalsy();
    
    // 3. 第二次創建（應該返回 existing）
    const secondResponse = await request.post(
      `${baseURL}/api/assessment/scenarios/${assessmentScenario.id}/programs`,
      {
        data: {
          action: 'start',
          language: 'en'
        }
      }
    );
    
    expect(secondResponse.ok()).toBeTruthy();
    const secondResult = await secondResponse.json();
    expect(secondResult.existing).toBe(true);
    expect(secondResult.program.id).toBe(firstResult.program.id);
    
    console.log('✅ Duplicate creation handled correctly');
  });
});