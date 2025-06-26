import { NextRequest, NextResponse } from 'next/server';
import { pblGCS } from '@/lib/storage/pbl-gcs-service';
import { SessionData, StageResult } from '@/types/pbl';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { readFile } from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

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
    
    // Get conversation history for this stage with user inputs from process logs
    const conversations = stageLogs
      .filter(log => log.detail?.aiInteraction)
      .map(log => ({
        user: log.detail.aiInteraction?.prompt || log.detail.userInput || '',
        ai: log.detail.aiInteraction?.response || ''
      }))
      .filter(conv => conv.user || conv.ai); // Filter out empty conversations

    // Get scenario data by reading the YAML file directly
    console.log('Loading scenario:', sessionData.scenarioId);
    
    // Map scenario ID to filename
    const scenarioFiles = {
      'ai-job-search': 'ai_job_search_scenario.yaml'
    };
    
    const filename = scenarioFiles[sessionData.scenarioId];
    if (!filename) {
      throw new Error(`Unknown scenario ID: ${sessionData.scenarioId}`);
    }
    
    const filePath = path.join(process.cwd(), 'public', 'pbl_data', filename);
    const fileContent = await readFile(filePath, 'utf-8');
    const yamlData = yaml.parse(fileContent);
    
    const scenario = {
      ...yamlData.scenario_info,
      stages: yamlData.stages,
      ksaMapping: yamlData.ksa_mapping,
      rubricsCriteria: yamlData.rubrics_criteria,
      targetDomain: yamlData.scenario_info.target_domains
    };
    console.log('Scenario loaded successfully');
    
    // Get stage info by ID instead of index
    const stage = scenario?.stages.find(s => s.id === stageId);
    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }
    const assessmentFocus = stage.assessmentFocus || { primary: [], secondary: [] };
    
    // Log what we're evaluating for debugging
    console.log('Evaluating user inputs:', conversations.map(c => c.user));
    console.log('Total user input length:', conversations.reduce((sum, c) => sum + (c.user || '').length, 0));
    
    // Generate evaluation using AI with KSA and rubrics context
    const evaluationPrompt = `
你是一位專業的學習評估專家。請根據以下對話記錄，**嚴格且客觀地**評估學習者在此階段的表現。

重要評估原則：
1. **只評估學習者實際說了什麼**，不要評估AI助手的回應
2. 如果學習者只是打招呼（如"hi"、"hello"）或給出極短回應，應該給予**極低分數**（0-20分）
3. 學習者必須**實際嘗試解決任務**才能獲得及格分數
4. 評分應基於學習者展現的**努力程度、理解深度、和任務完成度**

階段資訊：
- 名稱：${stage?.name || stageId}
- 類型：${stage?.stageType}
- 模式重點：${stage?.modalityFocus}
- 任務指示：${stage?.tasks?.[0]?.instructions?.join('; ') || '無'}
- 預期成果：${stage?.tasks?.[0]?.expectedOutcome || '無'}

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

對話記錄（請特別注意學習者實際輸入的內容）：
${conversations.map((conv, i) => `
對話 ${i + 1}:
【學習者輸入】：${conv.user || '(無輸入)'}
【AI回應】：${conv.ai ? conv.ai.substring(0, 200) + '...' : '(無回應)'}
`).join('\n')}

學習者總共輸入次數：${conversations.filter(c => c.user).length}
學習者實際內容字數：${conversations.reduce((sum, c) => sum + (c.user || '').length, 0)}

請基於對話內容，評估學習者在以下各項的表現：

**評分準則**：
- 如果學習者只是簡單打招呼或極短回應，所有分數應在 0-20 分範圍
- 如果學習者有嘗試但未完成任務，分數應在 20-50 分範圍
- 如果學習者有認真嘗試並部分完成任務，分數應在 50-70 分範圍
- 只有當學習者充分展現理解並完成任務時，才給予 70 分以上

1. 整體表現分數（0-100）：基於學習者的實際努力和任務完成度

2. 個別 KSA 項目評分（每項 0-100）：
   如果學習者未展現相關能力，該項應給 0-10 分

3. Domain 評分（0-100）：
   - engaging_with_ai: 學習者是否真的在與 AI 互動解決問題？
   - creating_with_ai: 學習者是否嘗試創造內容？
   - managing_with_ai: 學習者是否展現管理能力？
   - designing_with_ai: 學習者是否有設計思維？

4. Rubrics 評分（1-4 級）：
   Level 1: 未達標準（如只打招呼）
   Level 2: 初步嘗試
   Level 3: 部分達成
   Level 4: 完全達成

5. 優點（如果表現不佳，可以說"願意開始對話"等基本優點）
6. 需要改進的地方（明確指出未完成的任務）
7. 下一步建議（具體的行動建議）

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

    // Create a VertexAIService instance for evaluation
    const evaluationService = new VertexAIService({
      model: 'gemini-2.0-flash-exp',
      systemPrompt: '你是一位嚴格但公正的學習評估專家。請根據學習者的實際表現給予客觀評分。如果學習者只是打招呼或未嘗試解決任務，必須給予低分。',
      temperature: 0.1, // Lower temperature for more consistent evaluation
      maxOutputTokens: 2048
    });
    
    const aiResponse = await evaluationService.sendMessage(evaluationPrompt);

    let evaluation;
    try {
      // Parse AI response
      const responseText = aiResponse.content;
      // Extract JSON from the response (it might be wrapped in markdown or other text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse JSON from AI response');
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback evaluation if parsing fails - give conservative scores
      const totalWords = conversations.reduce((sum, c) => sum + (c.user || '').length, 0);
      const baseScore = totalWords < 10 ? 10 : totalWords < 50 ? 30 : 50;
      
      evaluation = {
        score: baseScore,
        ksaScores: {
          knowledge: baseScore - 5,
          skills: baseScore,
          attitudes: baseScore + 5
        },
        individualKsaScores: {
          "K1.1": baseScore - 5, "K1.2": baseScore - 5, "K2.1": baseScore - 5, "K2.3": baseScore - 5,
          "S1.1": baseScore, "S1.2": baseScore, "S2.1": baseScore, "S2.3": baseScore,
          "A1.1": baseScore + 5, "A1.2": baseScore + 5, "A2.1": baseScore + 5
        },
        domainScores: {
          "engaging_with_ai": baseScore,
          "creating_with_ai": baseScore - 10,
          "managing_with_ai": baseScore - 10,
          "designing_with_ai": baseScore - 15
        },
        rubricsScores: {
          "Research Quality": 1,
          "AI Utilization": totalWords < 10 ? 1 : 2,
          "Content Quality": 1,
          "Learning Progress": totalWords < 10 ? 1 : 2
        },
        strengths: ['願意開始學習 (A1.1)'],
        improvements: ['需要更積極參與任務 (S1.1)', '應該嘗試回答問題而非只是打招呼 (K1.1)'],
        nextSteps: ['認真閱讀任務說明', '嘗試回答AI提出的問題']
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
      
      // Give higher weight to primary assessment focus items, but cap based on performance
      const isPrimary = assessmentFocus.primary?.includes(ksa);
      const adjustedScore = isPrimary ? Math.min(100, Math.min(score + 5, evaluation.score + 10)) : score;
      
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

    // Update session with stage result - always overwrite if exists
    const updatedStageResults = [...sessionData.stageResults];
    const existingIndex = updatedStageResults.findIndex(r => r.stageId === stageId);
    
    if (existingIndex >= 0) {
      // Overwrite existing evaluation with new one
      console.log('Overwriting existing evaluation for stage:', stageId);
      updatedStageResults[existingIndex] = stageResult;
    } else {
      // Add new evaluation
      console.log('Adding new evaluation for stage:', stageId);
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
          message: 'Failed to evaluate stage',
          details: error instanceof Error ? error.message : 'Unknown error'
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