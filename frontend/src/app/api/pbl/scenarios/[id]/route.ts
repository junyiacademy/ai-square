import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

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
function getLocalizedValue(data: any, fieldName: string, lang: string): any {
  // Map language codes to suffixes
  let langSuffix = lang;
  if (lang === 'zh-TW' || lang === 'zh-CN') {
    langSuffix = 'zh';
  }
  
  const localizedField = `${fieldName}_${langSuffix}`;
  return data[localizedField] || data[fieldName] || '';
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
    
    // Load YAML file
    const yamlPath = path.join(process.cwd(), 'public', 'pbl_data', `${scenarioId.replace(/-/g, '_')}_scenario.yaml`);
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const yamlData = yaml.load(yamlContent) as any;
    
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
      tasks: (yamlData.tasks || []).map(task => ({
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