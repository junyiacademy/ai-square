import { NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario } from '@/types/unified-learning';

// This endpoint is for staging environment only
export async function POST() {
  // Only allow in staging environment
  if (process.env.ENVIRONMENT !== 'staging') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in staging environment' },
      { status: 403 }
    );
  }

  try {
    // Check if using PostgreSQL
    if (!process.env.USE_POSTGRES) {
      return NextResponse.json(
        { success: false, error: 'PostgreSQL is not enabled' },
        { status: 400 }
      );
    }

    // Use repositories to create sample data
    const userRepo = repositoryFactory.getUserRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Create sample test user
    try {
      await userRepo.create({
        email: 'staging-test@ai-square.com',
        name: 'Staging Test User',
        preferredLanguage: 'en'
      });
    } catch (error) {
      // User might already exist
      console.log('User creation skipped:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Create sample scenarios
    const scenarios: Array<Omit<IScenario, 'id'>> = [
      { 
        mode: 'pbl',
        status: 'active',
        version: '1.0.0',
        sourceType: 'manual',
        sourceMetadata: { id: 'marketing-crisis-management' },
        title: { en: 'Marketing Crisis Management' },
        description: { en: 'Learn to handle marketing crises using AI tools' },
        objectives: [],
        difficulty: 'intermediate',
        estimatedMinutes: 45,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { id: 'marketing-crisis-management' }
      },
      { 
        mode: 'pbl',
        status: 'active',
        version: '1.0.0',
        sourceType: 'manual',
        sourceMetadata: { id: 'social-media-strategy' },
        title: { en: 'Social Media Strategy' },
        description: { en: 'Develop social media strategies with AI assistance' },
        objectives: [],
        difficulty: 'beginner',
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { id: 'social-media-strategy' }
      },
      { 
        mode: 'assessment',
        status: 'active',
        version: '1.0.0',
        sourceType: 'manual',
        sourceMetadata: { id: 'ai-literacy-assessment' },
        title: { en: 'AI Literacy Assessment' },
        description: { en: 'Test your AI literacy knowledge' },
        objectives: [],
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: {},
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData: { assessmentType: 'diagnostic' },
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { id: 'ai-literacy-assessment' }
      },
      { 
        mode: 'discovery',
        status: 'active',
        version: '1.0.0',
        sourceType: 'manual',
        sourceMetadata: { id: 'career-exploration' },
        title: { en: 'Career Exploration' },
        description: { en: 'Explore AI-related career paths' },
        objectives: [],
        difficulty: 'beginner',
        estimatedMinutes: 25,
        prerequisites: [],
        taskTemplates: [],
        taskCount: 0,
        xpRewards: { completion: 100 },
        unlockRequirements: {},
        pblData: {},
        discoveryData: { explorationPath: 'careers' },
        assessmentData: {},
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { id: 'career-exploration' }
      }
    ];

    for (const scenario of scenarios) {
      try {
        await scenarioRepo.create(scenario);
      } catch (error) {
        // Scenario might already exist
        console.log(`Scenario creation skipped:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Get counts
    const users = await userRepo.findAll({ limit: 1000 });
    const scenariosData = await scenarioRepo.findActive?.() || [];

    return NextResponse.json({
      success: true,
      message: 'Staging database initialized successfully',
      data: {
        users: users.length,
        scenarios: scenariosData.length
      }
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}