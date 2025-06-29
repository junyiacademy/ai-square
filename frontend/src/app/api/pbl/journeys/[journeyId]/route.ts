import { NextRequest, NextResponse } from 'next/server';
import { pblJourneyService } from '@/lib/storage/pbl-journey-service';

/**
 * GET /api/pbl/journeys/[journeyId]
 * Get specific journey by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { journeyId: string } }
) {
  try {
    const { journeyId } = params;
    
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
    
    console.log(`Fetching journey: ${journeyId} for user: ${userEmail}`);
    
    const journey = await pblJourneyService.getJourney(userEmail, journeyId);
    
    if (!journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: journey,
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error fetching journey:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_JOURNEY_ERROR',
          message: 'Failed to fetch journey'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pbl/journeys/[journeyId]
 * Delete entire journey
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { journeyId: string } }
) {
  try {
    const { journeyId } = params;
    
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
    
    console.log(`Deleting journey: ${journeyId} for user: ${userEmail}`);
    
    await pblJourneyService.deleteJourney(userEmail, journeyId);
    
    return NextResponse.json({
      success: true,
      message: 'Journey deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
    
  } catch (error) {
    console.error('Error deleting journey:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_JOURNEY_ERROR',
          message: 'Failed to delete journey'
        }
      },
      { status: 500 }
    );
  }
}