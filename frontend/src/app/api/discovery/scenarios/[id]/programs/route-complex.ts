import { NextRequest, NextResponse } from 'next/server';
import type { TaskType } from '@/types/database';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';
// Type converters no longer needed - repositories return correct types

// Task templates for discovery scenarios
const DISCOVERY_TASK_TEMPLATES = [
  {
    title: '認識你的職業角色',
    description: '了解這個職業的核心技能、工作內容和發展前景',
    xp: 100,
    type: 'analysis' as const,
    context: {
      instructions: '研究並分析你選擇的職業角色',
      objectives: [
        '研究這個職業的主要工作內容',
        '了解所需的核心技能和工具',
        '探索職業發展的可能路徑',
        '思考這個職業如何運用 AI 技術'
      ],
      completionCriteria: [
        '描述這個職業的三個核心職責',
        '列出五個必備技能',
        '說明 AI 如何改變這個職業'
      ],
      hints: [
        '想想這個職業在未來 5-10 年會如何演變',
        '考慮 AI 工具如何幫助提升工作效率',
        '思考需要哪些軟技能來補充技術能力'
      ]
    }
  },
  {
    title: '基礎技能訓練',
    description: '學習這個職業所需的基礎知識和工具',
    xp: 150,
    type: 'creation' as const,
    context: {
      instructions: '掌握基礎技能並完成練習',
      objectives: [
        '學習基本概念和術語',
        '熟悉常用工具和平台',
        '完成基礎練習任務'
      ]
    }
  },
  {
    title: '實戰專案：初級挑戰',
    description: '完成你的第一個小型專案，運用所學知識',
    xp: 200,
    type: 'creation' as const,
    context: {
      instructions: '獨立完成一個小型專案',
      objectives: [
        '規劃專案目標和步驟',
        '運用所學知識實作',
        '記錄遇到的問題和解決方案'
      ]
    }
  },
  {
    title: '進階技能學習',
    description: '深入學習更高級的概念和技術',
    xp: 250,
    type: 'analysis' as const,
    context: {
      instructions: '探索進階主題和技術',
      objectives: [
        '研究進階概念',
        '分析實際案例',
        '提出改進建議'
      ]
    }
  },
  {
    title: '團隊協作任務',
    description: '學習如何在團隊中有效溝通和協作',
    xp: 200,
    type: 'chat' as const,
    context: {
      instructions: '模擬團隊協作場景',
      objectives: [
        '練習溝通技巧',
        '學習協作工具',
        '解決團隊衝突'
      ]
    }
  }
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 Starting Discovery Program creation...');
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Session found for user:', session.user.email);

    const { id: scenarioId } = await params;
    const userEmail = session.user.email;
    
    console.log('🎯 Target scenario ID:', scenarioId);
    
    // Get repositories
    console.log('📦 Getting repositories...');
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Verify scenario exists
    console.log('🔍 Finding scenario...');
    const rawScenario = await scenarioRepo.findById(scenarioId);
    if (!rawScenario) {
      console.log('❌ Scenario not found:', scenarioId);
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    const scenario = rawScenario;
    console.log('✅ Scenario found:', scenario.id, scenario.title);
    
    // Create program following unified architecture
    console.log('🎾 Creating program...');
    const rawProgram = await programRepo.create({
      scenarioId: scenarioId,
      userId: userEmail,
      mode: 'discovery',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 0,  // Will be updated after creating tasks
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      metadata: {
        language: 'en'
      }
    });
    
    // Update program with metadata
    const updatedRawProgram = await programRepo.update?.(rawProgram.id, {
      status: 'active',
      metadata: {
        sourceType: 'discovery',
        careerType: scenario?.metadata?.careerType || 'unknown',
        totalXP: 0,
        achievements: [],
        skillProgress: [],
        startedAt: new Date().toISOString()
      }
    });
    
    const program = updatedRawProgram || rawProgram;
    
    // Get language from request body
    let language = 'en';
    try {
      const body = await request.json();
      language = body.language || 'en';
    } catch {
      // If no body is provided, use default language
      console.log('No body provided, using default language:', language);
    }
    
    // Create tasks based on scenario type
    const createdTasks: ITask[] = [];
    
    // Check if scenario is PBL type based on metadata or type
    const isPBLScenario = scenario.mode === 'pbl' || (scenario.metadata as Record<string, unknown>)?.sourceType === 'pbl';
    
    if (isPBLScenario) {
      // For PBL scenarios, create tasks from taskTemplates
      // For PBL scenarios, create tasks from metadata.taskTemplates
      const taskTemplates = ((scenario.metadata as Record<string, unknown>)?.taskTemplates || []) as Array<Record<string, unknown>>;
      if (taskTemplates.length > 0) {
        // Create tasks from PBL taskTemplates
        for (let i = 0; i < taskTemplates.length; i++) {
          const template = taskTemplates[i];
          const rawTask = await taskRepo.create({
            programId: program?.id || rawProgram.id,
            mode: 'discovery',
            taskIndex: i,
            scenarioTaskIndex: i,
            title: template.title as Record<string, string> | undefined,
            description: template.description as Record<string, string> | undefined,
            type: 'chat', // PBL tasks are primarily chat-based
            status: i === 0 ? 'active' : 'pending',
            content: {
              scenarioId: scenario.id,
              instructions: template.instructions || [],
              expectedOutcome: template.expectedOutcome,
              category: template.category,
              ksaFocus: template.ksaFocus || template.assessmentFocus,
              aiModule: template.aiModule
            },
            interactions: [],
            interactionCount: 0,
            userResponse: {},
            score: 0,
            maxScore: 100,
            allowedAttempts: 3,
            attemptCount: 0,
            timeLimitSeconds: template.timeLimit as number || 1800,
            timeSpentSeconds: 0,
            aiConfig: template.aiModule as Record<string, unknown> || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pblData: {},
            discoveryData: {},
            assessmentData: {},
            metadata: {
              language: language
            }
          });
          createdTasks.push(rawTask);
        }
      }
    } else {
      // For Discovery scenarios, load YAML data
      // Check multiple locations for careerType
      const careerType = 
        (scenario.sourceMetadata as Record<string, unknown>)?.careerType as string ||
        (scenario.metadata as Record<string, unknown>)?.yamlId as string ||
        (scenario.metadata as Record<string, unknown>)?.careerType as string ||
        undefined;
      let yamlData = null;
      
      if (careerType) {
        try {
          console.log('📁 Loading YAML for career type:', careerType, 'language:', language);
          const loader = new DiscoveryYAMLLoader();
          yamlData = await loader.loadPath(careerType, language);
          console.log('✅ YAML loaded successfully:', !!yamlData);
        } catch (error) {
          console.warn('⚠️ Could not load YAML data for career type:', careerType, error);
          // Continue with default templates
        }
      } else {
        console.log('⚠️ No careerType found, using fallback templates');
      }
      
      const yamlDataRecord = yamlData as unknown as Record<string, unknown>;
      console.log('📊 YAML data structure:', yamlDataRecord ? Object.keys(yamlDataRecord) : 'null');
      
      // TEMPORARY: Force using fallback templates for debugging
      if (false && yamlDataRecord?.example_tasks) {
        // Get initial tasks from starting scenario
        const startingScenario = yamlDataRecord.starting_scenario as Record<string, unknown> | undefined;
        const exampleTasks = yamlDataRecord.example_tasks as Record<string, unknown>;
        const startingTasks = (startingScenario?.initial_tasks || []) as string[];
        const beginnerTasks = (exampleTasks.beginner || []) as Array<Record<string, unknown>>;
        const intermediateTasks = (exampleTasks.intermediate || []) as Array<Record<string, unknown>>;
        
        // Create tasks based on starting scenario and example tasks
        let taskIndex = 0;
        
        // First, create tasks from starting scenario
        for (const taskTitle of startingTasks.slice(0, 2)) {
          const currentTaskIndex = taskIndex++;
          const rawTask = await taskRepo.create({
            programId: program?.id || rawProgram.id,
            mode: 'discovery',
            taskIndex: currentTaskIndex,
            scenarioTaskIndex: currentTaskIndex,
            title: { en: taskTitle },
            description: { en: (startingScenario?.description || '') as string },
            type: 'analysis',
            status: currentTaskIndex === 0 ? 'active' : 'pending',
            content: {
              scenarioId: scenario.id,
              instructions: (startingScenario?.description || '') as string,
              xp: 100,
              difficulty: 'beginner',
              worldSetting: yamlDataRecord.world_setting,
              skillFocus: (yamlDataRecord.metadata as Record<string, unknown>)?.skill_focus
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
              xp: 100,
              difficulty: 'beginner'
            },
            assessmentData: {},
            metadata: {}
          });
          createdTasks.push(rawTask);
        }
        
        // Then add some beginner and intermediate tasks
        const selectedTasks = [
          ...beginnerTasks.slice(0, 2),
          ...intermediateTasks.slice(0, 1)
        ];
        
        for (const exampleTask of selectedTasks) {
          const currentTaskIndex = taskIndex++;
          const rawTask = await taskRepo.create({
            programId: program?.id || rawProgram.id,
            mode: 'discovery',
            taskIndex: currentTaskIndex,
            scenarioTaskIndex: currentTaskIndex,
            title: { en: exampleTask.title as string },
            description: { en: exampleTask.description as string },
            type: (exampleTask.type as TaskType) || 'analysis',
            status: 'pending',
            content: {
              scenarioId: scenario.id,
              instructions: exampleTask.description as string,
              xp: exampleTask.xp_reward,
              skillsImproved: exampleTask.skills_improved,
              difficulty: currentTaskIndex <= 2 ? 'beginner' : 'intermediate',
              worldSetting: yamlDataRecord.world_setting
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
              xp: exampleTask.xp_reward as number || 100,
              skillsImproved: exampleTask.skills_improved,
              difficulty: currentTaskIndex <= 2 ? 'beginner' : 'intermediate'
            },
            assessmentData: {},
            metadata: {}
          });
          createdTasks.push(rawTask);
        }
      } else {
        // Fallback to default templates if no YAML data
        console.log('🔄 Using fallback DISCOVERY_TASK_TEMPLATES:', DISCOVERY_TASK_TEMPLATES.length, 'templates');
        
        for (let i = 0; i < DISCOVERY_TASK_TEMPLATES.length; i++) {
          const template = DISCOVERY_TASK_TEMPLATES[i];
          const rawTask = await taskRepo.create({
            programId: program?.id || rawProgram.id,
            mode: 'discovery',
            taskIndex: i,
            scenarioTaskIndex: i,
            title: { en: template.title },
            description: { en: template.description },
            type: template.type,
            status: i === 0 ? 'active' : 'pending',
            content: {
              scenarioId: scenario.id,
              instructions: template.context.instructions,
              xp: template.xp,
              objectives: template.context.objectives,
              completionCriteria: template.context.completionCriteria,
              difficulty: i < 3 ? 'beginner' : i < 7 ? 'intermediate' : 'advanced'
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
              xp: template.xp,
              difficulty: i < 3 ? 'beginner' : i < 7 ? 'intermediate' : 'advanced'
            },
            assessmentData: {},
            metadata: {}
          });
          createdTasks.push(rawTask);
        }
      }
    }
    
    // Update program with task IDs and set currentTaskId
    const firstTaskId = createdTasks[0]?.id;
    await programRepo.update?.(program.id, {
      metadata: {
        ...program.metadata,
        taskIds: createdTasks.map(t => t.id),
        currentTaskId: firstTaskId, // Set the first task as current
        currentTaskIndex: 0
      }
    });
    
    // Return program data with tasks info for backward compatibility
    const programWithTasks = {
      ...program,
      taskIds: createdTasks.map(t => t.id),
      tasks: createdTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: ((t.metadata as Record<string, unknown>)?.context as Record<string, unknown>)?.description as string || '',
        xp: ((t.metadata as Record<string, unknown>)?.context as Record<string, unknown>)?.xp as number || 0,
        status: t.status
      })),
      totalTasks: createdTasks.length,
      completedTasks: 0,
      totalXP: 0
    };
    
    return NextResponse.json(programWithTasks);
  } catch (error) {
    console.error('Error in POST /api/discovery/scenarios/[id]/programs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId } = await params;
    const userEmail = session.user.email;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    
    // Find programs for this user and scenario
    // Get all programs for this scenario and filter by user
    const rawPrograms = await programRepo.findByScenario(scenarioId);
    const allPrograms = rawPrograms;
    const programs = allPrograms.filter(p => p.userId === userEmail);
    
    // For each program, load task details and evaluations
    const programsWithDetails = await Promise.all(
      programs.map(async (program) => {
        // Load tasks for this program
        const taskIds = (program.metadata?.taskIds || []) as string[];
        const rawTasks = await Promise.all(
          taskIds.map(taskId => taskRepo.findById(taskId))
        );
        
        // Filter out any null tasks and convert to ITask
        const validTasks = rawTasks
          .filter(Boolean)
          .map(task => task!);
          
        // Get evaluations from task metadata
        const evaluations = validTasks
          .filter(task => task.metadata?.evaluationId !== undefined)
          .map(task => ({
            taskId: task.id,
            score: 0, // Would need to fetch evaluation to get actual score
            feedback: '',
            completedAt: task.completedAt || task.startedAt
          }));
        
        return {
          ...program,
          evaluations,
          taskLogs: validTasks.map(task => ({
            taskId: task.id,
            isCompleted: task.status === 'completed',
            completedAt: task.status === 'completed' ? task.completedAt : undefined
          }))
        };
      })
    );
    
    // Sort by creation date (newest first)
    programsWithDetails.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json(programsWithDetails);
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]/programs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}