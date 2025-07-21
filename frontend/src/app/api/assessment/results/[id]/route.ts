import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { readFile } from 'fs/promises';
import path from 'path';
import { cachedGET, memoize } from '@/lib/api/optimization-utils';

// 如果沒有 PostgreSQL 設定，使用本地儲存作為後備
const USE_POSTGRES = process.env.DB_HOST && process.env.DB_NAME;
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

    if (USE_POSTGRES) {
      // Fetch from PostgreSQL
      const userRepo = repositoryFactory.getUserRepository();
      const evaluationRepo = repositoryFactory.getEvaluationRepository();
      
      // Get user by email (userId might be email)
      let user;
      if (userId.includes('@')) {
        user = await userRepo.findByEmail(userId);
      } else {
        user = await userRepo.findById(userId);
      }
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get evaluation by ID
      const evaluation = await evaluationRepo.findById(assessmentId);
      
      if (!evaluation || evaluation.userId !== user.id) {
        throw new Error('Assessment not found');
      }
      
      // Convert to legacy format for compatibility
      return {
        assessment_id: evaluation.id,
        user_id: userId,
        scenario_id: evaluation.metadata?.scenarioId || 'unknown',
        completed_at: evaluation.createdAt,
        score: evaluation.score,
        max_score: evaluation.maxScore,
        feedback: evaluation.feedbackText,
        ksa_scores: evaluation.dimensionScores,
        metadata: evaluation.metadata
      };
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