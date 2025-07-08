/**
 * V2 Assessment Attempt API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { AssessmentService } from '@/lib/v2/services/assessment.service';
import { SourceContentRepository } from '@/lib/v2/repositories/source-content.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { ProgramRepository } from '@/lib/v2/repositories/program.repository';
import { TaskRepository } from '@/lib/v2/repositories/task.repository';
import { LogRepository } from '@/lib/v2/repositories/log.repository';
import { EvaluationRepository } from '@/lib/v2/repositories/evaluation.repository';

// POST /api/v2/assessment/attempt - Create new assessment attempt
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      sourceId, 
      sourceCode, 
      attemptType = 'practice',
      config = {}
    } = body;

    if (!sourceId && !sourceCode) {
      return NextResponse.json(
        { error: 'Either sourceId or sourceCode is required' },
        { status: 400 }
      );
    }

    if (!['practice', 'formal'].includes(attemptType)) {
      return NextResponse.json(
        { error: 'attemptType must be either "practice" or "formal"' },
        { status: 400 }
      );
    }

    const storage = await StorageFactory.getStorage();
    const sourceRepo = new SourceContentRepository(storage);
    
    // Find source content
    let sourceContent;
    if (sourceId) {
      sourceContent = await sourceRepo.findById(sourceId);
    } else {
      sourceContent = await sourceRepo.findByCode(sourceCode);
    }

    if (!sourceContent || sourceContent.type !== 'assessment') {
      return NextResponse.json(
        { error: 'Assessment source not found' },
        { status: 404 }
      );
    }

    // Create assessment service
    const repositories = {
      scenario: new ScenarioRepository(storage),
      program: new ProgramRepository(storage),
      task: new TaskRepository(storage),
      log: new LogRepository(storage),
      evaluation: new EvaluationRepository(storage)
    };

    const assessmentService = new AssessmentService(repositories, storage);
    
    // Create assessment attempt
    const { scenario, program } = await assessmentService.createAssessmentAttempt(
      user.email,
      sourceContent,
      attemptType,
      config
    );

    // Get first task
    const tasks = await repositories.task.findByProgram(program.id);
    const firstTask = tasks[0];

    return NextResponse.json({
      scenario,
      program,
      firstTask,
      totalQuestions: tasks.length,
      message: 'Assessment attempt created successfully'
    });
  } catch (error) {
    console.error('Error creating assessment attempt:', error);
    return NextResponse.json(
      { error: 'Failed to create assessment attempt' },
      { status: 500 }
    );
  }
}