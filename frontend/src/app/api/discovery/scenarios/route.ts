import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { careerType, language = 'zhTW' } = body;
    
    if (!careerType) {
      return NextResponse.json({ error: 'Career type required' }, { status: 400 });
    }

    const userEmail = session.user.email;
    const scenarioRepo = getScenarioRepository();
    
    // Verify YAML file exists before creating scenario
    const yamlData = await DiscoveryYAMLLoader.loadPath(careerType, language as 'en' | 'zhTW');
    
    if (!yamlData) {
      return NextResponse.json({ 
        error: `YAML data not found for career type: ${careerType}` 
      }, { status: 404 });
    }
    
    // Create new discovery scenario with YAML path reference
    const scenario = await scenarioRepo.create({
      sourceType: 'discovery',
      sourceRef: {
        type: 'yaml',
        sourceId: careerType,
        path: `discovery_data/${careerType}/${careerType}_{lang}.yml`, // Template path
        metadata: {
          careerType: careerType,
          defaultLanguage: language
        }
      },
      title: yamlData.metadata.title,
      description: yamlData.metadata.long_description,
      objectives: yamlData.learning_objectives,
      taskTemplates: [], // Tasks are created dynamically when program starts
      // Only store essential metadata, not full YAML content
      metadata: {
        category: yamlData.category,
        difficultyRange: yamlData.difficulty_range,
        estimatedHours: yamlData.metadata.estimated_hours
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({
      scenarioId: scenario.id,
      scenario: scenario
    });
  } catch (error) {
    console.error('Error in POST /api/discovery/scenarios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}