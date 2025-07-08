/**
 * V2 Scenarios API
 * POST /api/v2/scenarios - Create a new scenario with flexible structure
 * GET /api/v2/scenarios - Get all scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { DiscoveryServiceV2 } from '@/lib/v2/services/discovery-service';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { CreateScenarioOptions } from '@/lib/v2/types';
import { getMockDatabase } from '@/lib/v2/utils/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioData, options } = body as {
      scenarioData: any;
      options?: CreateScenarioOptions;
    };

    // Validate required fields
    if (!scenarioData.title || !scenarioData.code) {
      return NextResponse.json(
        { error: 'Title and code are required' },
        { status: 400 }
      );
    }

    // Get the appropriate service based on structure type
    const db = getMockDatabase();
    let service;
    
    const structureType = options?.structure_type || scenarioData.structure_type || 'standard';
    
    switch (structureType) {
      case 'standard':
        service = new PBLServiceV2(db);
        break;
      case 'single_program':
        service = new DiscoveryServiceV2(db);
        break;
      case 'direct_task':
        service = new AssessmentServiceV2(db);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid structure type' },
          { status: 400 }
        );
    }

    // Create the scenario
    const scenario = await service.createScenario(scenarioData, options);

    return NextResponse.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const structureType = searchParams.get('structure_type');
    
    const db = getMockDatabase();
    const pblService = new PBLServiceV2(db);
    
    let scenarios;
    if (structureType) {
      scenarios = await pblService.getScenariosByStructureType(
        structureType as 'standard' | 'direct_task' | 'single_program'
      );
    } else {
      // Get all scenarios
      const scenarioRepo = pblService['scenarioRepo'];
      scenarios = await scenarioRepo.findAll();
    }

    return NextResponse.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}