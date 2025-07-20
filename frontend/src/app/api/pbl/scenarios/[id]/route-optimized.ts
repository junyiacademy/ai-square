import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { cachedGET, parallel, memoize } from '@/lib/api/optimization-utils';
import type { ITaskTemplate } from '@/types/unified-learning';
import type { Scenario } from '@/lib/repositories/interfaces';

// Type definitions remain the same
interface KSAItem {
  code: string;
  name: string;
  description: string;
}

interface KSAMapping {
  knowledge: KSAItem[];
  skills: KSAItem[];
  attitudes: KSAItem[];
}

interface KSACode {
  summary: string;
  summary_zhTW?: string;
  summary_es?: string;
  summary_ja?: string;
  summary_ko?: string;
  summary_fr?: string;
  summary_de?: string;
  summary_ru?: string;
  summary_it?: string;
}

interface KSATheme {
  codes: Record<string, KSACode>;
}

interface KSASection {
  themes: Record<string, KSATheme>;
}

interface KSAData {
  knowledge_codes?: KSASection;
  skill_codes?: KSASection;
  attitude_codes?: KSASection;
}

interface YAMLData {
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
  [key: string]: unknown;
}

interface ScenarioResponse {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  targetDomain: string[];
  prerequisites: string[];
  learningObjectives: string[];
  ksaMapping?: KSAMapping;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    instructions: string[];
    expectedOutcome: string;
    timeLimit?: number;
  }>;
}

// Memoized helper functions for better performance
const getLocalizedValue = memoize(((...args: unknown[]) => {
  const [data, fieldName, lang] = args as [Record<string, unknown>, string, string];
  const langSuffix = lang;
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || '';
}) as (...args: unknown[]) => unknown);

// Cache KSA data in memory (memoized for 30 minutes)
const loadKSACodes = memoize((async (...args: unknown[]) => {
  const [lang = 'en'] = args as [string?];
  try {
    const ksaPath = path.join(process.cwd(), 'public', 'rubrics_data', 'ksa_codes', `ksa_codes_${lang}.yaml`);
    const ksaContent = await fs.readFile(ksaPath, 'utf8');
    return yaml.load(ksaContent) as KSAData;
  } catch (error) {
    console.error('Error loading KSA codes:', error);
    // Fallback to English if specific language not found
    if (lang !== 'en') {
      const loadKSACodesInner = loadKSACodes as (lang?: string) => Promise<KSAData | null>;
      return loadKSACodesInner('en');
    }
    return null;
  }
}) as (...args: unknown[]) => unknown, 30 * 60 * 1000) as (lang?: string) => Promise<KSAData | null>;

// Optimized KSA lookup with indexing
const ksaIndexCache = new Map<string, Map<string, KSAItem>>();

function buildKSAIndex(ksaData: KSAData, lang: string): Map<string, KSAItem> {
  const cacheKey = `ksa-index-${lang}`;
  if (ksaIndexCache.has(cacheKey)) {
    return ksaIndexCache.get(cacheKey)!;
  }

  const index = new Map<string, KSAItem>();

  // Index knowledge codes
  if (ksaData.knowledge_codes?.themes) {
    for (const theme of Object.values(ksaData.knowledge_codes.themes)) {
      if (theme.codes) {
        for (const [code, data] of Object.entries(theme.codes)) {
          index.set(code, {
            code,
            name: `Knowledge: ${code}`,
            description: getLocalizedValue(data as unknown as Record<string, unknown>, 'summary', lang) as string
          });
        }
      }
    }
  }

  // Index skill codes
  if (ksaData.skill_codes?.themes) {
    for (const theme of Object.values(ksaData.skill_codes.themes)) {
      if (theme.codes) {
        for (const [code, data] of Object.entries(theme.codes)) {
          index.set(code, {
            code,
            name: `Skill: ${code}`,
            description: getLocalizedValue(data as unknown as Record<string, unknown>, 'summary', lang) as string
          });
        }
      }
    }
  }

  // Index attitude codes
  if (ksaData.attitude_codes?.themes) {
    for (const theme of Object.values(ksaData.attitude_codes.themes)) {
      if (theme.codes) {
        for (const [code, data] of Object.entries(theme.codes)) {
          index.set(code, {
            code,
            name: `Attitude: ${code}`,
            description: getLocalizedValue(data as unknown as Record<string, unknown>, 'summary', lang) as string
          });
        }
      }
    }
  }

  ksaIndexCache.set(cacheKey, index);
  return index;
}

// Optimized KSA mapping builder
function buildKSAMapping(yamlData: YAMLData, ksaData: KSAData | null, lang: string): KSAMapping | undefined {
  if (!yamlData.ksa_mapping || !ksaData) return undefined;
  
  const index = buildKSAIndex(ksaData, lang);
  const mapping: KSAMapping = {
    knowledge: [],
    skills: [],
    attitudes: []
  };
  
  // Process all codes at once
  if (yamlData.ksa_mapping.knowledge) {
    mapping.knowledge = yamlData.ksa_mapping.knowledge
      .map(code => index.get(code))
      .filter(Boolean) as KSAItem[];
  }
  
  if (yamlData.ksa_mapping.skills) {
    mapping.skills = yamlData.ksa_mapping.skills
      .map(code => index.get(code))
      .filter(Boolean) as KSAItem[];
  }
  
  if (yamlData.ksa_mapping.attitudes) {
    mapping.attitudes = yamlData.ksa_mapping.attitudes
      .map(code => index.get(code))
      .filter(Boolean) as KSAItem[];
  }
  
  return mapping;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scenarioId } = await params;
  
  // Validate UUID format early
  if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return NextResponse.json(
      { success: false, error: 'Invalid scenario ID format. UUID required.' },
      { status: 400 }
    );
  }
  
  // Use cached GET wrapper with 5 minute TTL
  return cachedGET(request, async () => {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    console.log('Loading scenario:', scenarioId, 'with lang:', lang);
    
    // Load scenario and KSA data in parallel
    const [scenarioResult, ksaData] = await parallel(
      (async () => {
        const { createRepositoryFactory } = await import('@/lib/db/repositories/factory');
        const repositoryFactory = createRepositoryFactory;
        const scenarioRepo = repositoryFactory.getScenarioRepository();
        return scenarioRepo.findById(scenarioId);
      })(),
      loadKSACodes(lang)
    ) as [Scenario | null, KSAData | null];
    
    if (!scenarioResult) {
      throw new Error('Scenario not found');
    }
    
    const yamlData = scenarioResult.metadata?.yamlData;
    if (!yamlData) {
      throw new Error('Scenario YAML data not found');
    }
    
    console.log('Scenario loaded from unified architecture: success');
    
    // Transform to API response format
    const scenarioResponse: ScenarioResponse = {
      id: scenarioResult.id,
      title: scenarioResult.title || '',
      description: scenarioResult.description || '',
      difficulty: scenarioResult.metadata?.difficulty || 'intermediate',
      estimatedDuration: scenarioResult.metadata?.estimatedDuration || 60,
      targetDomain: scenarioResult.metadata?.targetDomains || [],
      prerequisites: scenarioResult.metadata?.prerequisites || [],
      learningObjectives: scenarioResult.objectives || [],
      ksaMapping: buildKSAMapping(yamlData as unknown as YAMLData, ksaData, lang),
      tasks: scenarioResult.taskTemplates.map((template: ITaskTemplate) => ({
        id: template.id,
        title: template.title || '',
        description: template.description || '',
        category: (template.metadata?.category || 'general') as string,
        instructions: (template.metadata?.instructions || []) as string[],
        expectedOutcome: (template.metadata?.expectedOutcome || '') as string,
        timeLimit: template.metadata?.timeLimit as number | undefined
      }))
    };
    
    return {
      success: true,
      data: scenarioResponse
    };
  }, {
    ttl: 300, // 5 minutes
    staleWhileRevalidate: 3600 // 1 hour
  });
}