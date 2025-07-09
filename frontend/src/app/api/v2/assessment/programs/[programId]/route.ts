import { NextRequest, NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/v2/services/unified-storage.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { programId: string } }
) {
  try {
    const unifiedStorage = new UnifiedStorageService();
    
    const program = await unifiedStorage.getProgram(params.programId);
    
    if (!program) {
      return NextResponse.json({
        success: false,
        error: 'Program not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: program
    });
    
  } catch (error) {
    console.error('Error loading program:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load program'
    }, { status: 500 });
  }
}