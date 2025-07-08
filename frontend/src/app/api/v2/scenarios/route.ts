/**
 * V2 Scenarios API
 * POST /api/v2/scenarios - Create a new scenario with flexible structure
 * GET /api/v2/scenarios - Get all scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { DiscoveryServiceV2 } from '@/lib/v2/services/discovery-service';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { CreateScenarioOptions, ScenarioWithHierarchy } from '@/lib/v2/types';
import { DatabaseFactory } from '@/lib/v2/utils/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioData, options } = body as {
      scenarioData: any;
      options?: CreateScenarioOptions;
    };

    // Validate required fields
    if (!scenarioData.title || !scenarioData.code) {
      return NextResponse.json(
        { error: 'Title and code are required' },
        { status: 400 }
      );
    }

    // Get the appropriate service based on structure type
    const db = new DatabaseFactory().create({ database: 'ai-square-v2' });
    let service;
    
    const structureType = options?.structure_type || scenarioData.structure_type || 'standard';
    
    switch (structureType) {
      case 'standard':
        service = new PBLServiceV2(db);
        break;
      case 'single_program':
        service = new DiscoveryServiceV2(db);
        break;
      case 'direct_task':
        service = new AssessmentServiceV2(db);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid structure type' },
          { status: 400 }
        );
    }

    // Create the scenario
    const scenario = await service.createScenario(scenarioData, options);

    return NextResponse.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Mock scenarios for demonstration
    const mockScenarios: ScenarioWithHierarchy[] = [
      // Assessment Scenarios
      {
        id: 'scenario_assessment_1',
        user_id: 'user_demo',
        project_id: 'proj_ai_literacy',
        code: 'ai-literacy-foundation',
        title: 'AI Literacy Foundation Assessment',
        description: 'Test your understanding of fundamental AI concepts',
        structure_type: 'direct_task',
        order_index: 0,
        is_active: true,
        metadata: {
          learning_type: 'assessment',
          assessment_type: 'quick',
          difficulty: 'intermediate',
          domains: ['engaging_with_ai', 'creating_with_ai'],
          language: 'en',
          time_limit: 30,
          passing_score: 70
        },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        programs: [
          {
            id: 'prog_assess_1',
            scenario_id: 'scenario_assessment_1',
            code: 'tasks',
            title: 'Questions',
            description: 'Assessment questions',
            difficulty_level: 'intermediate',
            order_index: 0,
            is_active: true,
            is_virtual: true,
            created_at: new Date('2025-01-01'),
            updated_at: new Date('2025-01-01'),
            tasks: [
              {
                id: 'task_q1',
                program_id: 'prog_assess_1',
                code: 'q1',
                title: 'Question 1',
                description: 'What is the primary purpose of a Large Language Model?',
                instructions: 'Select the best answer',
                task_type: 'assessment',
                task_variant: 'question',
                order_index: 0,
                is_active: true,
                created_at: new Date('2025-01-01'),
                updated_at: new Date('2025-01-01')
              }
            ]
          }
        ]
      },
      {
        id: 'scenario_assessment_2',
        user_id: 'user_demo',
        project_id: 'proj_ai_ethics',
        code: 'ai-ethics-assessment',
        title: 'AI Ethics and Responsibility Assessment',
        description: 'Evaluate your understanding of AI ethics and responsible AI use',
        structure_type: 'direct_task',
        order_index: 1,
        is_active: true,
        metadata: {
          learning_type: 'assessment',
          assessment_type: 'comprehensive',
          difficulty: 'advanced',
          domains: ['managing_with_ai', 'designing_with_ai'],
          language: 'en',
          time_limit: 45,
          passing_score: 80
        },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        programs: []
      },

      // PBL Scenarios
      {
        id: 'scenario_pbl_1',
        user_id: 'user_demo',
        project_id: 'proj_ai_job_search',
        code: 'ai-job-search-mastery',
        title: 'AI-Powered Job Search Mastery',
        description: 'Learn to leverage AI tools throughout your job search journey',
        structure_type: 'standard',
        order_index: 0,
        is_active: true,
        metadata: {
          learning_type: 'pbl',
          difficulty: 'intermediate',
          domains: ['engaging_with_ai', 'creating_with_ai'],
          language: 'en',
          estimated_duration: 90
        },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        programs: [
          {
            id: 'prog_1',
            scenario_id: 'scenario_pbl_1',
            code: 'foundation',
            title: 'Foundation',
            description: 'Learn the basics of AI in job searching',
            difficulty_level: 'beginner',
            order_index: 0,
            is_active: true,
            created_at: new Date('2025-01-01'),
            updated_at: new Date('2025-01-01'),
            tasks: [
              {
                id: 'task_1',
                program_id: 'prog_1',
                code: 'intro',
                title: 'Introduction to AI Job Search',
                description: 'Understanding how AI can help',
                instructions: 'Follow the AI tutor',
                task_type: 'learning',
                order_index: 0,
                is_active: true,
                created_at: new Date('2025-01-01'),
                updated_at: new Date('2025-01-01')
              }
            ]
          }
        ]
      },
      {
        id: 'scenario_pbl_2',
        user_id: 'user_demo',
        project_id: 'proj_smart_city',
        code: 'smart-city-planning',
        title: 'Smart City Planning with AI',
        description: 'Design future cities using AI-powered urban planning tools',
        structure_type: 'standard',
        order_index: 1,
        is_active: true,
        metadata: {
          learning_type: 'pbl',
          difficulty: 'beginner',
          domains: ['designing_with_ai', 'managing_with_ai'],
          language: 'en',
          estimated_duration: 60
        },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        programs: []
      },

      // Discovery Scenarios
      {
        id: 'scenario_discovery_1',
        user_id: 'user_demo',
        project_id: 'proj_ai_pm',
        code: 'ai-product-manager',
        title: 'Exploring AI Product Manager Career',
        description: 'Experience different scenarios in AI Product Management',
        structure_type: 'standard',
        order_index: 0,
        is_active: true,
        metadata: {
          learning_type: 'discovery',
          career: 'AI Product Manager',
          difficulty: 'intermediate',
          language: 'en',
          total_scenarios: 3
        },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        programs: [
          {
            id: 'prog_disc_1',
            scenario_id: 'scenario_discovery_1',
            code: 'daily_routine',
            title: 'Day in the Life of an AI PM',
            description: 'Experience typical daily activities',
            difficulty_level: 'intermediate',
            order_index: 0,
            is_active: true,
            created_at: new Date('2025-01-01'),
            updated_at: new Date('2025-01-01'),
            tasks: []
          }
        ]
      },
      {
        id: 'scenario_discovery_2',
        user_id: 'user_demo',
        project_id: 'proj_data_scientist',
        code: 'data-scientist-journey',
        title: 'Data Scientist Career Journey',
        description: 'Explore the path of a data scientist',
        structure_type: 'standard',
        order_index: 1,
        is_active: true,
        metadata: {
          learning_type: 'discovery',
          career: 'Data Scientist',
          difficulty: 'advanced',
          language: 'en',
          total_scenarios: 3
        },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        programs: []
      }
    ];
    
    let filteredScenarios = mockScenarios;
    if (type && ['pbl', 'discovery', 'assessment'].includes(type)) {
      filteredScenarios = mockScenarios.filter(s => s.metadata?.learning_type === type);
    }

    return NextResponse.json({
      success: true,
      scenarios: filteredScenarios,
      total: filteredScenarios.length
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}