import { NextRequest, NextResponse } from 'next/server';
import { ScenarioSyncService } from '@/lib/services/scenario-sync-service';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const includeAllLanguages = searchParams.get('allLanguages') === 'true';
    
    const session = await getServerSession();
    const user = session?.user;
    
    // 獲取 Scenario Repository
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // 獲取所有 assessment scenarios
    const scenarios = await scenarioRepo.findBySourceType('assessment');
    
    // 處理回應資料
    const responseScenarios = scenarios.map(scenario => {
      // 如果 scenario 有 translations
      if (scenario.translations) {
        const translation = scenario.translations[lang] || 
                          scenario.translations.en || 
                          { title: scenario.title, description: scenario.description };
        
        return {
          id: scenario.id,
          title: translation.title,
          description: translation.description,
          config: translation.content || {},
          // 如果需要，包含所有語言
          ...(includeAllLanguages && { translations: scenario.translations }),
          // 用戶進度
          userProgress: user ? {
            completedPrograms: 0, // TODO: 從資料庫獲取
            lastAttempt: undefined,
            bestScore: undefined
          } : undefined
        };
      }
      
      // 舊格式相容
      return {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        config: {},
        userProgress: user ? {
          completedPrograms: 0,
          lastAttempt: undefined,
          bestScore: undefined
        } : undefined
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        scenarios: responseScenarios,
        totalCount: responseScenarios.length,
        currentLanguage: lang
      }
    });
  } catch (error) {
    console.error('Error in assessment scenarios API v2:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load assessment scenarios' },
      { status: 500 }
    );
  }
}