import { NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { IScenario } from '@/types/unified-learning';

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    // Get discovery scenarios from database
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const scenarios = await scenarioRepo.findByMode?.('discovery') || [];

    // Transform scenarios to paths format
    const paths = scenarios.map((scenario: IScenario) => ({
      id: scenario.id,
      title: typeof scenario.title === 'string'
        ? scenario.title
        : scenario.title?.[lang] || scenario.title?.en || '',
      description: typeof scenario.description === 'string'
        ? scenario.description
        : scenario.description?.[lang] || scenario.description?.en || '',
      careerType: (scenario.discoveryData as Record<string, unknown>)?.careerType || 'general',
      difficulty: scenario.difficulty || 'intermediate',
      estimatedHours: Math.ceil((scenario.estimatedMinutes || 60) / 60),
      prerequisites: scenario.prerequisites || [],
      status: scenario.status || 'active'
    }));

    return NextResponse.json({
      success: true,
      data: {
        paths,
        total: paths.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        language: lang
      }
    });
  } catch (error) {
    console.error('Error fetching discovery paths:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch discovery paths'
      },
      { status: 500 }
    );
  }
}
