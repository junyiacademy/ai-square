import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(request: NextRequest) {
  try {
    // Get authentication
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id || session.user.email;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Get all Discovery programs for this user
    const programs = await programRepo.findByUser(userId);
    const discoveryPrograms = programs.filter(p => p.mode === 'discovery');
    
    // Group programs by scenario
    const scenarioMap = new Map<string, {
      scenario: unknown;
      programs: unknown[];
      activeProgram: unknown | null;
      completedCount: number;
      lastActivity: string | null;
    }>();
    
    // Load unique scenarios
    for (const program of discoveryPrograms) {
      if (!scenarioMap.has(program.scenarioId)) {
        const scenario = await scenarioRepo.findById(program.scenarioId);
        if (scenario) {
          scenarioMap.set(program.scenarioId, {
            scenario,
            programs: [],
            activeProgram: null,
            completedCount: 0,
            lastActivity: null
          });
        }
      }
      
      const entry = scenarioMap.get(program.scenarioId);
      if (entry) {
        entry.programs.push(program);
        
        // Track active program
        if (program.status === 'active' && !entry.activeProgram) {
          entry.activeProgram = program;
        }
        
        // Count completed programs
        if (program.status === 'completed') {
          entry.completedCount++;
        }
        
        // Track last activity
        const programActivity = program.lastActivityAt || program.updatedAt || program.createdAt;
        if (!entry.lastActivity || programActivity > entry.lastActivity) {
          entry.lastActivity = programActivity;
        }
      }
    }
    
    // Convert to array and sort by last activity
    const myScenarios = Array.from(scenarioMap.values())
      .sort((a, b) => {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return b.lastActivity.localeCompare(a.lastActivity);
      })
      .map(entry => {
        const scenario = entry.scenario as Record<string, unknown>;
        const activeProgram = entry.activeProgram as Record<string, unknown> | null;
        
        // Calculate display status and statistics
        let primaryStatus: 'mastered' | 'in-progress' | 'new' = 'new';
        let currentProgress = 0;
        let bestScore = 0;
        let activeCount = 0;
        
        // Count active programs and find best score
        entry.programs.forEach((prog: unknown) => {
          const program = prog as Record<string, unknown>;
          if (program.status === 'active') {
            activeCount++;
          }
          if (program.status === 'completed') {
            const score = program.totalScore as number || 0;
            if (score > bestScore) bestScore = score;
          }
        });
        
        // Determine primary status
        if (entry.completedCount > 0) {
          primaryStatus = 'mastered';
          // For mastered scenarios, show 100% to indicate completion
          currentProgress = 100;
        } else if (activeProgram) {
          primaryStatus = 'in-progress';
          const completed = activeProgram.completedTaskCount as number || 0;
          const total = activeProgram.totalTaskCount as number || 1;
          currentProgress = Math.round((completed / total) * 100);
        }
        
        // DEPRECATED: keeping for backward compatibility
        const progress = currentProgress;
        const displayStatus = primaryStatus === 'mastered' ? 'completed' : primaryStatus === 'in-progress' ? 'active' : 'pending';
        
        // Map career type to display format
        const careerType = scenario.metadata?.careerType as string || 
                          scenario.discoveryData?.careerType as string || 
                          'unknown';
        
        return {
          scenarioId: scenario.id,
          id: careerType,
          title: getLocalizedField(scenario.title, request),
          subtitle: getLocalizedField(scenario.description, request),
          careerType,
          // Primary display info
          primaryStatus,
          currentProgress,
          stats: {
            completedCount: entry.completedCount,
            activeCount,
            totalAttempts: entry.programs.length,
            bestScore
          },
          // Legacy fields for compatibility
          isActive: activeProgram !== null,
          completedCount: entry.completedCount,
          progress,
          displayStatus,
          userPrograms: {
            active: activeProgram ? {
              id: activeProgram.id,
              status: activeProgram.status,
              completedTasks: activeProgram.completedTaskCount || 0,
              totalTasks: activeProgram.totalTaskCount || 0,
              score: activeProgram.totalScore || 0,
              xpEarned: activeProgram.xpEarned || 0
            } : null,
            total: entry.programs.length
          },
          // Map additional display fields
          icon: getCareerIcon(careerType),
          color: getCareerColor(careerType),
          skills: getCareerSkills(careerType),
          category: getCareerCategory(careerType)
        };
      });
    
    return NextResponse.json({ scenarios: myScenarios });
  } catch (error) {
    console.error('Error fetching user Discovery scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

// Helper function to extract localized field
function getLocalizedField(field: unknown, request: NextRequest): string {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    const fieldObj = field as Record<string, string>;
    const acceptLang = request.headers.get('accept-language') || 'en';
    
    // Handle zh-TW -> zhTW mapping
    let lookupLang = acceptLang;
    if (acceptLang === 'zh-TW') lookupLang = 'zhTW';
    if (acceptLang === 'zh-CN') lookupLang = 'zhCN';
    
    return fieldObj[lookupLang] || fieldObj.en || fieldObj.zhTW || Object.values(fieldObj)[0] || '';
  }
  return '';
}

// Career type to icon mapping
function getCareerIcon(careerType: string): unknown {
  const iconMap: Record<string, string> = {
    'ai_engineer': 'CodeBracketIcon',
    'data_analyst': 'ChartBarIcon',
    'ai_designer': 'PaintBrushIcon',
    'ai_educator': 'AcademicCapIcon',
    'ai_ethicist': 'ScaleIcon',
    'ai_researcher': 'BeakerIcon'
  };
  return iconMap[careerType] || 'SparklesIcon';
}

// Career type to color mapping
function getCareerColor(careerType: string): string {
  const colorMap: Record<string, string> = {
    'ai_engineer': 'from-blue-500 to-purple-600',
    'data_analyst': 'from-green-500 to-teal-600',
    'ai_designer': 'from-pink-500 to-rose-600',
    'ai_educator': 'from-yellow-500 to-orange-600',
    'ai_ethicist': 'from-purple-500 to-indigo-600',
    'ai_researcher': 'from-cyan-500 to-blue-600'
  };
  return colorMap[careerType] || 'from-gray-500 to-gray-600';
}

// Career type to skills mapping
function getCareerSkills(careerType: string): string[] {
  const skillsMap: Record<string, string[]> = {
    'ai_engineer': ['程式設計', '系統架構', '模型開發'],
    'data_analyst': ['數據分析', '視覺化', '統計方法'],
    'ai_designer': ['創意設計', '使用者體驗', 'AI 工具'],
    'ai_educator': ['教學設計', '課程開發', 'AI 素養'],
    'ai_ethicist': ['倫理思考', '風險評估', '政策分析'],
    'ai_researcher': ['研究方法', '實驗設計', '論文撰寫']
  };
  return skillsMap[careerType] || ['AI 技能', '批判思考', '創新能力'];
}

// Career type to category mapping
function getCareerCategory(careerType: string): string {
  const categoryMap: Record<string, string> = {
    'ai_engineer': 'tech',
    'data_analyst': 'tech',
    'ai_designer': 'creative',
    'ai_educator': 'education',
    'ai_ethicist': 'social',
    'ai_researcher': 'research'
  };
  return categoryMap[careerType] || 'all';
}