import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { googleCloudStorageService } from '@/services/googleCloudStorage';

// Mock task data - in a real implementation, this would be generated based on the scenario
const generateTasksForScenario = (scenarioId: string) => {
  const baseTaskTemplates = [
    {
      title: '認識你的職業角色',
      description: '了解這個職業的核心技能、工作內容和發展前景',
      xp: 100
    },
    {
      title: '基礎技能訓練',
      description: '學習這個職業所需的基礎知識和工具',
      xp: 150
    },
    {
      title: '實戰專案：初級挑戰',
      description: '完成你的第一個小型專案，運用所學知識',
      xp: 200
    },
    {
      title: '進階技能學習',
      description: '深入學習更高級的概念和技術',
      xp: 250
    },
    {
      title: '團隊協作任務',
      description: '學習如何在團隊中有效溝通和協作',
      xp: 200
    },
    {
      title: '創意思維訓練',
      description: '培養創新思維，解決實際問題',
      xp: 300
    },
    {
      title: '專業技能精進',
      description: '掌握行業最新趨勢和先進技術',
      xp: 350
    },
    {
      title: '實戰專案：中級挑戰',
      description: '獨立完成一個完整的專業項目',
      xp: 400
    },
    {
      title: '職業素養提升',
      description: '學習職場禮儀、時間管理和專業態度',
      xp: 250
    },
    {
      title: '終極挑戰：展示你的成果',
      description: '創建作品集，展示你的學習成果和專業能力',
      xp: 500
    }
  ];

  return baseTaskTemplates.map((template, index) => ({
    id: `task_${index + 1}`,
    ...template,
    status: 'locked' as const
  }));
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; programId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: scenarioId, programId } = params;
    const userEmail = session.user.email;
    
    // Load program data from GCS using flat structure
    const programPath = `v2/programs/${programId}.json`;
    
    try {
      const programDataStr = await googleCloudStorageService.readFile(programPath);
      const programData = JSON.parse(programDataStr);
      
      // Verify this program belongs to the current user and scenario
      if (programData.userEmail !== userEmail || programData.scenarioId !== scenarioId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Generate or load tasks
      if (!programData.tasks || programData.tasks.length === 0) {
        // Generate tasks for the first time
        const tasks = generateTasksForScenario(scenarioId);
        
        // Make the first task available
        if (tasks.length > 0) {
          tasks[0].status = 'available';
        }
        
        programData.tasks = tasks;
        programData.totalTasks = tasks.length;
        
        // Save updated program data
        await googleCloudStorageService.saveFile(
          programPath,
          JSON.stringify(programData, null, 2)
        );
      } else {
        // Update task statuses based on completion
        let completedCount = 0;
        programData.tasks.forEach((task: any, index: number) => {
          if (task.completedAt) {
            task.status = 'completed';
            completedCount++;
          } else if (index === completedCount) {
            // The next task after all completed ones is available
            task.status = 'available';
          } else {
            task.status = 'locked';
          }
        });
        
        programData.completedTasks = completedCount;
      }
      
      return NextResponse.json(programData);
    } catch (error) {
      console.error('Error loading program data:', error);
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]/programs/[programId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}