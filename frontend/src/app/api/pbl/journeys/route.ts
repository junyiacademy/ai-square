import { NextRequest, NextResponse } from 'next/server';
import { pblJourneyService } from '@/lib/storage/pbl-journey-service';

/**
 * GET /api/pbl/journeys
 * Get all journeys for a user, optionally filtered by scenario
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    
    // Get user email from cookie
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    const user = JSON.parse(userCookie);
    const userEmail = user.email;
    
    console.log(`Fetching journeys for user: ${userEmail}${scenarioId ? `, scenario: ${scenarioId}` : ''}`);
    
    const journeys = await pblJourneyService.getUserJourneys(userEmail, scenarioId || undefined);
    
    return NextResponse.json({
      success: true,
      data: {
        journeys,
        total: journeys.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error fetching journeys:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_JOURNEYS_ERROR',
          message: 'Failed to fetch journeys'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pbl/journeys
 * Create a new journey
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, language = 'zh-TW' } = body;
    
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'scenarioId is required' },
        { status: 400 }
      );
    }
    
    // Get user info from cookie
    const userCookie = request.cookies.get('user')?.value;
    if (!userCookie) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    const user = JSON.parse(userCookie);
    const { id: userId, email: userEmail } = user;
    
    // Load scenario data
    const scenarioResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pbl/scenarios/${scenarioId}`);
    if (!scenarioResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    const scenarioData = await scenarioResponse.json();
    if (!scenarioData.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to load scenario' },
        { status: 500 }
      );
    }
    
    console.log(`Creating new journey for user: ${userEmail}, scenario: ${scenarioId}`);
    
    const journey = await pblJourneyService.createJourney(
      userEmail,
      userId,
      scenarioData.data,
      language
    );
    
    return NextResponse.json({
      success: true,
      data: journey,
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error creating journey:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_JOURNEY_ERROR',
          message: 'Failed to create journey'
        }
      },
      { status: 500 }
    );
  }
}