/**
 * Discovery Programs API
 * 管理 Discovery 模式的學習程式
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { v4 as uuidv4 } from 'uuid';
import type { IProgram } from '@/types/unified-learning';

/**
 * POST /api/discovery/programs
 * 創建新的 Discovery 學習程式
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { scenarioId } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const programRepo = repositoryFactory.getProgramRepository();

    // Get user
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate scenario
    const scenario = await scenarioRepo.findById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    if (scenario.mode !== 'discovery') {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario type' },
        { status: 400 }
      );
    }

    // Calculate initial skill gaps (simplified for now)
    const skillGaps = scenario.discoveryData?.requiredSkills?.map(skill => ({
      skill,
      currentLevel: 60, // TODO: Get from user profile
      requiredLevel: 75,
      importance: 'critical' as const,
      suggestedResources: []
    })) || [];

    // Create program
    const program: Omit<IProgram, 'id'> = {
      scenarioId,
      userId: user.id,
      mode: 'discovery',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: scenario.taskTemplates?.length || 0,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {
        explorationPath: [scenario.discoveryData?.careerPath || ''],
        milestones: [],
        personalityMatch: 85, // TODO: Calculate based on user profile
        skillGapAnalysis: skillGaps,
        careerReadiness: 65 // TODO: Calculate based on skills
      },
      assessmentData: {},
      metadata: {
        scenarioTitle: scenario.title,
        careerLevel: scenario.discoveryData?.careerLevel
      }
    };

    const createdProgram = await programRepo.create(program);

    return NextResponse.json({
      success: true,
      data: {
        program: createdProgram
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/discovery/programs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        meta: {
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/discovery/programs
 * 獲取用戶的 Discovery 學習程式列表
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Get repositories
    const userRepo = repositoryFactory.getUserRepository();
    const programRepo = repositoryFactory.getProgramRepository();

    // Get user
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get programs
    let programs = await programRepo.findByUser(user.id);

    // Filter by mode
    programs = programs.filter(p => p.mode === 'discovery');

    // Filter by status if provided
    if (status) {
      programs = programs.filter(p => p.status === status);
    }

    // Add progress metrics
    const programsWithProgress = programs.map(program => {
      const completionRate = program.totalTaskCount > 0 
        ? Math.round((program.completedTaskCount / program.totalTaskCount) * 100)
        : 0;

      return {
        ...program,
        progress: {
          completionRate,
          tasksCompleted: program.completedTaskCount,
          totalTasks: program.totalTaskCount,
          careerReadiness: program.discoveryData?.careerReadiness || 0,
          skillGaps: program.discoveryData?.skillGapAnalysis?.length || 0
        }
      };
    });

    // Sort by most recent first
    programsWithProgress.sort((a, b) => 
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        programs: programsWithProgress,
        total: programsWithProgress.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        filters: {
          status: status || 'all'
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/discovery/programs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        meta: {
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}