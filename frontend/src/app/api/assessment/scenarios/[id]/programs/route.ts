import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { 
  Program, 
  Task, 
  Scenario, 
  Evaluation,
  ProgramStatus
} from '@/lib/repositories/interfaces/index';

// Type alias for Scenario with additional properties
type ScenarioWithSourceRef = Scenario & {
  sourceType?: string;
}

// Extend Program type to include additional fields used in this route
interface ProgramWithExtras extends Omit<Program, 'startedAt'> {
  startedAt?: string | Date;
  completedAt?: string | Date;
}

// Simple in-memory cache for scenarios
interface CachedScenario {
  scenario: ScenarioWithSourceRef;
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
    
    // Get user programs efficiently
    const allUserPrograms = await programRepo.findByUser(userEmail);
    
    // Check if this is an assessment scenario
    const now = Date.now();
    const cached = scenarioCache.get(id);
    
    let scenario: ScenarioWithSourceRef | null;
    if (cached && (now - cached.timestamp) < SCENARIO_CACHE_TTL) {
      scenario = cached.scenario;
    } else {
      // Quick check if this scenario is assessment type
      const scenarioRepo = repositoryFactory.getScenarioRepository();
      scenario = await scenarioRepo.findById(id) as ScenarioWithSourceRef | null;
      
      // Cache the result
      if (scenario) {
        scenarioCache.set(id, { scenario, timestamp: now });
      }
    }
    
    let userPrograms: ProgramWithExtras[];
    if (scenario && scenario.sourceType === 'assessment') {
      // For assessment scenarios, show all completed assessments from this user
      userPrograms = allUserPrograms.filter(p => 
        p.status === 'completed' && p.metadata?.score !== undefined
      ) as ProgramWithExtras[];
    } else {
      // For non-assessment scenarios, only show programs for this specific scenario
      userPrograms = allUserPrograms.filter(p => p.scenarioId === id) as ProgramWithExtras[];
    }
    
    // Sort by startedAt (newest first)
    userPrograms.sort((a: ProgramWithExtras, b: ProgramWithExtras) => 
      new Date(b.startedAt || b.startTime).getTime() - new Date(a.startedAt || a.startTime).getTime()
    );
    
    // Optimize by batching evaluations for completed programs
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Get all evaluation IDs from completed programs
    const evaluationIds = userPrograms
      .filter(p => p.status === 'completed' && p.metadata?.evaluationId)
      .map(p => p.metadata!.evaluationId!);
    
    // Batch fetch evaluations
    const evaluationsMap = new Map<string, Evaluation>();
    if (evaluationIds.length > 0) {
      const evaluations = await Promise.all(
        evaluationIds.map((id: unknown) => evaluationRepo.findById(id as string).catch(() => null))
      );
      evaluationIds.forEach((id: unknown, index: number) => {
        if (evaluations[index]) {
          evaluationsMap.set(id as string, evaluations[index]!);
        }
      });
    }
    
    // Enrich programs with minimal async operations
    const enrichedPrograms = userPrograms.map((program: ProgramWithExtras) => {
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
    
    // Get scenario
    const scenario = await scenarioRepo.findById(id) as ScenarioWithSourceRef | null;
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has an active program for this scenario
    const existingPrograms = await programRepo.findByUser(email);
    const activeProgram = existingPrograms.find((p: Program) => 
      p.scenarioId === id && p.status === 'active'
    ) as ProgramWithExtras | undefined;
    
    if (activeProgram) {
      console.log(`User ${email} already has an active program for scenario ${id}, returning existing`);
      return NextResponse.json({ 
        program: activeProgram,
        existing: true
      });
    }
    
    // Create new program - using the proper DTO
    const program = await programRepo.create({
      scenarioId: id,
      userId: email,
      totalTasks: 0  // Will be updated after creating tasks
    });
    
    // Update the program with additional fields after creation
    await programRepo.update(program.id, {
      status: 'active' as ProgramStatus,
      metadata: {
        sourceType: 'assessment',
        language,
        startTime: Date.now(),
        timeLimit: 900, // 15 minutes default
        userName: email.split('@')[0]
      }
    });
    
    // Load questions from YAML and create tasks
    const tasks: Task[] = [];
    console.log('Scenario sourceRef:', JSON.stringify(scenario.sourceRef, null, 2));
    
    const sourceRef = scenario.sourceRef as unknown as { metadata?: { configPath?: string } };
    if (sourceRef?.metadata?.configPath) {
      try {
        const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
        const configPath = path.join(baseDir, 'public', sourceRef.metadata.configPath);
        console.log('Loading assessment config from:', configPath);
        
        const configContent = await fs.readFile(configPath, 'utf-8');
        interface AssessmentQuestion {
          id: string;
          domain: string;
          question: string;
          options: string[];
          difficulty: string;
          correct_answer: string;
          explanation: string;
          ksa_mapping: {
            knowledge?: string[];
            skills?: string[];
            attitudes?: string[];
          };
          [key: string]: unknown; // For language-specific fields
        }

        interface AssessmentTask {
          id: string;
          title: string;
          description?: string;
          time_limit_minutes?: number;
          questions?: AssessmentQuestion[];
          [key: string]: unknown; // For language-specific fields
        }

        interface AssessmentYamlData {
          tasks?: AssessmentTask[];
          questions?: AssessmentQuestion[];
        }
        const yamlData = yaml.load(configContent) as AssessmentYamlData;
        console.log('YAML data loaded, has tasks:', !!yamlData.tasks);
        
        // Check if new format with tasks
        if (yamlData.tasks) {
          // New format: Multiple tasks based on domains
          for (let i = 0; i < yamlData.tasks.length; i++) {
            const taskData = yamlData.tasks[i];
            
            // Get language-specific questions for this task
            const taskQuestions = taskData.questions?.map((q) => ({
              id: q.id,
              domain: q.domain,
              question: q[`question_${language}`] || q.question,
              options: q[`options_${language}`] || q.options,
              difficulty: q.difficulty,
              correct_answer: q.correct_answer,
              explanation: q[`explanation_${language}`] || q.explanation,
              ksa_mapping: q.ksa_mapping
            })) || [];
            
            console.log(`Creating task ${i + 1}:`, {
              taskId: taskData.id,
              title: taskData.title,
              questionsCount: taskQuestions.length,
              firstQuestion: typeof taskQuestions[0]?.question === 'string' 
                ? taskQuestions[0].question.substring(0, 50)
                : 'No question text'
            });
            
            // Create task for this domain - using the proper DTO
            const task = await taskRepo.create({
              programId: program.id,
              taskIndex: i,
              type: 'question',
              title: String(taskData[`title_${language}`] || taskData.title || `Task ${i + 1}`),
              content: {
                instructions: String(taskData[`description_${language}`] || taskData.description || 'Complete the assessment questions')
              },
              context: {
                scenarioId: scenario.id,
                taskType: 'assessment',
                difficulty: (typeof taskData.difficulty === 'string' ? taskData.difficulty : 'medium'),
                estimatedTime: taskData.time_limit_minutes ? taskData.time_limit_minutes * 60 : 240
              },
              metadata: {
                questions: taskQuestions,
                timeLimit: taskData.time_limit_minutes ? taskData.time_limit_minutes * 60 : 240,
                language,
                domainId: taskData.id
              }
            });
            
            tasks.push(task);
          }
        } else {
          // Legacy format: Single task with all questions
          const questions = yamlData.questions?.map((q) => ({
            id: q.id,
            domain: q.domain,
            question: q[`question_${language}`] || q.question,
            options: q[`options_${language}`] || q.options,
            difficulty: q.difficulty,
            correct_answer: q.correct_answer,
            explanation: q[`explanation_${language}`] || q.explanation,
            ksa_mapping: q.ksa_mapping
          })) || [];
          
          const task = await taskRepo.create({
            programId: program.id,
            taskIndex: 0,
            type: 'question',
            title: 'Assessment Questions',
            content: {
              instructions: 'Complete the assessment questions'
            },
            context: {
              scenarioId: scenario.id,
              taskType: 'assessment',
              difficulty: 'medium',
              estimatedTime: 900
            },
            metadata: {
              questions,
              timeLimit: 900,
              language
            }
          });
          
          tasks.push(task);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    }
    
    // Update program with task IDs
    await programRepo.update(program.id, {
      taskIds: tasks.map(t => t.id)
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