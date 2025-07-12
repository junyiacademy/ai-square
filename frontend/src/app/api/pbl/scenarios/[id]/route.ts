import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { pblScenarioService } from '@/lib/services/pbl-scenario-service';

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
  // Use language code directly as suffix
  const langSuffix = lang;
  
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || '';
}

// Helper function to load and parse KSA codes
async function loadKSACodes(lang: string = 'en'): Promise<KSAData | null> {
  try {
    const ksaPath = path.join(process.cwd(), 'public', 'rubrics_data', 'ksa_codes', `ksa_codes_${lang}.yaml`);
    const ksaContent = await fs.readFile(ksaPath, 'utf8');
    return yaml.load(ksaContent) as KSAData;
  } catch (error) {
    console.error('Error loading KSA codes:', error);
    // Fallback to English if specific language not found
    if (lang !== 'en') {
      return loadKSACodes('en');
    }
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
          description: getLocalizedValue(theme.codes[code] as unknown as Record<string, unknown>, 'summary', lang) as string
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
          description: getLocalizedValue(theme.codes[code] as unknown as Record<string, unknown>, 'summary', lang) as string
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
          description: getLocalizedValue(theme.codes[code] as unknown as Record<string, unknown>, 'summary', lang) as string
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
    
    // Use unified architecture to get scenario by UUID only
    const { getScenarioRepository } = await import('@/lib/implementations/gcs-v2');
    const scenarioRepo = getScenarioRepository();
    
    // Only accept UUID format
    if (!scenarioId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID format. UUID required.' },
        { status: 400 }
      );
    }
    
    const scenario = await scenarioRepo.findById(scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Get YAML data from scenario metadata
    const yamlData = scenario.metadata?.yamlData;
    
    if (!yamlData) {
      return NextResponse.json(
        { success: false, error: 'Scenario YAML data not found' },
        { status: 404 }
      );
    }
    
    // Load KSA codes
    const ksaData = await loadKSACodes(lang);
    
    console.log('Scenario loaded from unified architecture: success');
    
    // Transform to API response format using unified architecture data
    const scenarioResponse: ScenarioResponse = {
      id: scenario.id, // Use UUID
      yamlId: scenario.sourceRef.metadata?.yamlId, // Include original yaml ID for compatibility
      sourceType: scenario.sourceType,
      title: scenario.title,
      description: scenario.description,
      difficulty: scenario.metadata?.difficulty || 'intermediate',
      estimatedDuration: scenario.metadata?.estimatedDuration || 60,
      targetDomain: scenario.metadata?.targetDomains || [],
      prerequisites: scenario.metadata?.prerequisites || [],
      learningObjectives: scenario.objectives || [],
      ksaMapping: buildKSAMapping(yamlData as unknown as YAMLData, ksaData, lang),
      tasks: scenario.taskTemplates.map((template, index) => ({
        id: template.id,
        title: template.title,
        description: template.description || '',
        category: template.metadata?.category || 'general',
        instructions: template.metadata?.instructions || [],
        expectedOutcome: template.metadata?.expectedOutcome || '',
        timeLimit: template.metadata?.timeLimit
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: scenarioResponse
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