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
    const { sessionId, stageId, language } = body;

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

    // Get session data - force fresh read from GCS
    console.log('Fetching session for evaluation:', sessionId);
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

    const { sessionData, logId } = result;
    
    // Debug logging
    console.log('Retrieved session from logId:', logId);
    console.log('Session data keys:', Object.keys(sessionData));
    console.log('ProcessLogs exists?', 'processLogs' in sessionData);
    console.log('ProcessLogs length:', sessionData.processLogs?.length || 0);
    console.log('ProcessLogs for stage', stageId, ':', sessionData.processLogs?.filter(log => log.stageId === stageId).length || 0);
    console.log('First few logs:', sessionData.processLogs?.slice(0, 3));
    
    // Get stage process logs
    const stageLogs = (sessionData.processLogs || []).filter(log => log.stageId === stageId);
    
    // Get conversation history for this stage with user inputs from process logs
    const conversations = stageLogs
      .filter(log => log.actionType === 'write' || log.detail?.aiInteraction)
      .map(log => {
        // For write actions, get userInput
        if (log.actionType === 'write') {
          return {
            user: log.detail?.userInput || '',
            ai: ''
          };
        }
        // For interaction actions, get both prompt and response
        return {
          user: log.detail?.aiInteraction?.prompt || log.detail?.userInput || '',
          ai: log.detail?.aiInteraction?.response || ''
        };
      })
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
    console.log('Stage logs count:', stageLogs.length);
    console.log('Conversations count:', conversations.length);
    console.log('Evaluating user inputs:', conversations.map(c => c.user));
    console.log('Total user input length:', conversations.reduce((sum, c) => sum + (c.user || '').length, 0));
    
    // Generate evaluation prompt data
    const conversationCount = conversations.filter(c => c.user).length;
    const totalInputLength = conversations.reduce((sum, c) => sum + (c.user || '').length, 0);
    
    const evaluationPrompt = `You are a professional learning assessment expert. Please **strictly and objectively** evaluate the learner's performance in this stage based on the following conversation records.

Important evaluation principles:
1. **Only evaluate what the learner actually said**, do not evaluate the AI assistant's responses
2. If the learner just greets (like "hi", "hello") or gives very short responses, they should receive **very low scores** (0-20 points)
3. The learner must **actually attempt to solve the task** to receive a passing score
4. Scoring should be based on the learner's demonstrated **effort level, depth of understanding, and task completion**

Stage Information:
- Name: ${stage?.name || stageId}
- Type: ${stage?.stageType}
- Modality Focus: ${stage?.modalityFocus}
- Task Instructions: ${stage?.tasks?.[0]?.instructions?.join('; ') || 'None'}
- Expected Outcome: ${stage?.tasks?.[0]?.expectedOutcome || 'None'}

Target Domains:
${scenario?.targetDomain?.join(', ') || 'No specific domains'}

Assessment Focus KSA:
- Primary items: ${assessmentFocus.primary.join(', ')} (please give higher weight)
- Secondary items: ${assessmentFocus.secondary.join(', ')}

Full KSA Mapping:
Knowledge: ${scenario?.ksaMapping?.knowledge?.join(', ') || 'None'}
Skills: ${scenario?.ksaMapping?.skills?.join(', ') || 'None'}
Attitudes: ${scenario?.ksaMapping?.attitudes?.join(', ') || 'None'}

Conversation Records (pay special attention to learner's actual inputs):
${conversations.map((conv, i) => `
Conversation ${i + 1}:
[Learner Input]: ${conv.user || '(no input)'}
[AI Response]: ${conv.ai ? conv.ai.substring(0, 200) + '...' : '(no response)'}
`).join('\n')}

Total learner inputs: ${conversationCount}
Total input characters: ${totalInputLength}

Please evaluate the learner's performance in the following areas:

**Scoring Criteria**:
- If learner only greets or gives very short responses, all scores should be in 0-20 range
- If learner attempts but doesn't complete task, scores should be in 20-50 range
- If learner seriously attempts and partially completes task, scores should be in 50-70 range
- Only when learner fully demonstrates understanding and completes task, give 70+ points

1. Overall performance score (0-100): Based on actual effort and task completion

2. Individual KSA scores (0-100 each):
   If learner doesn't demonstrate relevant ability, give 0-10 points

3. Domain scores (0-100):
   - engaging_with_ai: Is the learner really engaging with AI to solve problems?
   - creating_with_ai: Did the learner attempt to create content?
   - managing_with_ai: Did the learner show management abilities?
   - designing_with_ai: Did the learner show design thinking?

4. Rubrics scores (1-4 levels):
   Level 1: Below standard (e.g., just greeting)
   Level 2: Initial attempt
   Level 3: Partially achieved
   Level 4: Fully achieved

5. Strengths (at least 1 point, each must include relevant KSA codes, format: "description (K1.1)" or "description (K1.1, S2.1)")
6. Areas for improvement (at least 2 points, each must include relevant KSA codes, same format)
7. Next steps (at least 2 points, each must include relevant KSA codes, same format)

Please respond in JSON format:
{
  "score": number,
  "ksaScores": {
    "knowledge": number (0-100),
    "skills": number (0-100),
    "attitudes": number (0-100)
  },
  "individualKsaScores": {
    "K1.1": number (0-100),
    ...
  },
  "domainScores": {
    "engaging_with_ai": number (0-100),
    "creating_with_ai": number (0-100),
    "managing_with_ai": number (0-100),
    "designing_with_ai": number (0-100)
  },
  "rubricsScores": {
    "Research Quality": level (1-4),
    "AI Utilization": level (1-4),
    "Content Quality": level (1-4),
    "Learning Progress": level (1-4)
  },
  "strengths": ["strength description (K1.1)", "another strength (S1.1, A1.1)"],
  "improvements": ["area needing improvement (K2.1)", "another improvement (S2.1)"],
  "nextSteps": ["specific action suggestion (K1.1, S1.1)", "another suggestion (S2.3)"]
}`;

    // Create a VertexAIService instance for evaluation with language-aware system prompt
    const evaluationService = new VertexAIService({
      model: 'gemini-2.0-flash-exp',
      systemPrompt: `You are a strict but fair learning assessment expert. Please provide objective scores based on the learner's actual performance. If the learner only greets or does not attempt to solve the task, you must give low scores.
      
IMPORTANT: Respond in the language specified by code: ${language || 'en'}. All feedback, strengths, improvements, and suggestions must be in this language.`,
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
      console.error('AI response content:', aiResponse.content);
      
      // Return error response instead of fake data
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EVALUATION_PARSE_ERROR',
            message: 'Failed to parse evaluation results from AI response',
            details: error instanceof Error ? error.message : 'Unknown parsing error'
          }
        },
        { status: 500 }
      );
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