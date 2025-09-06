import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(request: NextRequest) {
  try {
    // Get authentication
    const session = await getUnifiedAuth(request);
    
    if (!session?.user.email) {
      return createUnauthorizedResponse();
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
        const careerType = (scenario.metadata as Record<string, unknown>)?.careerType as string || 
                          (scenario.discoveryData as Record<string, unknown>)?.careerType as string || 
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
          // Pass through all scenario metadata
          metadata: scenario.metadata,
          discoveryData: scenario.discoveryData,
          icon: 'SparklesIcon', // Frontend will map based on careerType
          color: 'from-gray-500 to-gray-600', // Frontend will map based on careerType
          skills: (scenario.metadata as Record<string, unknown>)?.skillFocus as string[] || [],
          category: (scenario.metadata as Record<string, unknown>)?.category as string || 'general',
          lastActivity: entry.lastActivity
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
    
    // Get language from query params first, then accept-language header
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || request.headers.get('accept-language') || 'en';
    
    // Handle zh-TW -> zhTW mapping
    let lookupLang = lang;
    if (lang === 'zh-TW' || lang === 'zhTW') lookupLang = 'zhTW';
    if (lang === 'zh-CN' || lang === 'zhCN') lookupLang = 'zhCN';
    
    return fieldObj[lookupLang] || fieldObj.en || fieldObj.zhTW || Object.values(fieldObj)[0] || '';
  }
  return '';
}

