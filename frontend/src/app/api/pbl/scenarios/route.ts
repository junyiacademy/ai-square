import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { cacheService } from '@/lib/cache/cache-service';
import { pblScenarioService } from '@/lib/services/pbl-scenario-service';

// Types for YAML data
interface ScenarioInfo {
  id: string;
  title: string;
  title_zhTW?: string;
  title_ja?: string;
  title_ko?: string;
  title_es?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  description: string;
  description_zhTW?: string;
  description_ja?: string;
  description_ko?: string;
  description_es?: string;
  description_fr?: string;
  description_de?: string;
  description_ru?: string;
  description_it?: string;
  difficulty: string;
  estimated_duration: number;
  target_domains: string[];
  [key: string]: unknown;
}

interface ScenarioYAML {
  scenario_info: ScenarioInfo;
}

interface LocalizedField {
  [key: string]: string | undefined;
}

// Helper function to get localized field
function getLocalizedValue(data: LocalizedField, fieldName: string, lang: string): string {
  if (!data) return '';
  
  // Use language code directly as suffix
  const langSuffix = lang;
  
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || '';
}

// Load scenarios using unified architecture
async function loadScenariosFromUnifiedArchitecture(lang: string): Promise<Record<string, unknown>[]> {
  const scenarios: Record<string, unknown>[] = [];
  
  try {
    // Get available YAML IDs
    const yamlIds = await pblScenarioService.listAvailableYAMLIds();
    
    for (const yamlId of yamlIds) {
      try {
        // 創建或取得 Scenario UUID
        const scenario = await pblScenarioService.findOrCreateScenarioByYAMLId(yamlId, lang);
        
        // Choose emoji based on yaml ID
        const emojiMap: Record<string, string> = {
          'ai-job-search': '💼',
          'ai-education-design': '🎓',
          'ai-stablecoin-trading': '₿',
          'ai-robotics-development': '🤖',
          'high-school-climate-change': '🌍',
          'high-school-digital-wellness': '📱',
          'high-school-smart-city': '🏙️',
          'high-school-creative-arts': '🎨',
          'high-school-health-assistant': '💗'
        };
        
        scenarios.push({
          id: scenario.id, // UUID
          yamlId: yamlId, // 原始 yaml ID for compatibility
          sourceType: 'pbl',
          title: scenario.title,
          description: scenario.description,
          difficulty: scenario.metadata?.difficulty,
          estimatedDuration: scenario.metadata?.estimatedDuration,
          targetDomains: scenario.metadata?.targetDomains,
          targetDomain: scenario.metadata?.targetDomains, // for compatibility
          domains: scenario.metadata?.targetDomains, // for compatibility 
          taskCount: scenario.taskTemplates?.length || 0,
          isAvailable: true,
          thumbnailEmoji: emojiMap[yamlId] || '🤖'
        });
      } catch (error) {
        console.error(`Error loading scenario ${yamlId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error loading scenarios:', error);
  }
  
  // Add placeholder scenarios for future content
  scenarios.push(
    {
      id: 'ai-creative-writing',
      title: getLocalizedValue({
        title: 'Creative Writing with AI',
        title_zhTW: '使用 AI 進行創意寫作',
        title_ja: 'AIを使った創造的な文章作成',
        title_ko: 'AI를 활용한 창의적 글쓰기',
        title_es: 'Escritura Creativa con IA',
        title_fr: 'Écriture Créative avec IA',
        title_de: 'Kreatives Schreiben mit KI',
        title_ru: 'Творческое письмо с ИИ',
        title_it: 'Scrittura Creativa con IA'
      } as LocalizedField, 'title', lang),
      description: getLocalizedValue({
        description: 'Master AI-powered creative writing techniques',
        description_zhTW: '掌握 AI 驅動的創意寫作技巧',
        description_ja: 'AIを活用した創造的な文章作成技術をマスターする',
        description_ko: 'AI 기반 창의적 글쓰기 기법 마스터하기',
        description_es: 'Domina las técnicas de escritura creativa con IA',
        description_fr: 'Maîtrisez les techniques d\'écriture créative avec IA',
        description_de: 'Meistern Sie KI-gestützte kreative Schreibtechniken',
        description_ru: 'Освойте техники творческого письма с помощью ИИ',
        description_it: 'Padroneggia le tecniche di scrittura creativa con IA'
      } as LocalizedField, 'description', lang),
      difficulty: 'beginner',
      estimatedDuration: 60,
      targetDomains: ['creating_with_ai'],
      targetDomain: ['creating_with_ai'],
      domains: ['creating_with_ai'],
      taskCount: 0,
      isAvailable: false,
      thumbnailEmoji: '✍️'
    },
    {
      id: 'ai-data-analysis',
      title: getLocalizedValue({
        title: 'Data Analysis with AI',
        title_zhTW: '使用 AI 進行數據分析',
        title_ja: 'AIを使ったデータ分析',
        title_ko: 'AI를 활용한 데이터 분석',
        title_es: 'Análisis de Datos con IA',
        title_fr: 'Analyse de Données avec IA',
        title_de: 'Datenanalyse mit KI',
        title_ru: 'Анализ данных с ИИ',
        title_it: 'Analisi dei Dati con IA'
      } as LocalizedField, 'title', lang),
      description: getLocalizedValue({
        description: 'Use AI for advanced data analysis and insights',
        description_zhTW: '使用 AI 進行進階數據分析和洞察',
        description_ja: 'AIを使った高度なデータ分析と洞察',
        description_ko: 'AI를 사용한 고급 데이터 분석 및 인사이트',
        description_es: 'Usa IA para análisis avanzado de datos e insights',
        description_fr: 'Utilisez l\'IA pour l\'analyse avancée et les insights',
        description_de: 'Nutzen Sie KI für erweiterte Datenanalyse und Erkenntnisse',
        description_ru: 'Используйте ИИ для расширенного анализа данных',
        description_it: 'Usa l\'IA per analisi avanzate e insights'
      } as LocalizedField, 'description', lang),
      difficulty: 'advanced',
      estimatedDuration: 120,
      targetDomains: ['managing_with_ai', 'designing_with_ai'],
      targetDomain: ['managing_with_ai', 'designing_with_ai'],
      domains: ['managing_with_ai', 'designing_with_ai'],
      taskCount: 0,
      isAvailable: false,
      thumbnailEmoji: '📊'
    }
  );
  
  return scenarios;
}

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic'; // Force dynamic rendering

export async function GET(request: Request) {
  try {
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    // Use cache
    const cacheKey = `pbl:scenarios:${lang}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    // Load scenarios using unified architecture
    const scenarios = await loadScenariosFromUnifiedArchitecture(lang);

    const result = {
      success: true,
      data: {
        scenarios,
        total: scenarios.length,
        available: scenarios.filter(s => s.isAvailable).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    // Store in cache
    await cacheService.set(cacheKey, result, { ttl: 60 * 60 * 1000 }); // 1 hour
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error('Error fetching PBL scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_SCENARIOS_ERROR',
          message: 'Failed to fetch PBL scenarios'
        }
      },
      { status: 500 }
    );
  }
}