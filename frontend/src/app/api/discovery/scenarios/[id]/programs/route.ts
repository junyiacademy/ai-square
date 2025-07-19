import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';

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
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId } = await params;
    const userEmail = session.user.email;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Verify scenario exists
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    
    // Create program following unified architecture
    const program = await programRepo.create({
      scenarioId: scenarioId,
      userId: userEmail,
      status: 'active',
      startedAt: new Date().toISOString(),
      taskIds: [],
      currentTaskIndex: 0,
      metadata: {
        sourceType: 'discovery',
        careerType: scenario.sourceRef.metadata?.careerType || 'unknown',
        totalXP: 0,
        achievements: [],
        skillProgress: []
      }
    });
    
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
    
    if (scenario.sourceType === 'pbl') {
      // For PBL scenarios, create tasks from taskTemplates
      if (scenario.taskTemplates && scenario.taskTemplates.length > 0) {
        // Create tasks from PBL taskTemplates
        for (let i = 0; i < scenario.taskTemplates.length; i++) {
          const template = scenario.taskTemplates[i];
          const task = await taskRepo.create({
            programId: program.id,
            scenarioTaskIndex: i,
            title: template.title,
            type: 'chat', // PBL tasks are primarily chat-based
            context: {
              instructions: template.description,
              context: {
                description: template.description,
                instructions: template.instructions || [],
                expectedOutcome: template.expectedOutcome,
                timeLimit: template.timeLimit,
                category: template.category,
                ksaFocus: template.ksaFocus || template.assessmentFocus,
                aiModule: template.aiModule,
                language: language
              }
            },
            interactions: [],
            status: i === 0 ? 'active' : 'pending'
          });
          createdTasks.push(task);
        }
      }
    } else {
      // For Discovery scenarios, load YAML data
      const careerType = scenario.sourceRef.metadata?.careerType;
      let yamlData = null;
      
      if (careerType) {
        const loader = new DiscoveryYAMLLoader();
        yamlData = await loader.loadPath(careerType, language);
      }
      
      if (yamlData?.example_tasks) {
        // Get initial tasks from starting scenario
        const startingTasks = yamlData.starting_scenario?.initial_tasks || [];
        const beginnerTasks = yamlData.example_tasks.beginner || [];
        const intermediateTasks = yamlData.example_tasks.intermediate || [];
        
        // Create tasks based on starting scenario and example tasks
        let taskIndex = 0;
        
        // First, create tasks from starting scenario
        for (const taskTitle of startingTasks.slice(0, 2)) {
          const task = await taskRepo.create({
            programId: program.id,
            scenarioTaskIndex: taskIndex++,
            title: taskTitle,
            type: 'analysis',
            context: {
              instructions: yamlData.starting_scenario?.description || '',
              context: {
                description: yamlData.starting_scenario?.description || '',
                xp: 100,
                difficulty: 'beginner',
                worldSetting: yamlData.world_setting,
                skillFocus: yamlData.metadata.skill_focus
              }
            },
            interactions: [],
            status: taskIndex === 1 ? 'active' : 'pending'
          });
          createdTasks.push(task);
        }
        
        // Then add some beginner and intermediate tasks
        const selectedTasks = [
          ...beginnerTasks.slice(0, 2),
          ...intermediateTasks.slice(0, 1)
        ];
        
        for (const exampleTask of selectedTasks) {
          const task = await taskRepo.create({
            programId: program.id,
            scenarioTaskIndex: taskIndex++,
            title: exampleTask.title,
            type: exampleTask.type as ITask['type'],
            context: {
              instructions: exampleTask.description,
              context: {
                description: exampleTask.description,
                xp: exampleTask.xp_reward,
                skillsImproved: exampleTask.skills_improved,
                difficulty: taskIndex <= 2 ? 'beginner' : 'intermediate',
                worldSetting: yamlData.world_setting
              }
            },
            interactions: [],
            status: 'pending'
          });
          createdTasks.push(task);
        }
      } else {
        // Fallback to default templates if no YAML data
        for (let i = 0; i < DISCOVERY_TASK_TEMPLATES.length; i++) {
          const template = DISCOVERY_TASK_TEMPLATES[i];
          const task = await taskRepo.create({
            programId: program.id,
            scenarioTaskIndex: i,
            title: template.title,
            type: template.type,
            context: {
              instructions: template.context.instructions,
              context: {
                description: template.description,
                xp: template.xp,
                objectives: template.context.objectives,
                completionCriteria: template.context.completionCriteria,
                difficulty: i < 3 ? 'beginner' : i < 7 ? 'intermediate' : 'advanced'
              }
            },
            interactions: [],
            status: i === 0 ? 'active' : 'pending'
          });
          createdTasks.push(task);
        }
      }
    }
    
    // Update program with task IDs and set currentTaskId
    const firstTaskId = createdTasks[0]?.id;
    await programRepo.update(program.id, {
      taskIds: createdTasks.map(t => t.id),
      metadata: {
        ...program.metadata,
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
        description: (t.context as Record<string, unknown>)?.description as string || '',
        xp: (t.context as Record<string, unknown>)?.xp as number || 0,
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
    const programs = await programRepo.findByScenarioAndUser(scenarioId, userEmail);
    
    // For each program, load task details and evaluations
    const programsWithDetails = await Promise.all(
      programs.map(async (program) => {
        // Load tasks for this program
        const tasks = await Promise.all(
          program.taskIds.map(taskId => taskRepo.findById(taskId))
        );
        
        // Filter out any null tasks and get evaluations
        const validTasks = tasks.filter(Boolean) as ITask[];
        const evaluations = validTasks
          .filter(task => task.evaluation?.score !== undefined)
          .map(task => ({
            taskId: task.id,
            score: task.evaluation?.score || 0,
            feedback: task.evaluation?.feedback || '',
            completedAt: task.evaluation?.evaluatedAt || task.updatedAt
          }));
        
        return {
          ...program,
          evaluations,
          taskLogs: validTasks.map(task => ({
            taskId: task.id,
            isCompleted: task.status === 'completed',
            completedAt: task.status === 'completed' ? task.updatedAt : undefined
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