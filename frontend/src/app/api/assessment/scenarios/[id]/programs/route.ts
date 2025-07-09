import { NextRequest, NextResponse } from 'next/server';
import { 
  getScenarioRepository, 
  getProgramRepository, 
  getTaskRepository 
} from '@/lib/implementations/gcs-v2';
import { getUserFromRequest } from '@/lib/auth/auth-utils';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const programRepo = getProgramRepository();
    const programs = await programRepo.findByScenario(params.id);
    
    // Filter to user's programs
    const userPrograms = programs.filter(p => p.userId === user.email);
    
    // Sort by startedAt (newest first)
    userPrograms.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    
    // Get task counts and scores for each program
    const enrichedPrograms = await Promise.all(
      userPrograms.map(async (program) => {
        const taskRepo = getTaskRepository();
        const tasks = await taskRepo.findByProgram(program.id);
        
        // Calculate progress
        const answeredQuestions = tasks.reduce((sum, task) => {
          const answers = task.interactions.filter(i => i.type === 'assessment_answer');
          return sum + answers.length;
        }, 0);
        
        return {
          ...program,
          metadata: {
            ...program.metadata,
            questionsAnswered: answeredQuestions
          }
        };
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
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
    
    // Get repositories
    const scenarioRepo = getScenarioRepository();
    const programRepo = getProgramRepository();
    const taskRepo = getTaskRepository();
    
    // Get scenario
    const scenario = await scenarioRepo.findById(params.id);
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Create new program
    const program = await programRepo.create({
      scenarioId: params.id,
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