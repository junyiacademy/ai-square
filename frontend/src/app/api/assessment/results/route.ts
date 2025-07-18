import { NextRequest, NextResponse } from 'next/server';
import { gcsStorage, AssessmentResultGCS } from '@/lib/storage/gcs-service';
import { getEvaluationRepository, getProgramRepository } from '@/lib/implementations/gcs-v2';
import { cachedGET, getPaginationParams, createPaginatedResponse, parallel } from '@/lib/api/optimization-utils';

// 如果沒有 GCS 設定，使用本地儲存作為後備
const USE_GCS = process.env.GOOGLE_CLOUD_PROJECT && process.env.GCS_BUCKET_NAME;

// 本地儲存後備方案
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'data', 'assessment-results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'results.json');

// 本地儲存函數（後備方案）
async function ensureDir() {
  if (!USE_GCS && !existsSync(RESULTS_DIR)) {
    await mkdir(RESULTS_DIR, { recursive: true });
  }
  if (!USE_GCS && !existsSync(RESULTS_FILE)) {
    await writeFile(RESULTS_FILE, JSON.stringify({ results: [] }, null, 2));
  }
}

async function getAllResultsLocal(userId: string): Promise<AssessmentResultGCS[]> {
  await ensureDir();
  const data = await readFile(RESULTS_FILE, 'utf-8');
  const parsed = JSON.parse(data);
  const results = parsed.results || [];
  return results.filter((r: AssessmentResultGCS) => r.user_id === userId);
}

async function saveResultLocal(result: AssessmentResultGCS): Promise<void> {
  await ensureDir();
  const data = await readFile(RESULTS_FILE, 'utf-8');
  const parsed = JSON.parse(data);
  const results = parsed.results || [];
  results.push(result);
  await writeFile(RESULTS_FILE, JSON.stringify({ results }, null, 2));
}

export async function POST(request: NextRequest) {
  console.log('=== Assessment Save API Called ===');
  console.log('USE_GCS:', USE_GCS);
  console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
  console.log('GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME);
  
  try {
    const body = await request.json();
    console.log('Request body received:', {
      userId: body.userId,
      hasAnswers: !!body.answers,
      hasResult: !!body.result
    });
    
    // 簡單的驗證
    if (!body.userId || !body.answers || !body.result) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 生成唯一 ID
    const assessmentId = `asmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 準備儲存的資料（符合 GCS schema）
    const resultData: AssessmentResultGCS = {
      assessment_id: assessmentId,
      user_id: body.userId,
      user_email: body.userEmail,
      timestamp: new Date().toISOString(),
      duration_seconds: body.result.timeSpentSeconds || 0,
      language: body.language || 'en',
      scores: {
        overall: body.result.overallScore,
        domains: body.result.domainScores,
      },
      summary: {
        total_questions: body.result.totalQuestions,
        correct_answers: body.result.correctAnswers,
        level: body.result.level,
      },
      answers: body.answers.map((answer: { 
        questionId: string; 
        selectedAnswer: string; 
        isCorrect: boolean; 
        timeSpent?: number 
      }) => {
        // Find the question to get KSA mapping
        const question = body.questions?.find((q: any) => q.id === answer.questionId);
        
        return {
          question_id: answer.questionId,
          selected: answer.selectedAnswer,
          correct: answer.isCorrect ? answer.selectedAnswer : 'n/a',
          time_spent: answer.timeSpent || 0,
          ksa_mapping: question?.ksa_mapping || undefined,
        };
      }),
    };

    // 儲存結果
    console.log('Attempting to save with resultData:', {
      assessment_id: resultData.assessment_id,
      user_id: resultData.user_id,
      storage_type: USE_GCS ? 'GCS' : 'Local'
    });
    
    if (USE_GCS) {
      console.log('Using GCS storage...');
      // Use userEmail for GCS path if available, otherwise use userId
      const gcsUserId = body.userEmail || body.userId;
      await gcsStorage.saveAssessmentResult(gcsUserId, resultData);
    } else {
      console.log('Using local storage...');
      await saveResultLocal(resultData);
    }

    return NextResponse.json({
      success: true,
      assessmentId,
      message: 'Assessment result saved successfully',
      storage: USE_GCS ? 'gcs' : 'local',
    });
  } catch (error) {
    console.error('Error saving assessment result:', error);
    return NextResponse.json(
      { error: 'Failed to save assessment result' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const userEmail = searchParams.get('userEmail');
  const paginationParams = getPaginationParams(request);

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  return cachedGET(request, async () => {
    // 獲取使用者的結果
    let userResults: AssessmentResultGCS[] = [];
    
    if (USE_GCS) {
      // Use userEmail for GCS path if available, otherwise use userId
      const gcsUserId = userEmail || userId;
      
      // Parallel fetch of direct results and evaluation results
      const [directResults, evaluationResults] = await parallel(
        gcsStorage.getUserAssessments(gcsUserId),
        userEmail ? (async () => {
          try {
            const evaluationRepo = getEvaluationRepository();
            const programRepo = getProgramRepository();
            
            // Get all programs for the user
            const programs = await programRepo.findByUser(userEmail);
            
            // Filter completed assessment programs
            const assessmentPrograms = programs.filter(p => 
              p.status === 'completed' && 
              p.metadata?.evaluationId
            );
            
            // Get evaluations for completed programs in parallel
            const evaluations = await parallel(
              ...assessmentPrograms.map(async (program) => {
                if (program.metadata?.evaluationId) {
                  const evaluation = await evaluationRepo.findById(program.metadata.evaluationId as string);
                  if (evaluation && evaluation.evaluationType === 'assessment_complete') {
                    // Convert evaluation to assessment result format
                    const assessmentResult: AssessmentResultGCS = {
                      assessment_id: `eval_${evaluation.id}`,
                      user_id: userId,
                      user_email: userEmail,
                      timestamp: evaluation.createdAt,
                      duration_seconds: (evaluation.metadata?.completionTime as number) || 0,
                      language: (program.metadata?.language as string) || 'en',
                      scores: {
                        overall: evaluation.score || 0,
                        domains: {
                          engaging_with_ai: ((evaluation.metadata?.domainScores as any)?.Engaging_with_AI as number) || 0,
                          creating_with_ai: ((evaluation.metadata?.domainScores as any)?.Creating_with_AI as number) || 0,
                          managing_with_ai: ((evaluation.metadata?.domainScores as any)?.Managing_with_AI as number) || 0,
                          designing_with_ai: ((evaluation.metadata?.domainScores as any)?.Designing_with_AI as number) || 0,
                        },
                      },
                      summary: {
                        total_questions: (evaluation.metadata?.totalQuestions as number) || 0,
                        correct_answers: (evaluation.metadata?.correctAnswers as number) || 0,
                        level: (evaluation.metadata?.level as string) || 'beginner',
                      },
                      answers: [] // Answers are stored in task interactions, not in evaluation
                    };
                    
                    return assessmentResult;
                  }
                }
                return null;
              })
            );
            
            return evaluations.filter(Boolean) as AssessmentResultGCS[];
          } catch (error) {
            console.error('Error fetching evaluations:', error);
            return [];
          }
        })() : Promise.resolve([])
      );
      
      userResults.push(...directResults);
      userResults.push(...evaluationResults);
    } else {
      userResults = await getAllResultsLocal(userId);
    }
    
    // Remove duplicates (in case same assessment is stored in both places)
    const uniqueResults = Array.from(
      new Map(userResults.map(r => [r.timestamp, r])).values()
    );
    
    // Sort by timestamp (newest first)
    uniqueResults.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const paginatedResponse = createPaginatedResponse(
      uniqueResults,
      uniqueResults.length,
      paginationParams
    );

    return {
      ...paginatedResponse,
      storage: USE_GCS ? 'gcs' : 'local',
    };
  }, {
    ttl: 300, // 5 minutes cache
    staleWhileRevalidate: 1800 // 30 minutes
  });
}