/**
 * Discovery Scenarios API - 統一架構版本
 * 從 YAML 檔案載入並建立 Scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

/**
 * GET /api/discovery/scenarios
 * 獲取所有 Discovery Scenarios
 */
// 簡單的記憶體快取
let cachedScenarios: unknown | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘

// Export for testing purposes
export function clearCache() {
  cachedScenarios = null;
  cacheTimestamp = 0;
}

export async function GET(request: NextRequest) {
  try {
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';
    
    // Get user session to include learning progress
    const { getServerSession } = await import('@/lib/auth/session');
    const session = await getServerSession();
    const userId = session?.user?.id || session?.user?.email;
    
    // 檢查語言特定快取 - 不快取有用戶的請求
    const now = Date.now();
    if (!userId && cachedScenarios && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedScenarios);
    }
    
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const programRepo = userId ? repositoryFactory.getProgramRepository() : null;
    
    // 從資料庫獲取 scenarios
    const rawScenarios = await scenarioRepo.findByMode?.('discovery');
    const scenarios = rawScenarios || [];
    
    // Get user programs if logged in
    const userPrograms: Map<string, unknown> = new Map();
    if (userId && programRepo) {
      const programs = await programRepo.findByUser(userId);
      const discoveryPrograms = programs.filter(p => p.mode === 'discovery');
      
      // Group by scenario
      discoveryPrograms.forEach(program => {
        const scenarioId = program.scenarioId;
        if (!userPrograms.has(scenarioId)) {
          userPrograms.set(scenarioId, {
            programs: [],
            completedCount: 0,
            activeCount: 0,
            bestScore: 0
          });
        }
        
        const entry = userPrograms.get(scenarioId) as Record<string, unknown>;
        const programsList = entry.programs as unknown[];
        programsList.push(program);
        
        if (program.status === 'completed') {
          entry.completedCount = (entry.completedCount as number) + 1;
          const score = program.totalScore || 0;
          if (score > (entry.bestScore as number)) {
            entry.bestScore = score;
          }
        } else if (program.status === 'active') {
          entry.activeCount = (entry.activeCount as number) + 1;
          if (!entry.activeProgram) {
            entry.activeProgram = program;
          }
        }
      });
    }
    
    
    // 處理多語言字段並轉換為前端期望的格式
    const processedScenarios = scenarios.map(scenario => {
      // 處理 title 多語言字段
      const titleObj = scenario.title as Record<string, string>;
      const descObj = scenario.description as Record<string, string>;
      
      // Get user progress for this scenario
      const userProgress = userPrograms.get(scenario.id);
      let primaryStatus: 'mastered' | 'in-progress' | 'new' = 'new';
      let currentProgress = 0;
      let stats = {
        completedCount: 0,
        activeCount: 0,
        totalAttempts: 0,
        bestScore: 0
      };
      
      if (userProgress) {
        const progress = userProgress as Record<string, unknown>;
        stats = {
          completedCount: progress.completedCount as number,
          activeCount: progress.activeCount as number,
          totalAttempts: (progress.programs as unknown[]).length,
          bestScore: progress.bestScore as number
        };
        
        if (stats.completedCount > 0) {
          primaryStatus = 'mastered';
          currentProgress = 100;
        } else if (progress.activeProgram) {
          primaryStatus = 'in-progress';
          const activeProgram = progress.activeProgram as Record<string, unknown>;
          const completed = activeProgram.completedTaskCount as number || 0;
          const total = activeProgram.totalTaskCount as number || 1;
          currentProgress = Math.round((completed / total) * 100);
        }
      }
      
      
      return {
        ...scenario,
        title: titleObj?.[language] || titleObj?.en || 'Untitled',
        description: descObj?.[language] || descObj?.en || 'No description',
        // 保留原始多語言對象供前端使用
        titleObj,
        descObj,
        // Add user progress info
        primaryStatus,
        currentProgress,
        stats,
        // Legacy fields for compatibility
        completedCount: stats.completedCount,
        progress: currentProgress,
        isActive: stats.activeCount > 0,
        // Include discovery_data for frontend to map colors/icons
        discovery_data: scenario.discoveryData
      };
    });
    
    // 建立回應資料
    const responseData = {
      success: true,
      data: {
        scenarios: processedScenarios,
        total: processedScenarios.length,
        available: processedScenarios.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        language: language,
        source: 'unified'
      }
    };
    
    // 更新快取
    cachedScenarios = responseData;
    cacheTimestamp = now;
    
    // Return in consistent format with other APIs
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


// Removed createScenariosFromYAML function - only use database