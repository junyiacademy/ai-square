/**
 * Discovery API 測試
 * 直接測試 API 端點而不依賴 UI
 */

import { test, expect } from '@playwright/test';

test.describe('Discovery API Test', () => {
  let cookies: string;

  test.beforeEach(async ({ page }) => {
    // 使用頁面登入以取得正確的 cookies
    await page.goto('/login');
    
    // 點擊 Student 示範帳號按鈕
    await page.locator('button:has-text("Student")').click();
    
    // 等待登入完成
    await page.waitForURL(/\/(onboarding|discovery|assessment|dashboard)/, { timeout: 10000 });
    
    // 取得 cookies
    const context = page.context();
    const allCookies = await context.cookies();
    cookies = allCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    
    console.log('Login successful with cookies');
  });

  test('Discovery scenarios API', async ({ request }) => {
    const response = await request.get('/api/discovery/scenarios', {
      headers: {
        'Cookie': cookies
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.scenarios).toBeDefined();
    expect(Array.isArray(data.data.scenarios)).toBe(true);
    
    console.log('Found scenarios:', data.data.scenarios.length);
    
    if (data.data.scenarios.length > 0) {
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario).toHaveProperty('id');
      expect(firstScenario).toHaveProperty('title');
      expect(firstScenario).toHaveProperty('mode', 'discovery');
      
      console.log('First scenario:', firstScenario.title);
    }
  });

  test('Create Discovery program', async ({ request }) => {
    // 先取得一個 scenario
    const scenariosResponse = await request.get('/api/discovery/scenarios', {
      headers: {
        'Cookie': cookies
      }
    });
    
    const scenariosData = await scenariosResponse.json();
    const scenario = scenariosData.data.scenarios[0];
    
    if (!scenario) {
      test.skip('No scenarios available');
      return;
    }
    
    // 建立 program
    const createResponse = await request.post('/api/discovery/programs', {
      headers: {
        'Cookie': cookies
      },
      data: {
        scenarioId: scenario.id
      }
    });
    
    expect(createResponse.status()).toBe(201);
    const createData = await createResponse.json();
    
    expect(createData.success).toBe(true);
    expect(createData.data.program).toBeDefined();
    expect(createData.data.program.scenarioId).toBe(scenario.id);
    expect(createData.data.program.status).toBe('active');
    
    console.log('Created program:', createData.data.program.id);
    
    // 測試取得 program tasks
    const tasksResponse = await request.get(`/api/discovery/programs/${createData.data.program.id}/tasks`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    expect(tasksResponse.ok()).toBeTruthy();
    const tasksData = await tasksResponse.json();
    
    expect(tasksData.success).toBe(true);
    expect(Array.isArray(tasksData.data.tasks)).toBe(true);
    expect(tasksData.data.tasks.length).toBeGreaterThan(0);
    
    console.log('Program has tasks:', tasksData.data.tasks.length);
  });

  test('Complete Discovery task', async ({ request }) => {
    // 建立新的 program 來測試
    const scenariosResponse = await request.get('/api/discovery/scenarios', {
      headers: {
        'Cookie': cookies
      }
    });
    
    const scenariosData = await scenariosResponse.json();
    const scenario = scenariosData.data.scenarios[0];
    
    const createResponse = await request.post('/api/discovery/programs', {
      headers: {
        'Cookie': cookies
      },
      data: {
        scenarioId: scenario.id
      }
    });
    
    const program = (await createResponse.json()).data.program;
    
    // 取得 tasks
    const tasksResponse = await request.get(`/api/discovery/programs/${program.id}/tasks`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    const tasks = (await tasksResponse.json()).data.tasks;
    const firstTask = tasks[0];
    
    // 更新 task 狀態
    const updateResponse = await request.patch(`/api/discovery/programs/${program.id}/tasks/${firstTask.id}`, {
      headers: {
        'Cookie': cookies
      },
      data: {
        status: 'completed',
        score: 95,
        timeSpentSeconds: 300,
        interactions: [
          {
            type: 'chat',
            content: 'Test interaction',
            timestamp: new Date().toISOString()
          }
        ]
      }
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();
    
    expect(updateData.success).toBe(true);
    expect(updateData.data.task.status).toBe('completed');
    expect(updateData.data.task.score).toBe(95);
    
    console.log('Task completed successfully');
  });

  test('Get user Discovery programs', async ({ request }) => {
    const response = await request.get('/api/discovery/programs', {
      headers: {
        'Cookie': cookies
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.programs)).toBe(true);
    
    // 應該至少有我們剛建立的 programs
    expect(data.data.programs.length).toBeGreaterThan(0);
    
    console.log('User has programs:', data.data.programs.length);
    
    // 檢查 program 結構
    const program = data.data.programs[0];
    expect(program).toHaveProperty('id');
    expect(program).toHaveProperty('scenarioId');
    expect(program).toHaveProperty('status');
    expect(program).toHaveProperty('totalTaskCount');
    expect(program).toHaveProperty('completedTaskCount');
  });
});