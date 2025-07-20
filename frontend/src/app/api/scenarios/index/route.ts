import { NextRequest, NextResponse } from 'next/server';
import { scenarioIndexService } from '@/lib/services/scenario-index-service';
import { scenarioIndexBuilder } from '@/lib/services/scenario-index-builder';

/**
 * GET /api/scenarios/index
 * Returns the current scenario index for debugging
 */
export async function GET(request: NextRequest) {
  try {
    // Check for rebuild query parameter
    const { searchParams } = new URL(request.url);
    const rebuild = searchParams.get('rebuild') === 'true';

    if (rebuild) {
      // Rebuild the entire index
      await scenarioIndexBuilder.buildFullIndex();
    } else {
      // Ensure index exists
      await scenarioIndexBuilder.ensureIndex();
    }

    // Get the current index
    const index = await scenarioIndexService.getIndex();
    if (!index) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Index not available',
          status: scenarioIndexBuilder.getStatus()
        },
        { status: 503 }
      );
    }

    // Convert Maps to objects for JSON serialization
    const yamlToUuidObject: Record<string, ScenarioIndexEntry> = {};
    const uuidToYamlObject: Record<string, ScenarioIndexEntry> = {};

    for (const [key, value] of index.yamlToUuid) {
      yamlToUuidObject[key] = value;
    }

    for (const [key, value] of index.uuidToYaml) {
      uuidToYamlObject[key] = value;
    }

    return NextResponse.json({
      success: true,
      data: {
        lastUpdated: index.lastUpdated,
        totalMappings: index.yamlToUuid.size,
        yamlToUuid: yamlToUuidObject,
        uuidToYaml: uuidToYamlObject,
        status: scenarioIndexBuilder.getStatus()
      }
    });
  } catch (error) {
    console.error('Error getting scenario index:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get scenario index',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scenarios/index
 * Invalidates the scenario index cache
 */
export async function DELETE() {
  try {
    await scenarioIndexService.invalidate();
    
    return NextResponse.json({
      success: true,
      message: 'Scenario index cache invalidated'
    });
  } catch (error) {
    console.error('Error invalidating scenario index:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to invalidate scenario index',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}