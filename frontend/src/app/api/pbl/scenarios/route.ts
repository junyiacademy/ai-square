import { NextResponse } from 'next/server';
import { pblScenarioService } from '@/lib/services/pbl-scenario.service';
import { cacheService } from '@/lib/cache/cache-service';

// Using the new PBL scenario service for unified data management

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic'; // Force dynamic rendering

export async function GET(request: Request) {
  try {
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    
    // Use cache
    const cacheKey = `pbl:scenarios:${lang}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    // Load scenarios using the new PBL scenario service
    const scenarios = pblScenarioService.getAvailableScenarios(lang);

    // Emoji map for scenarios
    const emojiMap: Record<string, string> = {
      'ai-job-search': '💼',
      'ai-education-design': '🎓', 
      'ai-stablecoin-trading': '₿',
      'ai-robotics-development': '🤖',
      'high-school-climate-change': '🌍',
      'high-school-digital-wellness': '📱',
      'high-school-smart-city': '🏙️',
      'high-school-creative-arts': '🎨',
      'high-school-health-assistant': '💗'
    };

    // Convert to the expected format
    const formattedScenarios = scenarios.map(scenario => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      difficulty: scenario.difficulty,
      estimatedDuration: scenario.estimatedTime || 60,
      targetDomains: scenario.domain ? [scenario.domain] : [],
      targetDomain: scenario.domain ? [scenario.domain] : [],
      domains: scenario.domain ? [scenario.domain] : [],
      taskCount: 0, // This would need to be calculated from the actual scenario data
      isAvailable: true,
      thumbnailEmoji: emojiMap[scenario.id] || '🤖'
    }));

    const result = {
      success: true,
      data: {
        scenarios: formattedScenarios,
        total: formattedScenarios.length,
        available: formattedScenarios.filter(s => s.isAvailable).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    // Store in cache
    await cacheService.set(cacheKey, result, { ttl: 60 * 60 * 1000 }); // 1 hour
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS'
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