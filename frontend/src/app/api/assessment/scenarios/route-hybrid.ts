import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

// 記憶體快取
interface TranslationData {
  title?: string;
  description?: string;
  config?: {
    totalQuestions: number;
    timeLimit: number;
    passingScore: number;
    domains: string[];
  };
}

const translationCache = new Map<string, {
  data: TranslationData;
  timestamp: number;
}>();

const CACHE_TTL = 10 * 60 * 1000; // 10 分鐘

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const session = await getServerSession();
    const user = session?.user;
    
    // 從 GCS 獲取基本資訊（英文版）
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenarios = await scenarioRepo.findByMode?.('assessment') || [];
    
    // 處理每個 scenario
    const responseScenarios = await Promise.all(
      scenarios.map(async (scenario) => {
        // 如果是英文，直接使用 GCS 資料
        if (lang === 'en') {
          return {
            id: scenario.id,
            title: scenario.title,
            description: scenario.description,
            folderName: (scenario.sourceMetadata as Record<string, unknown>)?.folderName as string,
            config: (scenario.sourceMetadata as Record<string, unknown>)?.config as Record<string, unknown> || {},
            userProgress: user ? await getUserProgress({ scenarioId: scenario.id, userId: user.id }) : undefined
          };
        }
        
        // 非英文：從 YAML 載入
        const folderName = (scenario.sourceMetadata as Record<string, unknown>)?.basePath as string || (scenario.sourceMetadata as Record<string, unknown>)?.folderName as string || '';
        const translation = await loadTranslation(folderName, lang);
        
        return {
          id: scenario.id,
          title: translation?.title || scenario.title,
          description: translation?.description || scenario.description,
          folderName: (scenario.sourceMetadata as Record<string, unknown>)?.folderName as string,
          config: translation?.config || (scenario.sourceMetadata as Record<string, unknown>)?.config as Record<string, unknown> || {},
          userProgress: user ? await getUserProgress({ scenarioId: scenario.id, userId: user.id }) : undefined
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: {
        scenarios: responseScenarios,
        totalCount: responseScenarios.length,
        language: lang,
        source: lang === 'en' ? 'gcs' : 'yaml'
      }
    });
  } catch (error) {
    console.error('Error in hybrid scenarios API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load scenarios' },
      { status: 500 }
    );
  }
}

async function loadTranslation(
  folderPath: string,
  language: string
) {
  // 檢查快取
  const cacheKey = `${folderPath}-${language}`;
  const cached = translationCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    // 建構檔案路徑
    const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
    const folderName = path.basename(folderPath);
    const filePath = path.join(baseDir, 'public', 'assessment_data', folderName, `${folderName}_questions_${language}.yaml`);
    
    // 讀取 YAML
    const content = await fs.readFile(filePath, 'utf-8');
    const yamlData = yaml.load(content) as {
      config?: {
        title?: string;
        description?: string;
        total_questions?: number;
        time_limit_minutes?: number;
        passing_score?: number;
        domains?: string[];
      };
      assessment_config?: {
        title?: string;
        description?: string;
        total_questions?: number;
        time_limit_minutes?: number;
        passing_score?: number;
        domains?: string[];
      };
    };
    const config = yamlData.config || yamlData.assessment_config || {};
    
    const translation = {
      title: config.title,
      description: config.description,
      config: {
        totalQuestions: config.total_questions || 12,
        timeLimit: config.time_limit_minutes || 15,
        passingScore: config.passing_score || 60,
        domains: config.domains || []
      }
    };
    
    // 更新快取
    translationCache.set(cacheKey, {
      data: translation,
      timestamp: Date.now()
    });
    
    return translation;
  } catch (error) {
    console.log(`Failed to load ${language} translation for ${folderPath}:`, error);
    return null;
  }
}

async function getUserProgress(params: { scenarioId: string; userId: string }) {
  // TODO: 實作從 GCS 獲取用戶進度
  return {
    completedPrograms: 0,
    lastAttempt: undefined,
    bestScore: undefined
  };
}