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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Try to get user from authentication
    const user = await getAuthFromRequest(request);
    
    // If no auth, check if user info is in localStorage/query params (for viewing history)
    let userEmail: string | null = null;
    
    if (user) {
      userEmail = user.email;
    } else {
      // Check for user info from query params (used by history view)
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get('userEmail');
      const userIdParam = searchParams.get('userId');
      
      // For now, allow unauthenticated access if email is provided
      // In production, you might want to add additional security checks
      if (emailParam) {
        userEmail = emailParam;
      } else {
        // If no user info at all, return 401
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    // Await params before using
    const { id } = await params;
    
    const programRepo = getProgramRepository();
    
    // Debug: Log the scenario ID we're looking for
    console.log(`Looking for programs with scenarioId: ${id}`);
    
    const programs = await programRepo.findByScenario(id);
    
    // Debug: Log all programs found
    console.log(`Found ${programs.length} programs for scenario ${id}`);
    
    // Also check if there are any programs for the user at all
    const allUserPrograms = await programRepo.findByUser(userEmail);
    console.log(`User ${userEmail} has ${allUserPrograms.length} total programs`);
    if (allUserPrograms.length > 0) {
      console.log('User program scenario IDs:', allUserPrograms.map(p => ({ 
        id: p.id, 
        scenarioId: p.scenarioId,
        status: p.status,
        score: p.score
      })));
    }
    
    // Filter to user's programs - also check for programs that might be associated differently
    let userPrograms = programs.filter(p => p.userId === userEmail);
    
    // If no programs found with exact scenario ID match, check if this is an assessment scenario
    // and look for programs with related assessment scenario IDs
    if (userPrograms.length === 0 && allUserPrograms.length > 0) {
      console.log(`No direct matches found. Checking for assessment programs...`);
      
      // Get the scenario to check its source type
      const scenarioRepo = getScenarioRepository();
      const scenario = await scenarioRepo.findById(id);
      
      if (scenario && scenario.sourceType === 'assessment') {
        console.log(`This is an assessment scenario. Looking for programs with matching source...`);
        // Find all assessment programs for this user
        const assessmentPrograms = allUserPrograms.filter(p => {
          // Check if program's scenario is also an assessment type
          return p.status === 'completed' && p.score !== undefined;
        });
        
        if (assessmentPrograms.length > 0) {
          console.log(`Found ${assessmentPrograms.length} completed assessment programs for user`);
          // For now, include all completed assessment programs
          // In the future, we might want to match by assessment type or source
          userPrograms = assessmentPrograms;
        }
      }
    }
    
    // Sort by startedAt (newest first)
    userPrograms.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    
    // Get task counts and scores for each program
    const evaluationRepo = getEvaluationRepository();
    const enrichedPrograms = await Promise.all(
      userPrograms.map(async (program) => {
        const taskRepo = getTaskRepository();
        const tasks = await taskRepo.findByProgram(program.id);
        
        // Calculate progress
        const answeredQuestions = tasks.reduce((sum, task) => {
          const answers = task.interactions.filter(i => i.type === 'assessment_answer');
          return sum + answers.length;
        }, 0);
        
        // Get evaluation if program is completed
        let evaluation = null;
        if (program.status === 'completed' && program.metadata?.evaluationId) {
          try {
            evaluation = await evaluationRepo.findById(program.metadata.evaluationId);
          } catch (error) {
            console.error('Error fetching evaluation:', error);
          }
        }
        
        // Extract score and other data from evaluation
        const enrichedProgram = {
          ...program,
          score: evaluation?.score || program.score,
          metadata: {
            ...program.metadata,
            questionsAnswered: answeredQuestions,
            totalQuestions: evaluation?.metadata?.totalQuestions,
            correctAnswers: evaluation?.metadata?.correctAnswers,
            timeSpent: evaluation?.metadata?.completionTime,
            level: evaluation?.metadata?.level,
            domainScores: evaluation?.metadata?.domainScores,
            completedAt: program.completedAt || evaluation?.createdAt
          }
        };
        
        return enrichedProgram;
      })
    );
    
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
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { action, language = 'en' } = body;
    
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
      userId: user.email,
      metadata: {
        language,
        startTime: Date.now(),
        timeLimit: 900, // 15 minutes default
        userName: user.name || user.email
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