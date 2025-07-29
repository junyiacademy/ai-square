/**
 * Discovery Scenario Detail API
 * GET /api/discovery/scenarios/[id] - 獲取單一 Discovery 場景詳細資訊
 */

import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';
    
    const { id: scenarioId } = await params;
    
    // Get repository
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    
    // Check if scenario exists
    const scenario = await scenarioRepo.findById(scenarioId);
    
    if (!scenario || scenario.mode !== 'discovery') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Scenario not found',
          meta: {
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }
    
    // Process multilingual fields
    const titleObj = scenario.title as Record<string, string>;
    const descObj = scenario.description as Record<string, string>;
    
    const processedScenario = {
      ...scenario,
      title: titleObj?.[language] || titleObj?.en || 'Untitled',
      description: descObj?.[language] || descObj?.en || 'No description',
      // Preserve original multilingual objects
      titleObj,
      descObj,
      // Process discoveryData multilingual fields
      discoveryData: scenario.discoveryData ? {
        ...scenario.discoveryData,
        dayInLife: (() => {
          const dayInLife = (scenario.discoveryData as Record<string, unknown>).dayInLife as Record<string, string> | undefined;
          return dayInLife?.[language] || dayInLife?.en || '';
        })(),
        challenges: (() => {
          const challenges = (scenario.discoveryData as Record<string, unknown>).challenges as Record<string, unknown[]> | undefined;
          return challenges?.[language] || challenges?.en || [];
        })(),
        rewards: (() => {
          const rewards = (scenario.discoveryData as Record<string, unknown>).rewards as Record<string, unknown[]> | undefined;
          return rewards?.[language] || rewards?.en || [];
        })()
      } : {}
    };
    
    // Return scenario data
    return NextResponse.json({
      success: true,
      data: {
        scenario: processedScenario
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        language: language
      }
    });
  } catch (error) {
    console.error('Error in GET /api/discovery/scenarios/[id]:', error);
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