import { NextRequest, NextResponse } from 'next/server';
import { ScenarioEditorRepository } from '@/lib/repositories/ScenarioEditorRepository';

const repository = new ScenarioEditorRepository();

// GET /api/scenarios/editor - Get all scenarios
export async function GET() {
  try {
    const scenarios = await repository.findAll();
    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

// POST /api/scenarios/editor - Create new scenario or publish updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📥 Received data from frontend:', JSON.stringify(body, null, 2));

    // Handle publish operation (update existing)
    if (body.id && body.id !== 'new') {
      const existing = await repository.findByScenarioId(body.id);

      if (existing) {
        // Transform frontend camelCase to database snake_case
        const content: Record<string, unknown> = {
          tasks: body.taskTemplates || [],
          objectives: body.objectives
        };

        // Add mode-specific data (transform camelCase to snake_case)
        if (body.pblData) {
          content.pbl_data = body.pblData;
        }
        if (body.discoveryData) {
          content.discovery_data = body.discoveryData;
        }
        if (body.assessmentData) {
          content.assessment_data = body.assessmentData;
        }

        console.log('💾 Transformed content for database:', JSON.stringify(content, null, 2));

        // Update existing scenario
        const updated = await repository.update(existing.id, {
          title: body.title,
          description: body.description,
          mode: body.mode,
          difficulty: body.difficulty,
          estimated_time: body.estimatedMinutes,
          content,
          status: 'published',
          tags: body.tags || []
        });

        return NextResponse.json({
          success: true,
          scenario: updated,
          message: 'Scenario published successfully'
        });
      }
    }

    // Create new scenario
    const scenario_id = body.id === 'new'
      ? `scenario-${Date.now()}`
      : body.id || body.scenario_id;

    // Check if scenario_id already exists
    const existing = await repository.findByScenarioId(scenario_id);
    if (existing) {
      return NextResponse.json(
        { error: 'Scenario with this ID already exists' },
        { status: 409 }
      );
    }

    // Transform frontend camelCase to database snake_case
    const content: Record<string, unknown> = {
      tasks: body.taskTemplates || [],
      objectives: body.objectives || { en: [], zh: [] }
    };

    // Add mode-specific data (transform camelCase to snake_case)
    if (body.pblData) {
      content.pbl_data = body.pblData;
    }
    if (body.discoveryData) {
      content.discovery_data = body.discoveryData;
    }
    if (body.assessmentData) {
      content.assessment_data = body.assessmentData;
    }

    console.log('💾 Transformed content for database (new):', JSON.stringify(content, null, 2));

    // Create new scenario with default structure
    const newScenario = await repository.create({
      scenario_id,
      mode: body.mode || 'pbl',
      title: body.title || { en: 'New Scenario', zh: '新場景' },
      description: body.description || { en: '', zh: '' },
      content,
      status: 'draft',
      tags: body.tags || [],
      difficulty: body.difficulty || 'medium',
      estimated_time: body.estimatedMinutes || 60
    });

    return NextResponse.json({
      success: true,
      scenario: newScenario,
      message: 'Scenario created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create/update scenario' },
      { status: 500 }
    );
  }
}