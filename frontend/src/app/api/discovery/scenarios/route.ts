/**
 * Discovery Scenarios API - 統一架構版本
 * 從 YAML 檔案載入並建立 Scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { IScenario } from '@/types/unified-learning';
import { discoveryScenarioService } from '@/lib/services/discovery-scenario-service';

/**
 * GET /api/discovery/scenarios
 * 獲取所有 Discovery Scenarios
 */
// 簡單的記憶體快取
let cachedScenarios: IScenario[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘

export async function GET(request: NextRequest) {
  try {
    // 檢查快取
    const now = Date.now();
    if (cachedScenarios && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedScenarios);
    }
    
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';
    
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // 先嘗試從儲存庫獲取現有的 scenarios
    const repoScenarios = await scenarioRepo.findByMode('discovery');
    
    let scenarios: IScenario[];
    
    // 如果沒有 scenarios，從 YAML 檔案建立
    if (repoScenarios.length === 0) {
      console.log('No Discovery scenarios found, creating from YAML files...');
      scenarios = await createScenariosFromYAML(language);
    } else {
      // Map Scenario to IScenario
      scenarios = repoScenarios.map(s => {
        // Ensure sourceRef has proper structure
        const sourceRef: IScenario['sourceRef'] = s.sourceRef 
          ? {
              type: (s.sourceRef.type || 'yaml') as 'yaml' | 'api' | 'ai-generated',
              path: s.sourceRef.path,
              sourceId: undefined,
              metadata: {}
            }
          : { type: 'yaml' as const, metadata: {} };
          
        return {
          id: s.id,
          sourceType: 'discovery' as const,
          sourceRef,
          title: s.title || '',
          description: s.description || '',
          objectives: (s.metadata as Record<string, unknown>)?.objectives as string[] || [],
          taskTemplates: s.tasks.map(t => ({
            id: t.id,
            title: t.title || '',
            type: t.type as 'question' | 'chat' | 'creation' | 'analysis',
            description: t.description,
            metadata: {}
          })),
          metadata: s.metadata,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString()
        };
      });
    }
    
    // 更新快取
    cachedScenarios = scenarios;
    cacheTimestamp = now;
    
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


/**
 * 從 YAML 檔案建立 Discovery Scenarios
 */
async function createScenariosFromYAML(language: string): Promise<IScenario[]> {
  const scenarios: IScenario[] = [];
  
  try {
    // 獲取所有可用的 career types
    const careerTypes = await discoveryScenarioService.listAvailableCareerTypes();
    
    // 為每個 career type 創建 scenario
    for (const careerType of careerTypes) {
      try {
        const scenario = await discoveryScenarioService.findOrCreateScenarioByCareerType(careerType, language);
        scenarios.push(scenario);
        console.log(`Created Discovery scenario: ${scenario.title} (${scenario.id})`);
      } catch (error) {
        console.error(`Failed to create scenario for ${careerType}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to create Discovery scenarios:', error);
  }
  
  return scenarios;
}