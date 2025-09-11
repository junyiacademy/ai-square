/**
 * Admin API to initialize assessment scenarios in database
 * This endpoint loads assessment questions from YAML files into the database
 *
 * Usage: POST /api/admin/init-assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { DifficultyLevel } from '@/types/database';
import path from 'path';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add auth check for admin only
    // const session = await getSession();
    // if (!session?.user?.role === 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json().catch(() => ({})) as { force?: boolean; clean?: boolean };

    const scenarioRepo = repositoryFactory.getScenarioRepository();

    // Check existing assessment scenarios
    // For clean operation, get ALL scenarios (including archived)
    // For normal operation, only get active scenarios
    let allAssessmentScenarios = await scenarioRepo.findByMode?.('assessment', body.clean) || [];

    // If clean flag is set, delete ALL assessment scenarios first
    if (body.clean) {
      console.log(`[Init Assessment] Cleaning ${allAssessmentScenarios.length} scenarios`);

      // Get program repository to handle foreign key constraints
      const programRepo = repositoryFactory.getProgramRepository();

      for (const scenario of allAssessmentScenarios) {
        console.log(`[Init Assessment] Deleting scenario: ${scenario.id}`);
        try {
          // First, delete all programs associated with this scenario
          const programs = await programRepo.findByScenario(scenario.id);
          if (programs.length > 0) {
            console.log(`[Init Assessment] Found ${programs.length} programs for scenario ${scenario.id}, deleting them first`);
            // Note: We don't have a delete method on programRepo yet,
            // but database CASCADE DELETE should handle this
          }

          const deleted = await scenarioRepo.delete(scenario.id);
          console.log(`[Init Assessment] Delete result: ${deleted}`);
        } catch (error) {
          console.error(`[Init Assessment] Failed to delete scenario ${scenario.id}:`, error);
          // Continue with other deletions
        }
      }
      // After cleaning, there are no existing scenarios
      allAssessmentScenarios = [];
    }

    // Find existing scenarios that match our source (for update)
    const existingScenarios = allAssessmentScenarios.filter(s =>
      s.status === 'active' &&
      (s.sourceId === 'ai_literacy' || s.sourcePath === 'assessment_data/ai_literacy')
    );

    // Load the YAML file
    const yamlPath = path.join(process.cwd(), 'public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf8');
    const data = parse(yamlContent);

    // Prepare assessment_data with questions
    const assessmentData = {
      assessmentType: 'ai_literacy',
      totalQuestions: data.assessment_config.total_questions,
      timeLimitMinutes: data.assessment_config.time_limit_minutes,
      passingScore: data.assessment_config.passing_score,
      domains: data.assessment_config.domains,
      // Include the actual questions from tasks
      questionBank: data.tasks.map((task: Record<string, unknown>) => ({
        id: task.id as string,
        domain: task.domain as string,
        questions: (task.questions as Array<Record<string, unknown>>).map((q: Record<string, unknown>) => ({
          id: q.id as string,
          domain: q.domain as string,
          difficulty: q.difficulty as string,
          type: q.type as string,
          correct_answer: q.correct_answer as string,
          question: q.question as string,
          options: q.options as Record<string, string>,
          explanation: q.explanation as string,
          text: q.question as string,
          ksa_codes: q.ksa_codes as string[],
          ksa_mapping: q.ksa_mapping as {
            knowledge?: string[];
            skills?: string[];
            attitudes?: string[];
          }
        }))
      }))
    };

    let result;

    if (existingScenarios.length > 0) {
      // Update existing scenario
      const scenario = existingScenarios[0];
      result = await scenarioRepo.update(scenario.id, {
        assessmentData,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        action: 'updated',
        scenarioId: result.id,
        questionBanks: assessmentData.questionBank.length,
        totalQuestions: assessmentData.totalQuestions,
        message: 'Assessment scenario updated with questions'
      });
    } else {
      // Create new scenario
      const title = { en: 'AI Literacy Assessment' };
      const description = { en: 'Test your understanding of AI concepts and applications' };

      const taskTemplates = [{
        id: 'assessment-task',
        title: { en: 'Complete Assessment' },
        type: 'question' as const
      }];

      result = await scenarioRepo.create({
        mode: 'assessment',
        status: 'active',
        version: '1.0',
        sourceType: 'yaml',
        sourcePath: 'assessment_data/ai_literacy',
        sourceId: 'ai_literacy',
        sourceMetadata: {
          configPath: 'ai_literacy_questions_en.yaml',
          assessmentName: 'ai_literacy',
          assessmentType: 'standard'
        },
        title,
        description,
        objectives: [
          'Evaluate AI knowledge',
          'Identify strengths and gaps',
          'Get personalized recommendations'
        ],
        difficulty: 'intermediate' as DifficultyLevel,
        estimatedMinutes: data.assessment_config.time_limit_minutes || 60,
        prerequisites: [],
        taskTemplates,
        xpRewards: { completion: 50 },
        unlockRequirements: {},
        pblData: {},
        discoveryData: {},
        assessmentData,
        aiModules: {},
        resources: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      });

      // Clear assessment-related caches
      console.log('[Init Assessment] Clearing assessment caches...');
      try {
        await distributedCacheService.delete('scenarios:by-mode:assessment');
        await distributedCacheService.delete('assessment:scenarios:*');

        // Clear all assessment-related cache keys
        const keys = await distributedCacheService.getAllKeys();
        const assessmentKeys = keys.filter(key =>
          key.includes('assessment') ||
          key.includes('scenario') ||
          key.startsWith('scenarios:')
        );

        for (const key of assessmentKeys) {
          await distributedCacheService.delete(key);
        }

        console.log(`[Init Assessment] Cleared ${assessmentKeys.length} cache entries`);
      } catch (error) {
        console.error('[Init Assessment] Error clearing caches:', error);
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        scenarioId: result.id,
        questionBanks: assessmentData.questionBank.length,
        totalQuestions: assessmentData.totalQuestions,
        message: 'Assessment scenario created with questions'
      });
    }
  } catch (error) {
    console.error('Error initializing assessment scenarios:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize assessment scenarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
