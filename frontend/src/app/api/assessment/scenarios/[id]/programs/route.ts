import { NextRequest, NextResponse } from 'next/server';
import { 
  getScenarioRepository, 
  getProgramRepository, 
  getTaskRepository,
  getEvaluationRepository 
} from '@/lib/implementations/gcs-v2';
import { getServerSession } from '@/lib/auth/session';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Simple in-memory cache for scenarios
const scenarioCache = new Map<string, { scenario: any; timestamp: number }>();
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
    
    const programRepo = getProgramRepository();
    
    // Get user programs efficiently
    const allUserPrograms = await programRepo.findByUser(userEmail);
    
    // Check if this is an assessment scenario
    const now = Date.now();
    const cached = scenarioCache.get(id);
    
    let scenario;
    if (cached && (now - cached.timestamp) < SCENARIO_CACHE_TTL) {
      scenario = cached.scenario;
    } else {
      // Quick check if this scenario is assessment type
      const scenarioRepo = getScenarioRepository();
      scenario = await scenarioRepo.findById(id);
      
      // Cache the result
      if (scenario) {
        scenarioCache.set(id, { scenario, timestamp: now });
      }
    }
    
    let userPrograms;
    if (scenario && scenario.sourceType === 'assessment') {
      // For assessment scenarios, show all completed assessments from this user
      userPrograms = allUserPrograms.filter(p => 
        p.status === 'completed' && p.metadata?.score !== undefined
      );
    } else {
      // For non-assessment scenarios, only show programs for this specific scenario
      userPrograms = allUserPrograms.filter(p => p.scenarioId === id);
    }
    
    // Sort by startedAt (newest first)
    userPrograms.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    
    // Optimize by batching evaluations for completed programs
    const evaluationRepo = getEvaluationRepository();
    const taskRepo = getTaskRepository();
    
    // Get all evaluation IDs from completed programs
    const evaluationIds = userPrograms
      .filter(p => p.status === 'completed' && p.metadata?.evaluationId)
      .map(p => p.metadata!.evaluationId!);
    
    // Batch fetch evaluations
    const evaluationsMap = new Map();
    if (evaluationIds.length > 0) {
      const evaluations = await Promise.all(
        evaluationIds.map(id => evaluationRepo.findById(id as string).catch(() => null))
      );
      evaluationIds.forEach((id, index) => {
        if (evaluations[index]) {
          evaluationsMap.set(id, evaluations[index]);
        }
      });
    }
    
    // Enrich programs with minimal async operations
    const enrichedPrograms = userPrograms.map(program => {
      // Get cached evaluation if available
      const evaluation = program.metadata?.evaluationId 
        ? evaluationsMap.get(program.metadata.evaluationId) 
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
    
    // Try to get user from authentication
    const authUser = await getAuthFromRequest(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const email = authUser.email;
    
    if (action !== 'start') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
    
    // Await params before using
    const { id } = await params;
    
    // Get repositories
    const scenarioRepo = getScenarioRepository();
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
    // Get scenario
    const scenario = await scenarioRepo.findById(id);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has an active program for this scenario
    const existingPrograms = await programRepo.findByUser(email);
    const activeProgram = existingPrograms.find(p => 
      p.scenarioId === id && p.status === 'active'
    );
    
    if (activeProgram) {
      console.log(`User ${email} already has an active program for scenario ${id}, returning existing`);
      return NextResponse.json({ 
        program: activeProgram,
        existing: true
      });
    }
    
    // Create new program
    const program = await programRepo.create({
      scenarioId: id,
      userId: email,
      status: 'active',
      startedAt: new Date().toISOString(),
      taskIds: [],
      currentTaskIndex: 0,
      metadata: {
        sourceType: 'assessment',
        language,
        startTime: Date.now(),
        timeLimit: 900, // 15 minutes default
        userName: authUser?.name || email
      }
    });
    
    // Load questions from YAML and create tasks
    const tasks = [];
    if (scenario.sourceRef.metadata?.configPath) {
      try {
        const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
        const configPath = path.join(baseDir, 'public', scenario.sourceRef.metadata.configPath as string);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const yamlData = yaml.load(configContent) as any;
        
        // Check if new format with tasks
        if (yamlData.tasks) {
          // New format: Multiple tasks based on domains
          for (let i = 0; i < yamlData.tasks.length; i++) {
            const taskData = yamlData.tasks[i];
            
            // Get language-specific questions for this task
            const taskQuestions = taskData.questions?.map((q: any) => ({
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
              firstQuestion: taskQuestions[0]?.question?.substring(0, 50)
            });
            
            // Create task for this domain
            const task = await taskRepo.create({
              programId: program.id,
              scenarioTaskIndex: i,
              title: taskData[`title_${language}`] || taskData.title || `Task ${i + 1}`,
              type: 'question',
              content: {
                instructions: taskData[`description_${language}`] || taskData.description || 'Complete the assessment questions',
                context: {
                  questions: taskQuestions,
                  timeLimit: taskData.time_limit_minutes ? taskData.time_limit_minutes * 60 : 240, // Convert to seconds
                  language,
                  domainId: taskData.id
                }
              },
              status: 'pending',
              startedAt: '',
              interactions: []
            });
            
            tasks.push(task);
          }
        } else {
          // Legacy format: Single task with all questions
          const questions = yamlData.questions?.map((q: any) => ({
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
            scenarioTaskIndex: 0,
            title: 'Assessment Questions',
            type: 'question',
            content: {
              instructions: 'Complete the assessment questions',
              context: {
                questions,
                timeLimit: 900,
                language
              }
            },
            status: 'pending',
            startedAt: new Date().toISOString(),
            interactions: []
          });
          
          tasks.push(task);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    }
    
    // Update program with task IDs
    await programRepo.updateTaskIds(program.id, tasks.map(t => t.id));
    
    return NextResponse.json({ 
      program,
      tasks,
      questionsCount: tasks.reduce((sum, t) => sum + ((t.content.context as any)?.questions?.length || 0), 0)
    });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { error: 'Failed to create program' },
      { status: 500 }
    );
  }
}