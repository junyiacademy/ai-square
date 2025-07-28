import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// GET handler to fetch user's programs for a scenario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId } = await params;
    const userId = session.user.id;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Verify scenario exists
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    
    // Get all programs for this user and scenario
    const allPrograms = await programRepo.findByUser(userId);
    const scenarioPrograms = allPrograms.filter(p => p.scenarioId === scenarioId);
    
    // Get tasks for each program to calculate progress
    const taskRepo = repositoryFactory.getTaskRepository();
    const programsWithProgress = await Promise.all(
      scenarioPrograms.map(async (program) => {
        const tasks = await taskRepo.findByProgram(program.id);
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const totalXP = tasks.reduce((sum, task) => {
          const xp = (task.metadata?.xpEarned as number) || 0;
          return sum + xp;
        }, 0);
        
        return {
          ...program,
          metadata: {
            ...program.metadata,
            totalTasks: tasks.length,
            completedTasks: completedTasks,
            totalXP: totalXP
          }
        };
      })
    );
    
    // Sort by creation date, newest first
    programsWithProgress.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    return NextResponse.json({
      programs: programsWithProgress,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description
      }
    });
  } catch (error) {
    console.error('Error fetching Discovery programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}

// Simplified POST handler for testing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 Starting simplified Discovery Program creation...');
    
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Session found for user:', session.user.email);

    const { id: scenarioId } = await params;
    const userEmail = session.user.email;
    const userId = session.user.id.toString(); // Ensure it's a string
    
    console.log('🎯 Target scenario ID:', scenarioId);
    console.log('👤 User ID:', userId, 'Email:', userEmail);
    
    // Get repositories
    console.log('📦 Getting repositories...');
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Verify scenario exists
    console.log('🔍 Finding scenario...');
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      console.log('❌ Scenario not found:', scenarioId);
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    console.log('✅ Scenario found:', scenario.id, scenario.title);
    
    // Get task templates from scenario
    const taskTemplates = scenario.taskTemplates || [];
    console.log(`📋 Found ${taskTemplates.length} task templates in scenario`);
    
    // Get language from request
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    // Create minimal program
    console.log('🏆 Creating minimal program...');
    const program = await programRepo.create({
      scenarioId: scenarioId,
      userId: userId, // Use ID instead of email
      mode: 'discovery',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: taskTemplates.length || 1,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {
        careerType: scenario.sourceMetadata?.careerType || scenario.sourceId || 'unknown'
      },
      assessmentData: {},
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      metadata: {
        language: lang,
        careerType: scenario.sourceMetadata?.careerType || scenario.sourceId || 'unknown'
      }
    });
    
    console.log('✅ Program created:', program.id);
    
    // Create tasks from templates or create a simple task if no templates
    console.log('📝 Creating tasks...');
    const createdTasks = [];
    const taskIds = [];
    
    if (taskTemplates.length > 0) {
      // Create tasks from templates
      for (let i = 0; i < taskTemplates.length; i++) {
        const template = taskTemplates[i] as Record<string, unknown>;
        console.log(`  Creating task ${i + 1}/${taskTemplates.length}: ${template.id}`);
        
        const task = await taskRepo.create({
          programId: program.id,
          mode: 'discovery',
          taskIndex: i,
          scenarioTaskIndex: i,
          title: template.title as Record<string, string>,
          description: template.description as Record<string, string>,
          type: (template.type as string) || 'creation',
          status: i === 0 ? 'active' : 'pending',
          content: {
            scenarioId: scenario.id,
            instructions: template.instructions as Record<string, string>,
            difficulty: template.difficulty as string,
            xp: (template.context as Record<string, unknown>)?.xpReward as number || 100,
            taskId: template.id as string,
            skillsImproved: (template.context as Record<string, unknown>)?.skillsImproved as string[] || [],
            description: template.description as Record<string, string>
          },
          interactions: [],
          interactionCount: 0,
          userResponse: {},
          score: 0,
          maxScore: 100,
          allowedAttempts: 3,
          attemptCount: 0,
          timeSpentSeconds: 0,
          aiConfig: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pblData: {},
          discoveryData: { 
            xp: (template.context as Record<string, unknown>)?.xpReward as number || 100,
            skillsImproved: (template.context as Record<string, unknown>)?.skillsImproved as string[] || []
          },
          assessmentData: {},
          metadata: { 
            language: lang,
            templateId: template.id as string
          }
        });
        
        createdTasks.push(task);
        taskIds.push(task.id);
        console.log(`  ✅ Created task: ${task.id}`);
      }
    } else {
      // Fallback: create a simple task if no templates
      console.log('  No templates found, creating simple task...');
      const task = await taskRepo.create({
        programId: program.id,
        mode: 'discovery',
        taskIndex: 0,
        scenarioTaskIndex: 0,
        title: { en: 'Career Exploration', zh: '職業探索' },
        description: { en: 'Explore your chosen career path', zh: '探索你選擇的職業道路' },
        type: 'chat',
        status: 'active',
        content: {
          scenarioId: scenario.id,
          instructions: { en: 'Learn about this career through AI conversation', zh: '通過 AI 對話了解這個職業' },
          xp: 100
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: { xp: 100 },
        assessmentData: {},
        metadata: { language: lang }
      });
      
      createdTasks.push(task);
      taskIds.push(task.id);
      console.log('  ✅ Created simple task:', task.id);
    }
    
    // Update program with task IDs
    try {
      if (programRepo.update && taskIds.length > 0) {
        await programRepo.update(program.id, {
          metadata: {
            ...program.metadata,
            currentTaskId: taskIds[0],
            taskIds: taskIds
          }
        });
      }
    } catch (updateError) {
      console.warn('⚠️ Could not update program metadata:', updateError);
      // Continue anyway - program and tasks are created
    }
    
    // Return simplified response
    const response = {
      id: program.id,
      scenarioId: program.scenarioId,
      status: program.status,
      currentTaskId: taskIds[0],
      tasks: createdTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        type: task.type,
        xp: (task.content as Record<string, unknown>)?.xp as number || 100
      })),
      totalTasks: createdTasks.length,
      completedTasks: 0,
      totalXP: 0
    };
    
    console.log('🎉 Success! Returning program data');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 Error in simplified POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}