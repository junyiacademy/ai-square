/**
 * V2 Scenarios API Route
 * Manages learning scenarios across PBL, Discovery, and Assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { ServiceFactory } from '@/lib/v2/services/service.factory';
import { SourceContentRepository } from '@/lib/v2/repositories/source-content.repository';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';

// GET /api/v2/scenarios - List user's scenarios
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'pbl' | 'discovery' | 'assessment' | null;
    const status = searchParams.get('status');

    // Get storage and repository
    const storage = await StorageFactory.getStorage();
    const scenarioRepository = new ScenarioRepository(storage);
    
    // Get user's scenarios
    const scenarios = await scenarioRepository.findByUser(user.email, {
      type: type || undefined,
      status: status || undefined
    });

    return NextResponse.json({
      scenarios,
      count: scenarios.length
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch scenarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/v2/scenarios - Start new scenario
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceId, sourceCode, language = 'en' } = body;

    if (!sourceId && !sourceCode) {
      return NextResponse.json(
        { error: 'Either sourceId or sourceCode is required' },
        { status: 400 }
      );
    }

    // Get storage and repositories
    const storage = await StorageFactory.getStorage();
    const sourceRepo = new SourceContentRepository(storage);
    
    // Find source content
    let sourceContent;
    if (sourceId) {
      sourceContent = await sourceRepo.findById(sourceId);
    } else {
      sourceContent = await sourceRepo.findByCode(sourceCode);
    }

    if (!sourceContent) {
      return NextResponse.json(
        { error: 'Source content not found' },
        { status: 404 }
      );
    }

    // Get appropriate service
    const service = await ServiceFactory.getService(sourceContent.type, storage);
    
    // Start scenario
    const scenario = await service.startScenario(
      {
        userId: user.email,
        language,
        metadata: body.metadata
      },
      sourceContent
    );

    return NextResponse.json({
      scenario,
      message: 'Scenario started successfully'
    });
  } catch (error) {
    console.error('Error starting scenario:', error);
    return NextResponse.json(
      { error: 'Failed to start scenario' },
      { status: 500 }
    );
  }
}