import { NextRequest, NextResponse } from 'next/server';
import { pblInitializationService } from '@/lib/services/pbl/pbl-initialization-service';

export async function POST(request: NextRequest) {
  try {
    const { force = false, clean = false } = await request.json().catch(() => ({})) as { force?: boolean; clean?: boolean };

    // Use service to initialize PBL scenarios
    const results = await pblInitializationService.initializePBLScenarios({
      force,
      clean
    });

    return NextResponse.json({
      success: true,
      message: 'PBL initialization completed',
      results,
      summary: `Created: ${results.created}, Updated: ${results.updated}, Existing: ${results.existing}, Errors: ${results.errors.length}`
    });

  } catch (error) {
    console.error('PBL init error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize PBL scenarios'
    }, { status: 500 });
  }
}

// GET endpoint to check current status
export async function GET() {
  try {
    const status = await pblInitializationService.getStatus();

    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('PBL status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check PBL status'
    }, { status: 500 });
  }
}
