/**
 * V2 Source Content API Route
 * Returns available source content for PBL, Discovery, and Assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { demoSourceContent } from '@/lib/v2/demo/demo-data';
import { initializeDemoData } from '@/lib/v2/demo/init-demo';

// GET /api/v2/source-content
export async function GET(request: NextRequest) {
  try {
    // Initialize demo data if needed (in development)
    if (process.env.NODE_ENV === 'development') {
      await initializeDemoData().catch(console.error);
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'pbl' | 'discovery' | 'assessment' | null;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Filter source content
    let items = demoSourceContent;
    
    if (type) {
      items = items.filter(item => item.type === type);
    }
    
    if (!includeInactive) {
      items = items.filter(item => item.is_active);
    }

    return NextResponse.json({
      items,
      count: items.length
    });
  } catch (error) {
    console.error('Error fetching source content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch source content' },
      { status: 500 }
    );
  }
}