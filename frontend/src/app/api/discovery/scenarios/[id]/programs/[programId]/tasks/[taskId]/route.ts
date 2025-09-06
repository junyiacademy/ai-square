import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';
import { TranslationService } from '@/lib/services/translation-service';
import { Interaction } from '@/lib/repositories/interfaces';

// System prompt for AI - keep in English as it's for the AI model
function getSystemPromptForLanguage(_language: string): string { // eslint-disable-line @typescript-eslint/no-unused-vars
  return 'You are an expert educational psychologist and learning coach.';
}

function generateComprehensiveFeedbackPrompt(
  language: string,
  careerType: string,
  taskTitle: string,
  taskInstructions: string,
  taskContext: unknown,
  yamlData: unknown,
  learningJourney: unknown[]
): string {
  // Debug log language detection
  console.log('Language detection for feedback:', {
    inputLanguage: language,
    careerType,
    taskTitle
  });

  return `
You are an experienced mentor from the ${careerType} field. Based on the world setting context and the learner's complete journey, provide a concise but meaningful qualitative assessment.

Context & Setting:
- Career Field: ${careerType}
- Task: ${taskTitle}
- Objective: ${taskInstructions}
${yamlData && (yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting ? `- World Setting: ${(yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting?.description || 'Unknown'}` : ''}
${yamlData && (yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting ? `- Atmosphere: ${(yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting?.atmosphere || 'Unknown'}` : ''}

Learning Journey:
${JSON.stringify(learningJourney, null, 2)}

As a seasoned expert in this field, provide a personalized assessment that:

1. **Highlights key growth moments** - What specific breakthroughs did you observe?
2. **Identifies unique strengths** - What made their approach stand out?
3. **Offers practical next steps** - What should they focus on developing next?

Guidelines:
- Write as an authoritative but approachable mentor in this specific field
- Keep it concise (2-3 short paragraphs maximum)
- Be specific about what they did well, not generic praise
- Include 1-2 concrete suggestions for improvement
- Sign off with an appropriate authority figure name based on the career field:
  * For biotech/life sciences: Use historical figures like "Dr. Fleming" (Alexander Fleming), "Dr. Watson" (James Watson), or "Dr. McClintock" (Barbara McClintock)
  * For technology/AI: Use figures like "Dr. Turing" (Alan Turing), "Prof. McCarthy" (John McCarthy), or "Dr. Hinton" (Geoffrey Hinton) 
  * For creative fields: Use figures like "Prof. Jobs" (Steve Jobs), "Master da Vinci" (Leonardo da Vinci), or "Sensei Miyazaki" (Hayao Miyazaki)
  * For business/entrepreneurship: Use figures like "Prof. Drucker" (Peter Drucker), "Mr. Carnegie" (Andrew Carnegie), or "Ms. Graham" (Katherine Graham)
  * For data/analytics: Use figures like "Prof. Tukey" (John Tukey), "Dr. Fisher" (Ronald Fisher), or "Prof. Nightingale" (Florence Nightingale)
  * For other fields: Choose appropriate historical authority figures or create fitting fictional expert names
- Focus on growth and potential rather than perfect performance
- Use markdown formatting with **bold** for emphasis and clear structure
- Use bullet points or numbered lists where appropriate for clarity

Write in language code: ${language} with an encouraging but professional tone that reflects expertise in the ${careerType} domain.`;
}

// TODO: Replace with i18n translations in the future
function getStatsSection(language: string, attempts: number, passCount: number, bestXP: number): string {
  // For now, use simple format - will be replaced with i18n
  return `\n\n📊 Learning Statistics Summary:\n- Total attempts: ${attempts}\n- Passed times: ${passCount}\n- Highest score: ${bestXP} XP`;
}

function getSkillsSection(language: string, skills: string[]): string {
  // For now, use simple format - will be replaced with i18n
  return `\n- Demonstrated abilities: ${skills.join(', ')}`;
}

function getFallbackMessage(_language: string): string { // eslint-disable-line @typescript-eslint/no-unused-vars
  // For now, use simple message - will be replaced with i18n
  return 'Congratulations on successfully completing this task! Your effort and persistence are commendable.';
}

// GET a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user.email) {
      return createUnauthorizedResponse();
    }

    const { programId, taskId } = await params;
    const userId = session.user.id; // Use user ID not email
    
    // Get language from query params
    const url = new URL(request.url);
    const requestedLanguage = url.searchParams.get('lang') || 'en';
    
    // Debug log language request
    console.log('=== GET TASK LANGUAGE DEBUG ===');
    console.log('Requested URL:', request.url);
    console.log('Language parameter:', requestedLanguage);
    console.log('==============================');
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const scenarioRepo = repositoryFactory.getScenarioRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Verify program ownership
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get task with interactions
    const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(taskId);
    if (!taskWithInteractions || taskWithInteractions.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskWithInteractions;
    
    // Load scenario for career info
    const scenario = await scenarioRepo.findById(program.scenarioId);
    
    // Handle multilingual evaluation if task is completed
    let processedEvaluation = null;
    const evaluationId = (task.metadata?.evaluationId as string) || (task.metadata?.evaluation as { id?: string })?.id || null;
    
    if (evaluationId && task.status === 'completed') {
      // Get full evaluation record
      const fullEvaluation = await evaluationRepo.findById(evaluationId);
      
      if (fullEvaluation) {
        const existingVersions = (fullEvaluation.feedbackData || fullEvaluation.metadata?.feedbackVersions || {}) as Record<string, string>;
        
        // Debug log existing versions
        console.log('=== EVALUATION VERSIONS DEBUG ===');
        console.log('Requested language:', requestedLanguage);
        console.log('Existing versions:', Object.keys(existingVersions));
        console.log('Full evaluation feedback:', fullEvaluation.feedbackText?.substring(0, 100) + '...');
        console.log('=================================');
        
        // Check if we need the requested language version
        if (!existingVersions[requestedLanguage]) {
          try {
            // Need to translate - determine source language and content
            let sourceFeedback: string;
            let sourceLanguage: string;
            
            if (existingVersions['en']) {
              // Prefer English as source for translation
              sourceFeedback = existingVersions['en'];
              sourceLanguage = 'en';
            } else if (fullEvaluation.feedbackText) {
              // Use default feedback (might be in another language)
              sourceFeedback = fullEvaluation.feedbackText;
              sourceLanguage = 'en'; // Assume default is English unless we track source language
            } else {
              throw new Error('No source feedback available for translation');
            }
            
            console.log(`Translating evaluation from ${sourceLanguage} to ${requestedLanguage}`);
            console.log('Source feedback preview:', sourceFeedback.substring(0, 100) + '...');
            
            const translationService = new TranslationService();
            const careerType = ((scenario?.metadata as Record<string, unknown>)?.careerType || 'general') as string;
            
            // Special handling: if requesting English and source is English, no translation needed
            if (requestedLanguage === 'en' && sourceLanguage === 'en') {
              processedEvaluation = {
                id: fullEvaluation.id,
                score: fullEvaluation.score,
                feedback: sourceFeedback,
                feedbackVersions: { ...existingVersions, 'en': sourceFeedback },
                evaluatedAt: fullEvaluation.createdAt
              };
            } else {
              const translatedFeedback = await translationService.translateFeedback(
                sourceFeedback,
                requestedLanguage,
                careerType
              );
              
              // Update evaluation with new translation
              const updatedVersions = {
                ...existingVersions,
                [requestedLanguage]: translatedFeedback
              };
              
              // Note: evaluationRepo doesn't have update method
              // Store updated versions in task metadata
              await taskRepo.update?.(taskId, {
                metadata: {
                  ...task.metadata,
                  evaluationFeedbackVersions: updatedVersions
                }
              });
              
              // Already updated task metadata above
              
              // Use translated version for response
              processedEvaluation = {
                id: fullEvaluation.id,
                score: fullEvaluation.score,
                feedback: translatedFeedback,
                feedbackVersions: updatedVersions,
                evaluatedAt: fullEvaluation.createdAt
              };
            }
          } catch (error) {
            console.error('Translation failed:', error);
            // Fall back to available version
            const fallbackFeedback = TranslationService.getFeedbackByLanguage(
              existingVersions,
              requestedLanguage,
              'en'
            );
            if (fallbackFeedback) {
              processedEvaluation = {
                id: fullEvaluation.id,
                score: fullEvaluation.score,
                feedback: fallbackFeedback,
                feedbackVersions: existingVersions,
                evaluatedAt: fullEvaluation.createdAt
              };
            }
          }
        } else {
          // Use existing version
          const feedbackByLanguage = TranslationService.getFeedbackByLanguage(
            existingVersions,
            requestedLanguage,
            'en'
          );
          if (feedbackByLanguage) {
            processedEvaluation = {
              id: fullEvaluation.id,
              score: fullEvaluation.score,
              feedback: feedbackByLanguage,
              feedbackVersions: existingVersions,
              evaluatedAt: fullEvaluation.createdAt
            };
          }
        }
      }
    }
    
    // Return task data
    return NextResponse.json({
      id: task.id,
      title: (() => {
        const titleObj = task.title as string | Record<string, string> | undefined;
        // Handle different types of title
        if (typeof titleObj === 'string') {
          // Check if it's a JSON string
          if (titleObj.startsWith('{')) {
            try {
              const parsed = JSON.parse(titleObj);
              return parsed[requestedLanguage] || parsed['en'] || titleObj;
            } catch {
              return titleObj; // Return as-is if parse fails
            }
          }
          return titleObj;
        } else if (typeof titleObj === 'object' && titleObj !== null) {
          // It's already an object
          return titleObj[requestedLanguage] || titleObj['en'] || '';
        }
        return '';
      })(),
      type: task.type,
      status: task.status,
      content: (() => {
        const content = task.content as Record<string, unknown>;
        // Extract multilingual fields from content
        const processMultilingual = (value: unknown): unknown => {
          if (typeof value === 'string' && value.startsWith('{')) {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === 'object' && parsed !== null && requestedLanguage in parsed) {
                return parsed[requestedLanguage] || parsed['en'] || value;
              }
            } catch {
              // Not JSON, return as-is
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;
            // Check if it's a multilingual object
            if ('en' in obj || 'zhTW' in obj) {
              return obj[requestedLanguage] || obj['en'] || value;
            }
          }
          return value;
        };
        
        // Process content fields
        return {
          ...content,
          instructions: processMultilingual(content.instructions),
          description: processMultilingual(content.description)
        };
      })(),
      interactions: task.interactions,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      evaluation: processedEvaluation,
      // Add career info
      careerType: ((scenario?.metadata as Record<string, unknown>)?.careerType || 'unknown') as string,
      scenarioTitle: (() => {
        const titleObj = scenario?.title as string | Record<string, string> | undefined;
        if (typeof titleObj === 'string') {
          if (titleObj.startsWith('{')) {
            try {
              const parsed = JSON.parse(titleObj);
              return parsed[requestedLanguage] || parsed['en'] || titleObj;
            } catch {
              return titleObj;
            }
          }
          return titleObj;
        } else if (typeof titleObj === 'object' && titleObj !== null) {
          return titleObj[requestedLanguage] || titleObj['en'] || 'Discovery Scenario';
        }
        return 'Discovery Scenario';
      })()
    });
  } catch (error) {
    console.error('Error in GET task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update task (submit response, update status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user.email) {
      return createUnauthorizedResponse();
    }

    const { programId, taskId } = await params;
    const userId = session.user.id; // Use user ID not email
 // Keep for evaluation records
    
    const body = await request.json();
    const { action, content } = body;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Verify program ownership
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get task with interactions
    const taskWithInteractions = await taskRepo.getTaskWithInteractions?.(taskId);
    if (!taskWithInteractions || taskWithInteractions.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskWithInteractions;
    
    if (action === 'submit') {
      // Add user response as interaction
      const newInteraction: Interaction = {
        timestamp: new Date().toISOString(),
        type: 'user_input',
        content: content.response,
        metadata: {
          timeSpent: content.timeSpent || 0
        }
      };
      
      // Get current interactions and add new one
      const currentInteractions = task.interactions || [];
      const updatedInteractions = [...currentInteractions, newInteraction];
      
      // Update task with new interaction
      await taskRepo.updateInteractions?.(taskId, updatedInteractions);
      
      // Also record attempt for score tracking
      await taskRepo.recordAttempt?.(taskId, {
        response: content.response,
        timeSpent: content.timeSpent || 0
      });
      
      const language = (program.metadata?.language || 'en') as string;
      
      // Get user's preferred language from request header
      const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
      const userLanguage = acceptLanguage || language;
      
      // Use AI to evaluate the response
      const aiService = new VertexAIService({
        systemPrompt: userLanguage === 'zhTW' 
          ? '你是嚴格的學習評估助手。請根據任務要求客觀評估學習者是否真正完成了任務。如果回答與任務無關或未完成要求，必須給予誠實的評估。'
          : 'You are a strict learning evaluator. Objectively assess if the learner actually completed the task based on requirements. If response is unrelated or incomplete, provide honest assessment.',
        temperature: 0.7,
        model: 'gemini-2.5-flash'
      });
      
      // Prepare evaluation prompt with clear task context
      const taskInstructions = (task.metadata as Record<string, unknown>)?.instructions || '';
      const maxXP = (task.content as Record<string, unknown>)?.xp as number || 100;
      const taskContent = task.content as Record<string, unknown> || {};
      
      // Extract language-specific values from multilingual objects
      const getLocalizedValue = (obj: unknown): string => {
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'object' && obj !== null) {
          const multilingualObj = obj as Record<string, string>;
          return multilingualObj[userLanguage] || multilingualObj['en'] || JSON.stringify(obj);
        }
        return String(obj);
      };
      
      const evaluationPrompt = userLanguage === 'zhTW' 
        ? `嚴格評估學習者是否完成了指定任務：

任務標題：${getLocalizedValue(task.title)}
任務說明：${getLocalizedValue(taskInstructions)}
${taskContent.description ? `任務描述：${getLocalizedValue(taskContent.description)}` : ''}
${taskContent.instructions ? `任務指示：${getLocalizedValue(taskContent.instructions)}` : ''}
${taskContent.requirements ? `具體要求：${JSON.stringify(taskContent.requirements)}` : ''}

學習者回答：
${content.response}

請仔細判斷：
1. 回答是否真的針對任務要求？
2. 是否實際完成了要求的內容？
3. 如果回答與任務無關，completed 必須為 false

請用繁體中文以 JSON 格式回覆：
{
  "feedback": "具體說明是否完成任務及原因",
  "strengths": ["優點（如果有）"],
  "improvements": ["必須改進的地方"],
  "completed": true/false（嚴格判斷）,
  "xpEarned": number (0-${maxXP}，未完成任務應該很低),
  "skillsImproved": ["實際展現的相關技能"]
}`
        : `Strictly evaluate if the learner completed the assigned task:

Task Title: ${getLocalizedValue(task.title)}
Instructions: ${getLocalizedValue(taskInstructions)}
${taskContent.description ? `Description: ${getLocalizedValue(taskContent.description)}` : ''}
${taskContent.instructions ? `Task Instructions: ${getLocalizedValue(taskContent.instructions)}` : ''}
${taskContent.requirements ? `Requirements: ${JSON.stringify(taskContent.requirements)}` : ''}

Learner's Response:
${content.response}

Carefully judge:
1. Does the response address the task requirements?
2. Did they actually complete what was asked?
3. If response is unrelated to task, completed MUST be false

Return JSON:
{
  "feedback": "Specific feedback on task completion",
  "strengths": ["Strengths if any"],
  "improvements": ["What needs improvement"],
  "completed": true/false (strict judgment),
  "xpEarned": number (0-${maxXP}, should be low if not completed),
  "skillsImproved": ["Actually demonstrated relevant skills"]
}`;

      try {
        const aiResponse = await aiService.sendMessage(evaluationPrompt);
        
        // Parse JSON from AI response
        let evaluationResult;
        try {
          // Extract JSON from the response (AI might include markdown code blocks)
          const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            evaluationResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in AI response');
          }
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError);
          // Fallback evaluation
          evaluationResult = {
            feedback: aiResponse.content,
            completed: true,
            xpEarned: (task.content as Record<string, unknown>)?.xp as number || 100,
            strengths: [],
            improvements: [],
            skillsImproved: []
          };
        }
        
        // Add AI evaluation as interaction
        const aiInteraction: Interaction = {
          timestamp: new Date().toISOString(),
          type: 'ai_response',
          content: evaluationResult,
          metadata: {
            completed: evaluationResult.completed,
            xpEarned: evaluationResult.xpEarned
          }
        };
        
        // Get latest interactions and add AI response
        const latestTask = await taskRepo.getTaskWithInteractions?.(taskId);
        const latestInteractions = latestTask?.interactions || updatedInteractions;
        const finalInteractions = [...latestInteractions, aiInteraction];
        
        // Update task with AI interaction
        await taskRepo.updateInteractions?.(taskId, finalInteractions);
        
        // Record AI evaluation as metadata (not a user attempt)
        // We'll store this in task metadata instead
        await taskRepo.update?.(taskId, {
          metadata: {
            lastEvaluation: evaluationResult,
            lastEvaluatedAt: new Date().toISOString()
          }
        });
        
        // Don't create evaluation or mark complete yet - wait for user confirmation
        // Just return the result
        return NextResponse.json({
          success: true,
          completed: evaluationResult.completed,
          feedback: evaluationResult.feedback,
          strengths: evaluationResult.strengths || [],
          improvements: evaluationResult.improvements || [],
          xpEarned: evaluationResult.xpEarned || 0,
          canComplete: evaluationResult.completed // Indicate task can be completed
        });
      } catch (aiError) {
        console.error('AI evaluation error:', aiError);
        // Return error response without creating evaluation
        return NextResponse.json({
          success: false,
          error: 'AI evaluation failed',
          feedback: '評估時發生錯誤，請稍後再試。',
          canComplete: false
        });
      }
    } else if (action === 'confirm-complete') {
      // User confirms task completion
      // First check if task has any passed interactions
      const hasPassedInteraction = task.interactions.some(
        i => i.type === 'ai_response' && (i.content as { completed?: boolean })?.completed === true
      );
      
      if (!hasPassedInteraction) {
        return NextResponse.json(
          { error: 'Task has not been passed yet' },
          { status: 400 }
        );
      }
      
      // Create comprehensive evaluation based on all interactions
      const userAttempts = task.interactions.filter((i: Interaction) => i.type === 'user_input').length;
      const aiResponses = task.interactions.filter((i: Interaction) => i.type === 'ai_response');
      
      // Debug log
      console.log('Task interactions for completion:', {
        taskId,
        userAttempts,
        aiResponseCount: aiResponses.length,
        aiResponseDetails: aiResponses.map((r: Interaction) => ({
          timestamp: r.timestamp,
          completed: (r.metadata as { completed?: boolean })?.completed,
          content: r.content
        }))
      });
      
      const passedAttempts = aiResponses.filter((i: Interaction) => {
        try {
          const parsed = JSON.parse(String(i.content)) as { completed?: boolean };
          return parsed.completed === true;
        } catch {
          return false;
        }
      }).length;
      
      // Get all feedback for comprehensive review
      const allFeedback = task.interactions
        .filter(i => i.type === 'ai_response')
        .map(i => i.content);
      
      // Calculate total XP from best attempt
      const bestXP = Math.max(
        ...allFeedback.map(f => typeof f === 'object' && f !== null && 'xpEarned' in f ? (f as { xpEarned?: number }).xpEarned || 0 : 0),
        (task.content as Record<string, unknown>)?.xp as number || 100
      );
      
      // Generate comprehensive qualitative feedback using LLM based on full learning journey
      let comprehensiveFeedback = 'Task completed successfully!';
      let userLanguage = 'en'; // Default language
      let careerType = 'unknown'; // Default career type
      
      // Generate comprehensive feedback based on learning journey
      try {
        // Prepare all user responses and AI feedback for comprehensive analysis
        const learningJourney = task.interactions.map((interaction, index) => {
          if (interaction.type === 'user_input') {
            return {
              type: 'user_response',
              attempt: Math.floor(index / 2) + 1,
              content: interaction.content,
              timeSpent: (interaction.metadata as { timeSpent?: number })?.timeSpent || 0
            };
          } else if (interaction.type === 'ai_response') {
            let parsed: { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
            try {
              parsed = typeof interaction.content === 'string' 
                ? JSON.parse(interaction.content)
                : interaction.content as { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
            } catch {
              parsed = { completed: false, feedback: '', strengths: [], improvements: [], xpEarned: 0 };
            }
            return {
              type: 'ai_feedback',
              attempt: Math.floor(index / 2) + 1,
              passed: parsed.completed || false,
              feedback: parsed.feedback || '',
              strengths: parsed.strengths || [],
              improvements: parsed.improvements || [],
              xpEarned: parsed.xpEarned || 0
            };
          }
          return null;
        }).filter(Boolean);
        
        // Get scenario and task context
        const scenarioRepo = repositoryFactory.getScenarioRepository();
        const scenario = await scenarioRepo.findById(program.scenarioId);
        careerType = (scenario?.metadata?.careerType || 'unknown') as string;
        const language = (program.metadata?.language || 'en') as string;
        
        // Get current user language preference from request headers or use program language
        const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
        userLanguage = (acceptLanguage || language) as string;
        
        // Debug log language detection
        console.log('=== LANGUAGE DETECTION DEBUG ===');
        console.log('1. Raw headers:', {
          acceptLanguage: request.headers.get('accept-language'),
          allHeaders: Object.fromEntries(request.headers.entries())
        });
        console.log('2. Language processing:', {
          rawAcceptLanguage: acceptLanguage,
          programLanguage: language,
          beforeProcessing: acceptLanguage || language,
          afterProcessing: userLanguage
        });
        console.log('3. Final language for AI:', {
          finalUserLanguage: userLanguage,
          careerType,
          taskTitle: task.title
        });
        console.log('================================');
        
        // Load YAML data for world setting context
        let yamlData = null;
        if (careerType !== 'unknown') {
          const loader = new DiscoveryYAMLLoader();
          yamlData = await loader.loadPath(careerType, language);
        }
        
        // Extract title as string
        const taskTitle = (() => {
          const titleObj = task.title;
          if (typeof titleObj === 'string') {
            return titleObj;
          } else if (typeof titleObj === 'object' && titleObj !== null) {
            return (titleObj as Record<string, string>)[language] || (titleObj as Record<string, string>)['en'] || '';
          }
          return '';
        })();
        
        // Generate multilingual comprehensive qualitative feedback
        const comprehensivePrompt = generateComprehensiveFeedbackPrompt(
          userLanguage,
          careerType,
          taskTitle,
          (task.metadata as Record<string, unknown>)?.instructions as string || '',
          task.content || {},
          yamlData,
          learningJourney
        );
        
        // Debug log the generated prompt
        console.log('=== GENERATED PROMPT DEBUG ===');
        console.log('Prompt language setting:', userLanguage);
        console.log('Full prompt to AI:');
        console.log(comprehensivePrompt);
        console.log('==============================');
        
        // Use AI to generate comprehensive qualitative feedback
        const aiService = new VertexAIService({
          systemPrompt: getSystemPromptForLanguage(userLanguage),
          temperature: 0.8,
          model: 'gemini-2.5-flash'
        });
        
        const aiResponse = await aiService.sendMessage(comprehensivePrompt);
        comprehensiveFeedback = aiResponse.content;
        
        // Debug log AI response (confirm-complete)
        console.log('=== AI RESPONSE DEBUG (CONFIRM-COMPLETE) ===');
        console.log('AI response received:');
        console.log(comprehensiveFeedback);
        console.log('Response length:', comprehensiveFeedback.length);
        console.log('==========================================');
        
        // Add learning statistics at the end
        if (userAttempts > 1) {
          const statsSection = getStatsSection(userLanguage, userAttempts, passedAttempts, bestXP);
          comprehensiveFeedback += statsSection;
          
          // Add skills summary if available
          const allSkills = new Set<string>();
          allFeedback.forEach(f => {
            const fRecord = f as unknown as Record<string, unknown>;
            if (fRecord.skillsImproved && Array.isArray(fRecord.skillsImproved)) {
              fRecord.skillsImproved.forEach((skill: unknown) => {
                if (typeof skill === 'string') {
                  allSkills.add(skill);
                }
              });
            }
          });
          
          if (allSkills.size > 0) {
            const skillsSection = getSkillsSection(userLanguage, Array.from(allSkills));
            comprehensiveFeedback += skillsSection;
          }
        }
      } catch (error) {
        console.error('Error generating comprehensive feedback:', error);
        // Fallback to simple feedback if AI generation fails
        const lastSuccessfulInteraction = task.interactions
          .filter((i: Interaction) => {
            if (i.type !== 'ai_response') return false;
            try {
              const parsed = JSON.parse(String(i.content)) as { completed?: boolean };
              return parsed.completed === true;
            } catch {
              return false;
            }
          })
          .slice(-1)[0];
        
        if (lastSuccessfulInteraction) {
          try {
            const parsed = JSON.parse(String(lastSuccessfulInteraction.content)) as { feedback?: string };
            comprehensiveFeedback = parsed.feedback || getFallbackMessage(userLanguage);
          } catch {
            comprehensiveFeedback = getFallbackMessage(userLanguage);
          }
        } else {
          comprehensiveFeedback = getFallbackMessage(userLanguage);
        }
        
        if (userAttempts > 1) {
          const statsSection = getStatsSection(userLanguage, userAttempts, passedAttempts, bestXP);
          comprehensiveFeedback += statsSection;
        }
      }
      
      // Collect all skills improved across attempts
      const allSkillsImproved = new Set<string>();
      allFeedback.forEach(f => {
        if (typeof f === 'object' && f !== null) {
          const fRecord = f as Record<string, unknown>;
          if (fRecord.skillsImproved && Array.isArray(fRecord.skillsImproved)) {
            fRecord.skillsImproved.forEach((skill: unknown) => {
              if (typeof skill === 'string') {
                allSkillsImproved.add(skill);
              }
            });
          }
        }
      });
      
      // Prepare multilingual feedback versions
      // Store feedback in the generated language, no need to translate back
      const feedbackVersions: Record<string, string> = {};
      feedbackVersions[userLanguage] = comprehensiveFeedback;
      
      // If not English, also store as English for compatibility
      if (userLanguage !== 'en') {
        feedbackVersions['en'] = comprehensiveFeedback; // Store as is, will be translated on demand if needed
      }
      
      // Create formal evaluation record with multilingual support
      const evaluation = await evaluationRepo.create({
        userId: userId,
        programId: programId,
        taskId: taskId,
        mode: 'discovery',
        evaluationType: 'task',
        evaluationSubtype: 'discovery_task',
        score: Math.min(bestXP, 100), // Ensure score doesn't exceed maxScore
        maxScore: 100,
        domainScores: {},
        feedbackText: feedbackVersions['en'], // Default to English
        feedbackData: feedbackVersions,
        aiAnalysis: {},
        timeTakenSeconds: 0,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {
          xpEarned: bestXP,
          totalAttempts: userAttempts,
          passedAttempts: passedAttempts,
          skillsImproved: Array.from(allSkillsImproved),
        },
        assessmentData: {},
        metadata: {
          feedbackVersions: feedbackVersions,
          completed: true,
          learningJourney: allFeedback,
          originalLanguage: userLanguage,
          actualXPEarned: bestXP // Store the actual XP (can be > 100)
        }
      });
      
      // Mark task as completed and save evaluation ID
      await taskRepo.update?.(taskId, {
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        metadata: {
          ...(task.metadata || {}),
          evaluation: {
            id: evaluation.id,
            score: evaluation.score,
            actualXP: bestXP, // Include actual XP earned
            feedback: feedbackVersions[userLanguage] || evaluation.feedbackText, // Return in user's language
            feedbackVersions: feedbackVersions,
            evaluatedAt: evaluation.createdAt
          }
        }
      });
      
      // Get current XP (will be updated later with currentTaskId)
      const currentXP = (program.metadata?.totalXP as number) || 0;
      
      // Update program progress
      // Use the task order from program.taskIds to ensure correct sequence
      const allTasks = await taskRepo.findByProgram(programId);
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      
      // Get tasks in the correct order based on taskIds in metadata
      const taskIds = (program.metadata?.taskIds as string[]) || [];
      const orderedTasks = taskIds
        .map((id: string) => taskMap.get(id))
        .filter(Boolean) as ITask[];
      
      const completedTasks = orderedTasks.filter(t => t.status === 'completed').length;
      const nextTaskIndex = completedTasks;
      
      // Activate next task if available
      let nextTaskId = null;
      if (nextTaskIndex < orderedTasks.length) {
        const nextTask = orderedTasks[nextTaskIndex];
        await taskRepo.updateStatus?.(nextTask.id, 'active');
        nextTaskId = nextTask.id;
      }
      
      // Update program current task index and currentTaskId
      // Update program current task index
      await programRepo.update?.(programId, { currentTaskIndex: nextTaskIndex });
      
      // Update currentTaskId in metadata
      await programRepo.update?.(programId, {
        metadata: {
          ...program.metadata,
          currentTaskId: nextTaskId,
          currentTaskIndex: nextTaskIndex,
          totalXP: currentXP + bestXP
        }
      });
      
      // If all tasks completed, complete the program
      if (completedTasks === orderedTasks.length) {
        await programRepo.update?.(programId, { status: "completed" });
        
        // Create program completion evaluation
        await evaluationRepo.create({
          userId: session.user.id,
          programId: programId,
          mode: 'discovery',
          evaluationType: 'program',
          evaluationSubtype: 'discovery_completion',
          score: 100,
          maxScore: 100,
          timeTakenSeconds: 0,
          domainScores: {},
          feedbackText: 'Congratulations! You have completed all learning tasks in this program.',
          feedbackData: {},
          aiAnalysis: {},
          createdAt: new Date().toISOString(),
          pblData: {},
          discoveryData: {
            totalXP: currentXP + bestXP,
            tasksCompleted: orderedTasks.length
          },
          assessmentData: {},
          metadata: {
            domainScores: {},
            totalXP: currentXP + bestXP,
            tasksCompleted: orderedTasks.length
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        taskCompleted: true,
        evaluation: {
          id: evaluation.id,
          score: evaluation.score,
          xpEarned: bestXP,
          feedback: comprehensiveFeedback
        },
        nextTaskId,
        programCompleted: completedTasks === orderedTasks.length
      });
    } else if (action === 'regenerate-evaluation') {
      // Only allow in localhost environment
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: 'Not allowed in production' },
          { status: 403 }
        );
      }
      
      // Check if task is completed
      if (task.status !== 'completed') {
        return NextResponse.json(
          { error: 'Task must be completed to regenerate evaluation' },
          { status: 400 }
        );
      }
      
      // Regenerate comprehensive feedback using the same logic as confirm-complete
      const userAttempts = task.interactions.filter((i: Interaction) => i.type === 'user_input').length;
      const aiResponses = task.interactions.filter((i: Interaction) => i.type === 'ai_response');
      const passedAttempts = aiResponses.filter((i: Interaction) => {
        try {
          const content = typeof i.content === 'string' ? JSON.parse(i.content) : i.content;
          return content.completed === true;
        } catch {
          return false;
        }
      }).length;
      const allFeedback = task.interactions.filter((i: Interaction) => i.type === 'ai_response').map((i: Interaction) => {
        try {
          return JSON.parse(String(i.content)) as { xpEarned?: number; skillsImproved?: string[]; feedback?: string; completed?: boolean };
        } catch {
          return { xpEarned: 0, skillsImproved: [] };
        }
      });
      const bestXP = Math.max(...allFeedback.map(f => f.xpEarned || 0), (task.content as Record<string, unknown>)?.xp as number || 100);
      
      let comprehensiveFeedback = 'Successfully regenerated task evaluation!';
      let userLanguage = 'en'; // Default language
      
      try {
        // Same logic as in confirm-complete for generating comprehensive feedback
        const learningJourney = task.interactions.map((interaction, index) => {
          if (interaction.type === 'user_input') {
            return {
              type: 'user_response',
              attempt: Math.floor(index / 2) + 1,
              content: interaction.content,
              timeSpent: (interaction.metadata as { timeSpent?: number })?.timeSpent || 0
            };
          } else if (interaction.type === 'ai_response') {
            let parsed: { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
            try {
              parsed = typeof interaction.content === 'string' 
                ? JSON.parse(interaction.content)
                : interaction.content as { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
            } catch {
              parsed = { completed: false, feedback: '', strengths: [], improvements: [], xpEarned: 0 };
            }
            return {
              type: 'ai_feedback',
              attempt: Math.floor(index / 2) + 1,
              passed: parsed.completed || false,
              feedback: parsed.feedback || '',
              strengths: parsed.strengths || [],
              improvements: parsed.improvements || [],
              xpEarned: parsed.xpEarned || 0
            };
          }
          return null;
        }).filter(Boolean);
        
        const scenarioRepo = repositoryFactory.getScenarioRepository();
        const scenario = await scenarioRepo.findById(program.scenarioId);
        const careerType = (scenario?.metadata?.careerType || 'unknown') as string;
        const language = (program.metadata?.language || 'en') as string;
        const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
        userLanguage = (acceptLanguage || language) as string;
        
        // Debug log language detection for regenerate-evaluation
        console.log('=== REGENERATE: LANGUAGE DETECTION DEBUG ===');
        console.log('1. Raw headers:', {
          acceptLanguage: request.headers.get('accept-language'),
          allHeaders: Object.fromEntries(request.headers.entries())
        });
        console.log('2. Language processing (regenerate):', {
          rawAcceptLanguage: acceptLanguage,
          programLanguage: language,
          beforeProcessing: acceptLanguage || language,
          afterProcessing: userLanguage
        });
        console.log('==========================================');
        
        let yamlData = null;
        if (careerType !== 'unknown') {
          const loader = new DiscoveryYAMLLoader();
          yamlData = await loader.loadPath(careerType, language);
        }
        
        // Extract title as string
        const taskTitleStr = (() => {
          const titleObj = task.title;
          if (typeof titleObj === 'string') {
            return titleObj;
          } else if (typeof titleObj === 'object' && titleObj !== null) {
            return (titleObj as Record<string, string>)[language] || (titleObj as Record<string, string>)['en'] || '';
          }
          return '';
        })();
        
        const comprehensivePrompt = generateComprehensiveFeedbackPrompt(
          userLanguage,
          careerType,
          taskTitleStr,
          (task.metadata as Record<string, unknown>)?.instructions as string || '',
          task.content || {},
          yamlData,
          learningJourney
        );
        
        // Debug log for regenerate-evaluation
        console.log('=== REGENERATE EVALUATION DEBUG ===');
        console.log('Language for regeneration:', userLanguage);
        console.log('Full prompt:');
        console.log(comprehensivePrompt);
        console.log('==================================');
        
        const aiService = new VertexAIService({
          systemPrompt: getSystemPromptForLanguage(userLanguage),
          temperature: 0.8,
          model: 'gemini-2.5-flash'
        });
        
        const aiResponse = await aiService.sendMessage(comprehensivePrompt);
        comprehensiveFeedback = aiResponse.content;
        
        // Debug log AI response (regenerate-evaluation)
        console.log('=== AI RESPONSE DEBUG (REGENERATE) ===');
        console.log('AI response received:');
        console.log(comprehensiveFeedback);
        console.log('Response length:', comprehensiveFeedback.length);
        console.log('=====================================');
        
        if (userAttempts > 1) {
          const statsSection = getStatsSection(userLanguage, userAttempts, passedAttempts, bestXP);
          comprehensiveFeedback += statsSection;
          
          const allSkills = new Set<string>();
          allFeedback.forEach(f => {
            if (f.skillsImproved) {
              f.skillsImproved.forEach((skill: string) => allSkills.add(skill));
            }
          });
          
          if (allSkills.size > 0) {
            const skillsSection = getSkillsSection(userLanguage, Array.from(allSkills));
            comprehensiveFeedback += skillsSection;
          }
        }
      } catch (error) {
        console.error('Error regenerating comprehensive feedback:', error);
        comprehensiveFeedback = 'Failed to regenerate feedback. Please try again.';
      }
      
      // Update the existing evaluation
      const evaluationId = (task.metadata?.evaluationId as string) || (task.metadata?.evaluation as { id?: string })?.id;
      
      if (evaluationId) {
        
        // Get the pool directly to update evaluation
        const { getPool } = await import('@/lib/db/get-pool');
        const pool = getPool();
        
        // Update evaluation with new feedback
        await pool.query(
          `UPDATE evaluations 
           SET feedback_text = $1,
               feedback_data = feedback_data || $2::jsonb,
               metadata = metadata || $3::jsonb
           WHERE id = $4`,
          [
            comprehensiveFeedback,
            JSON.stringify({ [userLanguage]: comprehensiveFeedback }),
            JSON.stringify({
              regeneratedAt: new Date().toISOString(),
              actualPassedAttempts: passedAttempts,
              regeneratedBy: 'api'
            }),
            evaluationId
          ]
        );
        
        console.log('Successfully updated evaluation:', evaluationId);
        
        // Also update task metadata with new feedback for quick access
        await taskRepo.update?.(taskId, {
          metadata: {
            ...task.metadata,
            evaluation: {
              ...(task.metadata?.evaluation as Record<string, unknown> || {}),
              feedback: comprehensiveFeedback,
              feedbackVersions: {
                ...((task.metadata?.evaluation as { feedbackVersions?: Record<string, string> })?.feedbackVersions || {}),
                [userLanguage]: comprehensiveFeedback
              },
              lastRegeneratedAt: new Date().toISOString()
            }
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        evaluation: {
          id: task.metadata?.evaluationId as string,
          score: bestXP,
          feedback: comprehensiveFeedback,
          regenerated: true
        }
      });
    } else if (action === 'start') {
      // Mark task as active
      await taskRepo.updateStatus?.(taskId, 'active');
      
      return NextResponse.json({
        success: true,
        status: 'active'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in PATCH task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}