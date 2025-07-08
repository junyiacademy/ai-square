/**
 * V2 Scenario by ID API
 * GET /api/v2/scenarios/[id] - Get scenario with full hierarchy
 */

import { NextRequest, NextResponse } from 'next/server';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { getMockDatabase } from '@/lib/v2/utils/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = params.id;
    
    const db = getMockDatabase();
    const service = new PBLServiceV2(db);
    
    const scenario = await service.getScenarioWithHierarchy(scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}