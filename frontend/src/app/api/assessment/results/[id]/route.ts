import { NextRequest, NextResponse } from 'next/server';
import { gcsStorage } from '@/lib/storage/gcs-service';
import { readFile } from 'fs/promises';
import path from 'path';

// 如果沒有 GCS 設定，使用本地儲存作為後備
const USE_GCS = process.env.GOOGLE_CLOUD_PROJECT && process.env.GCS_BUCKET_NAME;
const RESULTS_FILE = path.join(process.cwd(), 'data', 'assessment-results', 'results.json');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const assessmentId = params.id;
    console.log(`Fetching assessment ${assessmentId} for user ${userId}`);

    if (USE_GCS) {
      // Fetch from GCS
      const result = await gcsStorage.getAssessmentById(userId, assessmentId);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Assessment not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result);
    } else {
      // Fetch from local storage
      const data = await readFile(RESULTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const results = parsed.results || [];
      
      // Find the specific assessment
      const result = results.find((r: any) => 
        r.user_id === userId && r.assessment_id === assessmentId
      );
      
      if (!result) {
        return NextResponse.json(
          { error: 'Assessment not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching assessment result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment result' },
      { status: 500 }
    );
  }
}