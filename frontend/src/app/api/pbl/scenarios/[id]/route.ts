import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Type definitions for KSA mapping
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

// Type definitions for KSA data structure
interface KSACode {
  summary: string;
  summary_zh?: string;
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

// Simplified type definitions for API response
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

// Helper function to get localized field
function getLocalizedValue<T = unknown>(data: Record<string, T>, fieldName: string, lang: string): T | string {
  // Map language codes to suffixes
  let langSuffix = lang;
  if (lang === 'zh-TW' || lang === 'zh-CN') {
    langSuffix = 'zh';
  }
  
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || '';
}

// Helper function to load and parse KSA codes
async function loadKSACodes(lang: string): Promise<KSAData | null> {
  try {
    const ksaPath = path.join(process.cwd(), 'public', 'rubrics_data', 'ksa_codes.yaml');
    const ksaContent = await fs.readFile(ksaPath, 'utf8');
    return yaml.load(ksaContent) as KSAData;
  } catch (error) {
    console.error('Error loading KSA codes:', error);
    return null;
  }
}

// Helper function to get KSA item details
function getKSAItemDetails(ksaData: KSAData, code: string, lang: string): KSAItem | null {
  if (!ksaData) return null;
  
  // Search in knowledge codes
  if (ksaData.knowledge_codes?.themes) {
    for (const theme of Object.values(ksaData.knowledge_codes.themes)) {
      if (theme.codes && theme.codes[code]) {
        return {
          code,
          name: `Knowledge: ${code}`,
          description: getLocalizedValue(theme.codes[code] as Record<string, string>, 'summary', lang)
        };
      }
    }
  }
  
  // Search in skills codes (note: it's skill_codes, not skills_codes)
  if (ksaData.skill_codes?.themes) {
    for (const theme of Object.values(ksaData.skill_codes.themes)) {
      if (theme.codes && theme.codes[code]) {
        return {
          code,
          name: `Skill: ${code}`,
          description: getLocalizedValue(theme.codes[code] as Record<string, string>, 'summary', lang)
        };
      }
    }
  }
  
  // Search in attitudes codes (note: it's attitude_codes, not attitudes_codes)
  if (ksaData.attitude_codes?.themes) {
    for (const theme of Object.values(ksaData.attitude_codes.themes)) {
      if (theme.codes && theme.codes[code]) {
        return {
          code,
          name: `Attitude: ${code}`,
          description: getLocalizedValue(theme.codes[code] as Record<string, string>, 'summary', lang)
        };
      }
    }
  }
  
  return null;
}

// Helper function to build KSA mapping
function buildKSAMapping(yamlData: YAMLData, ksaData: KSAData | null, lang: string): KSAMapping | undefined {
  if (!yamlData.ksa_mapping || !ksaData) return undefined;
  
  const mapping: KSAMapping = {
    knowledge: [],
    skills: [],
    attitudes: []
  };
  
  // Process knowledge codes
  if (yamlData.ksa_mapping.knowledge) {
    for (const code of yamlData.ksa_mapping.knowledge) {
      const item = getKSAItemDetails(ksaData, code, lang);
      if (item) mapping.knowledge.push(item);
    }
  }
  
  // Process skills codes
  if (yamlData.ksa_mapping.skills) {
    for (const code of yamlData.ksa_mapping.skills) {
      const item = getKSAItemDetails(ksaData, code, lang);
      if (item) mapping.skills.push(item);
    }
  }
  
  // Process attitudes codes
  if (yamlData.ksa_mapping.attitudes) {
    for (const code of yamlData.ksa_mapping.attitudes) {
      const item = getKSAItemDetails(ksaData, code, lang);
      if (item) mapping.attitudes.push(item);
    }
  }
  
  return mapping;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    console.log('Loading scenario:', scenarioId, 'with lang:', lang);
    
    // Load scenario YAML file
    const yamlPath = path.join(process.cwd(), 'public', 'pbl_data', `${scenarioId.replace(/-/g, '_')}_scenario.yaml`);
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const yamlData = yaml.load(yamlContent) as any;
    
    // Load KSA codes
    const ksaData = await loadKSACodes(lang);
    
    console.log('YAML data loaded: success');
    
    // Transform to API response format (new structure without stages)
    const scenario: ScenarioResponse = {
      id: yamlData.scenario_info.id,
      title: getLocalizedValue(yamlData.scenario_info, 'title', lang),
      description: getLocalizedValue(yamlData.scenario_info, 'description', lang),
      difficulty: yamlData.scenario_info.difficulty,
      estimatedDuration: yamlData.scenario_info.estimated_duration,
      targetDomain: yamlData.scenario_info.target_domains,
      prerequisites: getLocalizedValue(yamlData.scenario_info, 'prerequisites', lang) || yamlData.scenario_info.prerequisites || [],
      learningObjectives: getLocalizedValue(yamlData.scenario_info, 'learning_objectives', lang) || yamlData.scenario_info.learning_objectives || [],
      ksaMapping: buildKSAMapping(yamlData, ksaData, lang),
      tasks: (yamlData.tasks || []).map((task: any) => ({
        id: task.id,
        title: getLocalizedValue(task, 'title', lang),
        description: getLocalizedValue(task, 'description', lang),
        category: task.category || 'general',
        instructions: getLocalizedValue(task, 'instructions', lang) || task.instructions || [],
        expectedOutcome: getLocalizedValue(task, 'expected_outcome', lang) || getLocalizedValue(task, 'expectedOutcome', lang),
        timeLimit: task.time_limit
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: scenario
    });
    
  } catch (error) {
    console.error('Error fetching scenario details:', error);
    console.error('Error stack:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load scenario details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}