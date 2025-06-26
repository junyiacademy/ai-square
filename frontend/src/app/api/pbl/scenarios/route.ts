import { NextResponse } from 'next/server';
import { ScenarioListItem } from '@/types/pbl';

// Mock data for AI Job Search scenario
const mockScenarios: ScenarioListItem[] = [
  {
    id: 'ai-job-search',
    title: 'AI-Assisted Job Search Training',
    description: 'Learn how to use AI tools to optimize your job search process',
    difficulty: 'intermediate',
    estimatedDuration: 90,
    domains: ['engaging_with_ai', 'creating_with_ai'],
    isAvailable: true,
    thumbnailEmoji: '💼'
  },
  {
    id: 'ai-creative-writing',
    title: 'Creative Writing with AI',
    description: 'Master AI-powered creative writing techniques',
    difficulty: 'beginner',
    estimatedDuration: 60,
    domains: ['creating_with_ai'],
    isAvailable: false,
    thumbnailEmoji: '✍️'
  },
  {
    id: 'ai-data-analysis',
    title: 'Data Analysis with AI',
    description: 'Use AI for advanced data analysis and insights',
    difficulty: 'advanced',
    estimatedDuration: 120,
    domains: ['managing_with_ai', 'designing_with_ai'],
    isAvailable: false,
    thumbnailEmoji: '📊'
  }
];

export async function GET(request: Request) {
  try {
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    // For now, return mock data
    // TODO: In future, load from GCS or YAML files
    const scenarios = mockScenarios.map(scenario => {
      // Apply translations based on language
      if (lang === 'zh-TW') {
        return {
          ...scenario,
          title: scenario.id === 'ai-job-search' ? 'AI 輔助求職訓練' : scenario.title,
          description: scenario.id === 'ai-job-search' ? '學習如何使用 AI 工具優化求職流程' : scenario.description
        };
      }
      return scenario;
    });

    return NextResponse.json({
      success: true,
      data: {
        scenarios,
        total: scenarios.length,
        available: scenarios.filter(s => s.isAvailable).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching PBL scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_SCENARIOS_ERROR',
          message: 'Failed to fetch PBL scenarios'
        }
      },
      { status: 500 }
    );
  }
}