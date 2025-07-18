import { NextRequest, NextResponse } from 'next/server';
import { gcsStorage } from '@/lib/storage/gcs-service';
import { readFile } from 'fs/promises';
import path from 'path';
import { cachedGET, memoize } from '@/lib/api/optimization-utils';

// 如果沒有 GCS 設定，使用本地儲存作為後備
const USE_GCS = process.env.GOOGLE_CLOUD_PROJECT && process.env.GCS_BUCKET_NAME;
const RESULTS_FILE = path.join(process.cwd(), 'data', 'assessment-results', 'results.json');

// Memoized local file reader
const readLocalResults = memoize(async () => {
  const data = await readFile(RESULTS_FILE, 'utf-8');
  const parsed = JSON.parse(data);
  return parsed.results || [];
}, 5 * 60 * 1000); // 5 minutes cache

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  const { id: assessmentId } = await params;

  return cachedGET(request, async () => {
    console.log(`Fetching assessment ${assessmentId} for user ${userId}`);

    if (USE_GCS) {
      // Fetch from GCS
      const result = await gcsStorage.getAssessmentById(userId, assessmentId);
      
      if (!result) {
        throw new Error('Assessment not found');
      }
      
      return result;
    } else {
      // Fetch from local storage with memoization
      const results = await readLocalResults();
      
      // Find the specific assessment
      const result = results.find((r: { user_id: string; assessment_id: string }) => 
        r.user_id === userId && r.assessment_id === assessmentId
      );
      
      if (!result) {
        throw new Error('Assessment not found');
      }
      
      return result;
    }
  }, {
    ttl: 300, // 5 minutes cache
    staleWhileRevalidate: 1800 // 30 minutes
  });
}