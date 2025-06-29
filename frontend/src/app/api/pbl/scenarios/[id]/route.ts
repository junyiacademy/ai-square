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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = params.id;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const isZh = lang === 'zh' || lang === 'zh-TW' || lang === 'zh-CN';
    
    console.log('Loading scenario:', scenarioId);
    
    // Load YAML file
    const yamlPath = path.join(process.cwd(), 'public', 'pbl_data', `${scenarioId.replace(/-/g, '_')}_scenario.yaml`);
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const yamlData = yaml.load(yamlContent) as any;
    
    console.log('YAML data loaded: success');
    
    // Transform to API response format (new structure without stages)
    const scenario: ScenarioResponse = {
      id: yamlData.scenario_info.id,
      title: isZh && yamlData.scenario_info.title_zh ? yamlData.scenario_info.title_zh : yamlData.scenario_info.title,
      description: isZh && yamlData.scenario_info.description_zh ? yamlData.scenario_info.description_zh : yamlData.scenario_info.description,
      difficulty: yamlData.scenario_info.difficulty,
      estimatedDuration: yamlData.scenario_info.estimated_duration,
      targetDomain: yamlData.scenario_info.target_domains,
      prerequisites: yamlData.scenario_info.prerequisites || [],
      learningObjectives: isZh && yamlData.scenario_info.learning_objectives_zh ? 
        yamlData.scenario_info.learning_objectives_zh : 
        yamlData.scenario_info.learning_objectives,
      tasks: (yamlData.tasks || []).map(task => ({
        id: task.id,
        title: isZh && task.title_zh ? task.title_zh : task.title,
        description: isZh && task.description_zh ? task.description_zh : task.description,
        category: task.category || 'general',
        instructions: isZh && task.instructions_zh ? task.instructions_zh : task.instructions,
        expectedOutcome: isZh && task.expected_outcome_zh ? task.expected_outcome_zh : task.expected_outcome,
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