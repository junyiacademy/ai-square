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
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you should use proper authentication in production
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer admin-init-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Check existing assessment scenarios
    const existingScenarios = await scenarioRepo.findBySource('yaml', 'ai_literacy');
    
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
      questionBank: data.tasks.map((task: any) => ({
        id: task.id,
        domain: task.domain,
        questions: task.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          ksa_codes: q.ksa_codes
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
        difficulty: 'intermediate',
        estimatedMinutes: data.assessment_config.time_limit_minutes,
        prerequisites: [],
        taskTemplates,
        taskCount: 1,  // Assessment has 1 task
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