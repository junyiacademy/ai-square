import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import type { 
  IProgram, 
  ITask, 
  IScenario, 
  IEvaluation
} from '@/types/unified-learning';
import type { ProgramStatus } from '@/types/database';
// Removed unused imports

// Simple in-memory cache for scenarios
interface CachedScenario {
  scenario: IScenario;
  timestamp: number;
}
const scenarioCache = new Map<string, CachedScenario>();
const SCENARIO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Try to get user from authentication
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      // For security: require proper authentication
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userEmail = session.user.email;
    
    // Await params before using
    const { id } = await params;
    
    const programRepo = repositoryFactory.getProgramRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user ID from email
    const user = await userRepo.findByEmail(userEmail);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get user programs efficiently
    const allUserPrograms = await programRepo.findByUser(user.id);
    
    // Check if this is an assessment scenario
    const now = Date.now();
    const cached = scenarioCache.get(id);
    
    let scenario: IScenario | null;
    if (cached && (now - cached.timestamp) < SCENARIO_CACHE_TTL) {
      scenario = cached.scenario;
    } else {
      // Quick check if this scenario is assessment type
      const scenarioRepo = repositoryFactory.getScenarioRepository();
      scenario = await scenarioRepo.findById(id);
      
      // Cache the result
      if (scenario) {
        scenarioCache.set(id, { scenario, timestamp: now });
      }
    }
    
    // Always filter by scenario ID to show only programs for this specific scenario
    const userPrograms = allUserPrograms.filter(p => p.scenarioId === id);
    
    // Sort by startedAt (newest first)
    userPrograms.sort((a, b) => 
      new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime()
    );
    
    // Optimize by batching evaluations for completed programs
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Get all evaluation IDs from completed programs
    const evaluationIds = userPrograms
      .filter(p => p.status === 'completed' && p.metadata?.evaluationId)
      .map(p => p.metadata!.evaluationId!);
    
    // Batch fetch evaluations
    const evaluationsMap = new Map<string, IEvaluation>();
    if (evaluationIds.length > 0) {
      const rawEvaluations = await Promise.all(
        evaluationIds.map((id: unknown) => evaluationRepo.findById(id as string).catch(() => null))
      );
      evaluationIds.forEach((id: unknown, index: number) => {
        const rawEval = rawEvaluations[index];
        if (rawEval) {
          evaluationsMap.set(id as string, rawEval);
        }
      });
    }
    
    // Enrich programs with minimal async operations
    const enrichedPrograms = userPrograms.map((program) => {
      // Get cached evaluation if available
      const evaluationId = program.metadata?.evaluationId;
      const evaluation = (typeof evaluationId === 'string' && evaluationId)
        ? evaluationsMap.get(evaluationId) 
        : null;
      
      // For active programs, we might need task count, but skip for now to improve performance
      const enrichedProgram = {
        ...program,
        score: evaluation?.score || program.metadata?.score || 0,
        metadata: {
          ...program.metadata,
          questionsAnswered: program.metadata?.questionsAnswered || 0,
          totalQuestions: evaluation?.metadata?.totalQuestions,
          correctAnswers: evaluation?.metadata?.correctAnswers,
          timeSpent: evaluation?.metadata?.completionTime,
          level: evaluation?.metadata?.level,
          domainScores: evaluation?.metadata?.domainScores,
          completedAt: program.completedAt || evaluation?.createdAt
        }
      };
      
      return enrichedProgram;
    });
    
    return NextResponse.json({ 
      programs: enrichedPrograms,
      totalCount: enrichedPrograms.length 
    });
  } catch (error) {
    console.error('Error getting programs:', error);
    return NextResponse.json(
      { error: 'Failed to load programs' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { action, language = 'en' } = body;
    
    // Get user session using consistent method
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const email = session.user.email;
    
    if (action !== 'start') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    // Await params before using
    const { id } = await params;
    
    // Get repositories
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const userRepo = repositoryFactory.getUserRepository();
    
    // Get user by email
    let user = await userRepo.findByEmail(email);
    if (!user) {
      // Auto-create user if doesn't exist
      user = await userRepo.create({
        email: email,
        name: email.split('@')[0]
      });
    }
    
    // Get scenario
    const scenario = await scenarioRepo.findById(id);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has an active program for this scenario
    const existingPrograms = await programRepo.findByUser(user.id);
    const activeProgram = existingPrograms.find((p: IProgram) => 
      p.scenarioId === id && p.status === 'active'
    );
    
    if (activeProgram) {
      console.log(`User ${email} already has an active program for scenario ${id}, returning existing`);
      return NextResponse.json({ 
        program: activeProgram,
        existing: true
      });
    }
    
    // Create new program - using the proper DTO
    const rawProgram = await programRepo.create({
      scenarioId: id,
      userId: user.id,
      mode: 'assessment',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 0,  // Will be updated after creating tasks
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {
        language
      }
    });
    
    // Update the program with additional fields after creation
    const updatedRawProgram = await programRepo.update?.(rawProgram.id, {
      status: 'active' as ProgramStatus,
      metadata: {
        sourceType: 'assessment',
        language,
        createdAt: Date.now(),
        timeLimit: 900, // 15 minutes default
        userName: email.split('@')[0]
      }
    });
    
    const program = updatedRawProgram || rawProgram;
    
    // Create tasks from scenario.taskTemplates
    const tasks: ITask[] = [];
    console.log('Scenario has taskTemplates:', !!scenario.taskTemplates);
    console.log('TaskTemplates count:', scenario.taskTemplates?.length || 0);
    
    if (scenario.taskTemplates && Array.isArray(scenario.taskTemplates)) {
      // Create tasks from task templates
      for (let i = 0; i < scenario.taskTemplates.length; i++) {
        const template = scenario.taskTemplates[i];
        
        // Get questions from template content
        const templateData = template as Record<string, unknown>;
        const content = templateData.content as { questions?: Record<string, unknown>[] } | undefined;
        const context = templateData.context as { timeLimit?: number } | undefined;
        const questions = content?.questions || [];
        
        // Apply language-specific content if needed
        const localizedQuestions = questions.map((q: Record<string, unknown>) => ({
          id: q.id,
          domain: q.domain,
          question: q[`question_${language}`] || q.question,
          options: q[`options_${language}`] || q.options,
          difficulty: q.difficulty,
          correct_answer: q.correct_answer,
          explanation: q[`explanation_${language}`] || q.explanation,
          ksa_mapping: q.ksa_mapping
        }));
        
        console.log(`Creating task ${i + 1}:`, {
          taskId: template.id,
          title: template.title,
          questionsCount: localizedQuestions.length,
          firstQuestion: String(localizedQuestions[0]?.question || 'No question').substring(0, 50)
        });
        
        // Create task from template
        const rawTask = await taskRepo.create({
          programId: program.id,
          mode: 'assessment',
          taskIndex: i,
          type: template.type || 'question',
          status: 'pending',
          title: { en: String(template.title || `Task ${i + 1}`) },
          description: { en: String(template.description || template.instructions || 'Complete the assessment questions') },
          content: {
            instructions: String(template.instructions || template.description || 'Complete the assessment questions'),
            questions: localizedQuestions
          },
          interactions: [],
          interactionCount: 0,
          userResponse: {},
          score: 0,
          maxScore: 100,
          allowedAttempts: 1,
          attemptCount: 0,
          timeLimitSeconds: context?.timeLimit || 240,
          timeSpentSeconds: 0,
          aiConfig: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pblData: {},
          discoveryData: {},
          assessmentData: {
            domainId: template.id,
            questionsCount: localizedQuestions.length
          },
          metadata: {
            timeLimit: context?.timeLimit || 240,
            language,
            domainId: template.id
          }
        });
        
        tasks.push(rawTask);
      }
    } else {
      console.error('No task templates found in scenario');
    }
    
    // Update program with task IDs in metadata
    await programRepo.update?.(program.id, {
      metadata: {
        ...program.metadata,
        taskIds: tasks.map(t => t.id)
      }
    });
    
    return NextResponse.json({ 
      program,
      tasks,
      questionsCount: tasks.reduce((sum, t) => {
        const metadata = t.metadata as { questions?: unknown[] } | undefined;
        return sum + (metadata?.questions?.length || 0);
      }, 0)
    });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { error: 'Failed to create program' },
      { status: 500 }
    );
  }
}