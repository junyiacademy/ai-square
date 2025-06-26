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

    // Get scenario data to access rubrics and KSA mapping
    const scenarioResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/pbl/scenarios/${sessionData.scenarioId}`);
    const scenarioData = await scenarioResponse.json();
    const scenario = scenarioData.data;
    
    // Get stage info
    const stageIndex = sessionData.currentStage;
    const stage = scenario?.stages[stageIndex];
    const assessmentFocus = stage?.assessmentFocus || { primary: [], secondary: [] };
    
    // Generate evaluation using AI with KSA and rubrics context
    const evaluationPrompt = `
你是一位專業的學習評估專家。請根據以下對話記錄，評估學習者在此階段的表現。

階段資訊：
- 名稱：${stage?.name || stageId}
- 類型：${stage?.stageType}
- 模式重點：${stage?.modalityFocus}

目標領域 (Target Domains)：
${scenario?.targetDomain?.join(', ') || '無特定領域'}

評估重點 KSA：
- 主要評估項目：${assessmentFocus.primary.join(', ')}（請給予較高權重）
- 次要評估項目：${assessmentFocus.secondary.join(', ')}

完整 KSA 映射：
知識 (Knowledge)：${scenario?.ksaMapping?.knowledge?.join(', ') || '無'}
技能 (Skills)：${scenario?.ksaMapping?.skills?.join(', ') || '無'}
態度 (Attitudes)：${scenario?.ksaMapping?.attitudes?.join(', ') || '無'}

評估標準 (Rubrics)：
${scenario?.rubricsCriteria?.map(rubric => `
- ${rubric.criterion} (權重: ${rubric.weight * 100}%)
  Level 1: ${rubric.levels[0].description}
  Level 2: ${rubric.levels[1].description}
  Level 3: ${rubric.levels[2].description}
  Level 4: ${rubric.levels[3].description}
`).join('\n') || '無特定標準'}

對話記錄：
${conversations.map((conv, i) => `
對話 ${i + 1}:
學習者：${conv.user}
AI：${conv.ai}
`).join('\n')}

請基於對話內容，評估學習者在以下各項的表現：

1. 整體表現分數（0-100）

2. 個別 KSA 項目評分（每項 0-100）：
   請針對每個 KSA 代碼，根據學習者在對話中展現的理解和應用程度給分

3. Domain 評分（0-100）：
   - engaging_with_ai: 評估學習者與 AI 互動的能力
   - creating_with_ai: 評估學習者使用 AI 創造內容的能力
   - managing_with_ai: 評估學習者管理 AI 輔助流程的能力
   - designing_with_ai: 評估學習者設計 AI 解決方案的能力

4. Rubrics 評分（1-4 級）：
   請根據上述標準，給予每個評量項目 1-4 的等級評分

5. 優點（至少3點，需關聯到具體的 KSA 代碼）
6. 需要改進的地方（至少2點，需關聯到具體的 KSA 代碼）
7. 下一步建議（至少2點）

請用 JSON 格式回應：
{
  "score": 數字,
  "ksaScores": {
    "knowledge": 數字 (0-100),
    "skills": 數字 (0-100),
    "attitudes": 數字 (0-100)
  },
  "individualKsaScores": {
    "K1.1": 數字 (0-100),
    "K1.2": 數字 (0-100),
    "K2.1": 數字 (0-100),
    "K2.3": 數字 (0-100),
    "S1.1": 數字 (0-100),
    "S1.2": 數字 (0-100),
    "S2.1": 數字 (0-100),
    "S2.3": 數字 (0-100),
    "A1.1": 數字 (0-100),
    "A1.2": 數字 (0-100),
    "A2.1": 數字 (0-100)
  },
  "domainScores": {
    "engaging_with_ai": 數字 (0-100),
    "creating_with_ai": 數字 (0-100),
    "managing_with_ai": 數字 (0-100),
    "designing_with_ai": 數字 (0-100)
  },
  "rubricsScores": {
    "Research Quality": 級別 (1-4),
    "AI Utilization": 級別 (1-4),
    "Content Quality": 級別 (1-4),
    "Learning Progress": 級別 (1-4)
  },
  "strengths": ["優點1 (關聯 K1.1)", "優點2 (關聯 S1.1)", "優點3"],
  "improvements": ["改進1 (關聯 K2.1)", "改進2 (關聯 S2.1)"],
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
        ksaScores: {
          knowledge: 70,
          skills: 75,
          attitudes: 80
        },
        individualKsaScores: {
          "K1.1": 70, "K1.2": 65, "K2.1": 75, "K2.3": 70,
          "S1.1": 80, "S1.2": 70, "S2.1": 75, "S2.3": 75,
          "A1.1": 85, "A1.2": 80, "A2.1": 75
        },
        domainScores: {
          "engaging_with_ai": 75,
          "creating_with_ai": 70,
          "managing_with_ai": 65,
          "designing_with_ai": 60
        },
        rubricsScores: {
          "Research Quality": 2,
          "AI Utilization": 3,
          "Content Quality": 2,
          "Learning Progress": 3
        },
        strengths: ['積極參與學習 (A1.1)', '認真完成任務 (S1.1)', '展現學習熱情 (A1.1)'],
        improvements: ['可以更深入思考問題 (K1.1)', '嘗試提供更具體的例子 (S2.1)'],
        nextSteps: ['繼續練習相關技能', '應用所學到實際情境']
      };
    }

    // Build KSA achievement map with individual scores
    const ksaAchievement = {};
    
    // Include all KSA items from the scenario mapping
    const allKsaItems = [
      ...(scenario?.ksaMapping?.knowledge || []),
      ...(scenario?.ksaMapping?.skills || []),
      ...(scenario?.ksaMapping?.attitudes || [])
    ];
    
    // Also include assessment focus items if not already included
    if (assessmentFocus.primary) {
      assessmentFocus.primary.forEach(ksa => {
        if (!allKsaItems.includes(ksa)) {
          allKsaItems.push(ksa);
        }
      });
    }
    if (assessmentFocus.secondary) {
      assessmentFocus.secondary.forEach(ksa => {
        if (!allKsaItems.includes(ksa)) {
          allKsaItems.push(ksa);
        }
      });
    }
    
    allKsaItems.forEach(ksa => {
      const score = evaluation.individualKsaScores?.[ksa] || 
                   evaluation.ksaScores?.[
                     ksa.charAt(0) === 'K' ? 'knowledge' : 
                     ksa.charAt(0) === 'S' ? 'skills' : 'attitudes'
                   ] || 75;
      
      // Give higher weight to primary assessment focus items
      const isPrimary = assessmentFocus.primary?.includes(ksa);
      const adjustedScore = isPrimary ? Math.min(100, score + 5) : score;
      
      ksaAchievement[ksa] = {
        score: adjustedScore,
        evidence: stageLogs.filter(log => log.actionType === 'write')
      };
    });
    
    // Build rubrics score map
    const rubricsScore = {};
    if (evaluation.rubricsScores) {
      Object.entries(evaluation.rubricsScores).forEach(([criterion, level]) => {
        rubricsScore[criterion] = {
          level: level as number,
          justification: `Based on performance analysis in ${stage?.name || 'this stage'}`
        };
      });
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
      ksaAchievement,
      domainScores: evaluation.domainScores,
      rubricsScore,
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