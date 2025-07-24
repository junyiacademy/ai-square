import { NextResponse } from 'next/server';
import { cacheService } from '@/lib/cache/cache-service';
import { pblScenarioService } from '@/lib/services/pbl-scenario-service';
import { HybridTranslationService } from '@/lib/services/hybrid-translation-service';
import type { IScenario } from '@/types/unified-learning';
import { convertScenarioToIScenario } from '@/lib/utils/type-converters';

// Types for YAML data
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

// Helper function to get scenario emoji
function getScenarioEmoji(scenarioId: string): string {
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
  
  return emojiMap[scenarioId] || '🤖';
}


// Load scenarios from database only
async function loadScenariosFromUnifiedArchitecture(lang: string): Promise<Record<string, unknown>[]> {
  const scenarios: Record<string, unknown>[] = [];
  
  try {
    // Get all PBL scenarios from database
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const rawScenarios = await scenarioRepo.findByMode?.('pbl') || [];
    const existingScenarios = rawScenarios as IScenario[];
    
    console.log(`Found ${existingScenarios.length} PBL scenarios in database`);
    
    // Build/update the index with PBL scenarios
    const { scenarioIndexService } = await import('@/lib/services/scenario-index-service');
    await scenarioIndexService.buildIndex(existingScenarios);
    
    // Process each scenario from database
    for (const scenario of existingScenarios) {
      try {
        // Extract title and description with proper language support
        const title = typeof scenario.title === 'string' 
          ? scenario.title 
          : scenario.title?.[lang] || scenario.title?.en || '';
        const description = typeof scenario.description === 'string'
          ? scenario.description
          : scenario.description?.[lang] || scenario.description?.en || '';
        
        // Get yamlId from metadata or sourceId
        const yamlId = scenario.metadata?.yamlId as string || scenario.sourceId || scenario.id;
        
        scenarios.push({
          id: scenario.id, // UUID
          yamlId: yamlId, // for compatibility
          sourceType: 'pbl',
          title,
          description,
          difficulty: scenario.difficulty || scenario.metadata?.difficulty as string | undefined,
          estimatedDuration: scenario.estimatedMinutes || scenario.metadata?.estimatedDuration as number | undefined,
          targetDomains: scenario.metadata?.targetDomains as string[] | undefined || (scenario.pblData as any)?.targetDomains,
          targetDomain: scenario.metadata?.targetDomains as string[] | undefined || (scenario.pblData as any)?.targetDomains, // for compatibility
          domains: scenario.metadata?.targetDomains as string[] | undefined || (scenario.pblData as any)?.targetDomains, // for compatibility 
          taskCount: scenario.taskTemplates?.length || scenario.taskCount || 0,
          isAvailable: true,
          thumbnailEmoji: getScenarioEmoji(yamlId)
        });
      } catch (error) {
        console.error(`Error processing scenario ${scenario.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error loading scenarios from database:', error);
  }
  
  
  return scenarios;
}

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic'; // Force dynamic rendering

export async function GET(request: Request) {
  try {
    // Get language and source from query params
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const source = searchParams.get('source') || 'unified'; // 'unified', 'hybrid', 'yaml'
    
    // Use cache with source-specific key
    const cacheKey = source === 'hybrid' ? `pbl:scenarios:hybrid:${lang}` : `pbl:scenarios:${lang}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    // Load scenarios based on source parameter
    let scenarios: Record<string, unknown>[];
    let metaSource = source;
    
    if (source === 'hybrid') {
      try {
        // Use hybrid translation service
        const hybridService = new HybridTranslationService();
        const hybridScenarios = await hybridService.listScenarios(lang);
        
        // Transform to match expected format
        scenarios = hybridScenarios.map(scenario => ({
          ...scenario,
          yamlId: scenario.id,
          sourceType: 'pbl',
          estimatedDuration: (scenario.metadata?.estimatedDuration as number | undefined) || 60,
          targetDomain: scenario.metadata?.targetDomains as string[] | undefined,
          domains: scenario.metadata?.targetDomains as string[] | undefined,
          taskCount: scenario.taskTemplates?.length || 0,
          isAvailable: true,
          thumbnailEmoji: getScenarioEmoji(scenario.id)
        }));
        
        metaSource = 'hybrid';
      } catch (error) {
        console.error('Hybrid service failed, falling back to unified:', error);
        scenarios = await loadScenariosFromUnifiedArchitecture(lang);
        metaSource = 'unified-fallback';
      }
    } else {
      // Default to unified architecture
      scenarios = await loadScenariosFromUnifiedArchitecture(lang);
    }

    const result = {
      success: true,
      data: {
        scenarios,
        total: scenarios.length,
        available: scenarios.filter(s => s.isAvailable).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        language: lang,
        source: metaSource
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