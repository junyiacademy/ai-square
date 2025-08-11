import { NextRequest, NextResponse } from 'next/server';
import * as pblUserPrograms from '@/app/api/pbl/user-programs/route';

export async function GET(request: NextRequest) {
  // Delegate to existing implementation
  const response = await pblUserPrograms.GET(request);
  try {
    const body = await response.json();
    // Return without X-Cache header for user-specific data
    return NextResponse.json(body, { status: response.status });
  } catch {
    // Fallback: just proxy status without body parsing on error
    return NextResponse.json({ success: false }, { status: response.status });
  }
} 