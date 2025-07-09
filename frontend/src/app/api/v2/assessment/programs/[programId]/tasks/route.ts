import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/v2/services/unified-storage.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const unifiedStorage = new UnifiedStorageService();
    
    const tasks = await unifiedStorage.getProgramTasks(params.programId);
    
    return NextResponse.json({
      success: true,
      data: tasks
    });
    
  } catch (error) {
    console.error('Error loading tasks:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load tasks'
    }, { status: 500 });
  }
}