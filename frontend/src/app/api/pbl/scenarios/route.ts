import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { cacheService } from '@/lib/cache/cache-service';

// Types for YAML data
interface ScenarioInfo {
  id: string;
  title: string;
  title_zh?: string;
  title_ja?: string;
  title_ko?: string;
  title_es?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  description: string;
  description_zh?: string;
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
  
  // Map language codes to suffixes
  let langSuffix = lang;
  if (lang === 'zh-TW' || lang === 'zh-CN') {
    langSuffix = 'zh';
  }
  
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || '';
}

// Load scenarios from YAML files
async function loadScenariosFromYAML(lang: string): Promise<Record<string, unknown>[]> {
  const scenarios: Record<string, unknown>[] = [];
  
  try {
    // List of available scenario files
    const scenarioFiles = [
      'ai_job_search_scenario.yaml',
      'ai_education_design_scenario.yaml',
      'ai_stablecoin_trading_scenario.yaml',
      'ai_robotics_development_scenario.yaml',
      'high_school_climate_change_scenario.yaml',
      'high_school_digital_wellness_scenario.yaml',
      'high_school_smart_city_scenario.yaml',
      'high_school_creative_arts_scenario.yaml',
      'high_school_health_assistant_scenario.yaml',
      // Add more scenario files here as they become available
    ];
    
    for (const file of scenarioFiles) {
      try {
        const yamlPath = path.join(process.cwd(), 'public', 'pbl_data', file);
        const yamlContent = await fs.readFile(yamlPath, 'utf8');
        const yamlData = yaml.load(yamlContent) as ScenarioYAML;
        
        if (yamlData && yamlData.scenario_info) {
          const info = yamlData.scenario_info;
          // Choose emoji based on scenario ID
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
            id: info.id,
            title: getLocalizedValue(info as LocalizedField, 'title', lang),
            description: getLocalizedValue(info as LocalizedField, 'description', lang),
            difficulty: info.difficulty,
            estimatedDuration: info.estimated_duration,
            targetDomains: info.target_domains,
            targetDomain: info.target_domains, // for compatibility
            domains: info.target_domains, // for compatibility 
            taskCount: Array.isArray(info.tasks) ? info.tasks.length : 0,
            isAvailable: true,
            thumbnailEmoji: emojiMap[info.id] || '🤖'
          });
        }
      } catch (error) {
        console.error(`Error loading scenario file ${file}:`, error);
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
        title_zh: '使用 AI 進行創意寫作',
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
        description_zh: '掌握 AI 驅動的創意寫作技巧',
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
        title_zh: '使用 AI 進行數據分析',
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
        description_zh: '使用 AI 進行進階數據分析和洞察',
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

    // Load scenarios from YAML files with proper translations
    const scenarios = await loadScenariosFromYAML(lang);

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