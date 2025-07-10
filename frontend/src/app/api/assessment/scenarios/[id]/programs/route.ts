import { NextRequest, NextResponse } from 'next/server';
import { 
  getScenarioRepository, 
  getProgramRepository, 
  getTaskRepository,
  getEvaluationRepository 
} from '@/lib/implementations/gcs-v2';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';
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
    const user = await getAuthFromRequest(request);
    
    if (!user) {
      // For security: require proper authentication
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userEmail = user.email;
    
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
        p.status === 'completed' && p.score !== undefined
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
        evaluationIds.map(id => evaluationRepo.findById(id).catch(() => null))
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
        score: evaluation?.score || program.score,
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
    
    // Create new program
    const program = await programRepo.create({
      scenarioId: id,
      userId: email,
      metadata: {
        language,
        startTime: Date.now(),
        timeLimit: 900, // 15 minutes default
        userName: authUser?.name || email
      }
    });
    
    // Load questions from YAML
    let questions = [];
    if (scenario.sourceRef.metadata?.configPath) {
      try {
        const baseDir = process.cwd().endsWith('/frontend') ? process.cwd() : path.join(process.cwd(), 'frontend');
        const configPath = path.join(baseDir, 'public', scenario.sourceRef.metadata.configPath);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const yamlData = yaml.load(configContent) as any;
        
        // Get language-specific questions
        questions = yamlData.questions?.map((q: any) => ({
          id: q.id,
          domain: q.domain,
          question: q[`question_${language}`] || q.question,
          options: q[`options_${language}`] || q.options,
          difficulty: q.difficulty,
          correct_answer: q.correct_answer,
          explanation: q[`explanation_${language}`] || q.explanation,
          ksa_mapping: q.ksa_mapping
        })) || [];
      } catch (error) {
        console.error('Error loading questions:', error);
      }
    }
    
    // Create assessment task
    const task = await taskRepo.create({
      programId: program.id,
      scenarioTaskIndex: 0,
      title: 'Assessment Questions',
      type: 'assessment',
      content: {
        questions,
        timeLimit: 900,
        language
      }
    });
    
    // Update program with task ID
    await programRepo.updateTaskIds(program.id, [task.id]);
    
    return NextResponse.json({ 
      program,
      task,
      questionsCount: questions.length
    });
  } catch (error) {
    console.error('Error creating program:', error);
    return NextResponse.json(
      { error: 'Failed to create program' },
      { status: 500 }
    );
  }
}