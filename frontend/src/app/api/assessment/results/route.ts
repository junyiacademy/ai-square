import { NextRequest, NextResponse } from 'next/server';
import { gcsStorage, AssessmentResultGCS } from '@/lib/storage/gcs-service';

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
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 獲取使用者的結果
    let userResults: AssessmentResultGCS[];
    
    if (USE_GCS) {
      // Use userEmail for GCS path if available, otherwise use userId
      const gcsUserId = userEmail || userId;
      userResults = await gcsStorage.getUserAssessments(gcsUserId);
    } else {
      userResults = await getAllResultsLocal(userId);
    }
    
    // 結果已經在服務層排序過了

    return NextResponse.json({
      results: userResults,
      total: userResults.length,
      storage: USE_GCS ? 'gcs' : 'local',
    });
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment results' },
      { status: 500 }
    );
  }
}