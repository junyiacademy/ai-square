import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';
import { SessionData, StageResult } from '@/types/pbl';
import { vertexAIService } from '@/lib/ai/vertex-ai-service';

// Evaluate a completed stage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, stageId } = body;

    if (!sessionId || !stageId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId and stageId are required'
          }
        },
        { status: 400 }
      );
    }

    // Get session data
    const result = await pblGCS.getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        },
        { status: 404 }
      );
    }

    const { sessionData } = result;
    
    // Get stage process logs
    const stageLogs = sessionData.processLogs.filter(log => log.stageId === stageId);
    
    // Get conversation history for this stage
    const conversations = stageLogs
      .filter(log => log.actionType === 'write' && log.detail?.aiInteraction)
      .map(log => ({
        user: log.detail.userInput,
        ai: log.detail.aiInteraction?.response
      }));

    // Generate evaluation using AI
    const evaluationPrompt = `
你是一位專業的學習評估專家。請根據以下對話記錄，評估學習者在此階段的表現。

階段名稱：${stageId}
對話記錄：
${conversations.map((conv, i) => `
對話 ${i + 1}:
學習者：${conv.user}
AI：${conv.ai}
`).join('\n')}

請提供以下評估：
1. 整體表現分數（0-100）
2. 優點（至少3點）
3. 需要改進的地方（至少2點）
4. 下一步建議（至少2點）

請用 JSON 格式回應：
{
  "score": 數字,
  "strengths": ["優點1", "優點2", "優點3"],
  "improvements": ["改進1", "改進2"],
  "nextSteps": ["建議1", "建議2"]
}
`;

    const aiResponse = await vertexAIService.generateContent({
      model: 'gemini-2.0-flash-exp',
      messages: [{
        role: 'user',
        content: evaluationPrompt
      }],
      temperature: 0.3,
      maxOutputTokens: 1024
    });

    let evaluation;
    try {
      // Parse AI response
      const responseText = aiResponse.candidates[0].content.parts[0].text;
      evaluation = JSON.parse(responseText);
    } catch (error) {
      // Fallback evaluation if parsing fails
      evaluation = {
        score: 75,
        strengths: ['積極參與學習', '認真完成任務', '展現學習熱情'],
        improvements: ['可以更深入思考問題', '嘗試提供更具體的例子'],
        nextSteps: ['繼續練習相關技能', '應用所學到實際情境']
      };
    }

    // Create stage result
    const stageResult: StageResult = {
      stageId,
      status: 'completed',
      completed: true,
      startedAt: new Date(stageLogs[0]?.timestamp || new Date()),
      completedAt: new Date(),
      score: evaluation.score,
      performanceMetrics: {
        completionTime: stageLogs.reduce((acc, log) => acc + (log.detail?.timeSpent || 0), 0),
        interactionCount: conversations.length,
        revisionCount: 0,
        resourceUsage: 0
      },
      ksaAchievement: {},
      rubricsScore: {},
      feedback: {
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        nextSteps: evaluation.nextSteps
      }
    };

    // Update session with stage result
    const updatedStageResults = [...sessionData.stageResults];
    const existingIndex = updatedStageResults.findIndex(r => r.stageId === stageId);
    
    if (existingIndex >= 0) {
      updatedStageResults[existingIndex] = stageResult;
    } else {
      updatedStageResults.push(stageResult);
    }

    await pblGCS.updateSession(sessionId, {
      stageResults: updatedStageResults
    });

    return NextResponse.json({
      success: true,
      data: {
        stageResult,
        evaluation
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error evaluating stage:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EVALUATION_ERROR',
          message: 'Failed to evaluate stage'
        }
      },
      { status: 500 }
    );
  }
}

// Get evaluation for a specific stage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const stageId = searchParams.get('stageId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required'
          }
        },
        { status: 400 }
      );
    }

    // Get session data
    const result = await pblGCS.getSession(sessionId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found'
          }
        },
        { status: 404 }
      );
    }

    const { sessionData } = result;
    
    // Filter by stageId if provided
    const stageResults = stageId 
      ? sessionData.stageResults.filter(r => r.stageId === stageId)
      : sessionData.stageResults;

    return NextResponse.json({
      success: true,
      data: {
        stageResults,
        totalStages: sessionData.scenario?.stages.length || 0,
        completedStages: sessionData.stageResults.filter(r => r.completed).length
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_EVALUATION_ERROR',
          message: 'Failed to fetch evaluations'
        }
      },
      { status: 500 }
    );
  }
}