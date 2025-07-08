/**
 * V2 Individual Scenario API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/v2/utils/auth';
import { ServiceFactory } from '@/lib/v2/services/service.factory';
import { ScenarioRepository } from '@/lib/v2/repositories/scenario.repository';
import { StorageFactory } from '@/lib/v2/storage/storage.factory';

interface RouteParams {
  params: {
    scenarioId: string;
  };
}

// GET /api/v2/scenarios/[scenarioId] - Get scenario details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storage = await StorageFactory.getStorage();
    const scenarioRepo = new ScenarioRepository(storage);
    
    const scenario = await scenarioRepo.findById(params.scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (scenario.user_id !== user.email) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}

// PATCH /api/v2/scenarios/[scenarioId] - Update scenario
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, metadata } = body;

    const storage = await StorageFactory.getStorage();
    const scenarioRepo = new ScenarioRepository(storage);
    
    const scenario = await scenarioRepo.findById(params.scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (scenario.user_id !== user.email) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update scenario
    const updates: any = {};
    if (status) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }
    if (metadata) {
      updates.metadata = { ...scenario.metadata, ...metadata };
    }

    const updatedScenario = await scenarioRepo.update(params.scenarioId, updates);

    return NextResponse.json({
      scenario: updatedScenario,
      message: 'Scenario updated successfully'
    });
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/scenarios/[scenarioId] - Delete/abandon scenario
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storage = await StorageFactory.getStorage();
    const scenarioRepo = new ScenarioRepository(storage);
    
    const scenario = await scenarioRepo.findById(params.scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (scenario.user_id !== user.email) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark as abandoned instead of deleting
    await scenarioRepo.update(params.scenarioId, {
      status: 'abandoned',
      metadata: {
        ...scenario.metadata,
        abandoned_at: new Date().toISOString()
      }
    });

    return NextResponse.json({
      message: 'Scenario abandoned successfully'
    });
  } catch (error) {
    console.error('Error abandoning scenario:', error);
    return NextResponse.json(
      { error: 'Failed to abandon scenario' },
      { status: 500 }
    );
  }
}