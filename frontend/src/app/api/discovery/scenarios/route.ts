/**
 * Discovery Scenarios API - 統一架構版本
 * 從 YAML 檔案載入並建立 Scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { IScenario } from '@/types/unified-learning';
import { discoveryScenarioService } from '@/lib/services/discovery-scenario-service';
import { convertScenarioToIScenario } from '@/lib/utils/type-converters';

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
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';
    
    // 檢查語言特定快取
    const cacheKey = `discovery_scenarios_${language}`;
    const now = Date.now();
    if (cachedScenarios && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedScenarios);
    }
    
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // 從資料庫獲取 scenarios
    const rawScenarios = await scenarioRepo.findByMode?.('discovery');
    const scenarios = rawScenarios || [];
    
    console.log(`Found ${scenarios.length} Discovery scenarios in database`);
    
    // 處理多語言字段並轉換為前端期望的格式
    const processedScenarios = scenarios.map(scenario => {
      // 處理 title 多語言字段
      const titleObj = scenario.title as Record<string, string>;
      const descObj = scenario.description as Record<string, string>;
      
      return {
        ...scenario,
        title: titleObj?.[language] || titleObj?.en || 'Untitled',
        description: descObj?.[language] || descObj?.en || 'No description',
        // 保留原始多語言對象供前端使用
        titleObj,
        descObj
      };
    });
    
    // 更新快取
    cachedScenarios = processedScenarios;
    cacheTimestamp = now;
    
    // Return in consistent format with other APIs
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


// Removed createScenariosFromYAML function - only use database