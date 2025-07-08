import { NextRequest, NextResponse } from 'next/server';
import { ErrorReport } from '@/lib/error-tracking/error-tracker';

// In-memory storage for errors (in production, use a database)
const errorStore: ErrorReport[] = [];
const MAX_STORED_ERRORS = 1000;

export async function POST(request: NextRequest) {
  try {
    const errorReport: ErrorReport = await request.json();

    // Validate error report structure
    if (!errorReport.id || !errorReport.message || !errorReport.timestamp) {
      return NextResponse.json(
        { error: 'Invalid error report format' },
        { status: 400 }
      );
    }

    // Store the error
    errorStore.unshift(errorReport);
    
    // Keep only recent errors
    if (errorStore.length > MAX_STORED_ERRORS) {
      errorStore.splice(MAX_STORED_ERRORS);
    }

    // Log critical errors immediately
    if (errorReport.severity === 'critical') {
      console.error('CRITICAL ERROR REPORTED:', {
        id: errorReport.id,
        message: errorReport.message,
        context: errorReport.context,
        timestamp: errorReport.timestamp
      });
    }

    // In production, you might want to:
    // 1. Send to external monitoring service (Sentry, LogRocket, etc.)
    // 2. Store in database
    // 3. Send alerts for critical errors
    // 4. Aggregate and analyze patterns

    return NextResponse.json(
      { 
        success: true, 
        errorId: errorReport.id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Failed to process error report:', error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity');
    const component = searchParams.get('component');

    let filteredErrors = [...errorStore];

    // Filter by severity
    if (severity) {
      filteredErrors = filteredErrors.filter(error => error.severity === severity);
    }

    // Filter by component
    if (component) {
      filteredErrors = filteredErrors.filter(error => 
        error.context.component === component
      );
    }

    // Limit results
    const limitedErrors = filteredErrors.slice(0, limit);

    // Calculate metrics
    const metrics = {
      totalErrors: errorStore.length,
      filteredCount: filteredErrors.length,
      errorsBySeverity: errorStore.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errorsByComponent: errorStore.reduce((acc, error) => {
        const component = error.context.component || 'Unknown';
        acc[component] = (acc[component] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentErrors: errorStore.slice(0, 10)
    };

    return NextResponse.json({
      success: true,
      data: {
        errors: limitedErrors,
        metrics
      }
    });

  } catch (error) {
    console.error('Failed to fetch error reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error reports' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('errorId');

    if (errorId) {
      // Delete specific error
      const index = errorStore.findIndex(error => error.id === errorId);
      if (index > -1) {
        errorStore.splice(index, 1);
        return NextResponse.json({ success: true, message: 'Error deleted' });
      } else {
        return NextResponse.json(
          { error: 'Error not found' },
          { status: 404 }
        );
      }
    } else {
      // Clear all errors
      errorStore.length = 0;
      return NextResponse.json({ success: true, message: 'All errors cleared' });
    }

  } catch (error) {
    console.error('Failed to delete error reports:', error);
    return NextResponse.json(
      { error: 'Failed to delete error reports' },
      { status: 500 }
    );
  }
}