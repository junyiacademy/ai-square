import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { ITask } from '@/types/unified-learning';
import { VertexAIService } from '@/lib/ai/vertex-ai-service';
import { DiscoveryYAMLLoader } from '@/lib/services/discovery-yaml-loader';
import { TranslationService } from '@/lib/services/translation-service';
import { Interaction } from '@/lib/repositories/interfaces';

// System prompt for AI - keep in English as it's for the AI model
function getSystemPromptForLanguage({}: { language: string }): string {
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

function getFallbackMessage({}: { language: string }): string {
  // For now, use simple message - will be replaced with i18n
  return 'Congratulations on successfully completing this task! Your effort and persistence are commendable.';
}

// GET a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programId, taskId } = await params;
    const userEmail = session.user.email;
    
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
    if (!program || program.userId !== userEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get task with interactions
    const taskWithInteractions = await taskRepo.getTaskWithInteractions(taskId);
    if (!taskWithInteractions || taskWithInteractions.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskWithInteractions;
    
    // Load scenario for career info
    const scenario = await scenarioRepo.findById(program.scenarioId);
    
    // Handle multilingual evaluation if task is completed
    let processedEvaluation = null;
    const evaluationId = (task.metadata?.evaluationId as string) || null;
    
    if (evaluationId && task.status === 'completed') {
      // Get full evaluation record
      const fullEvaluation = await evaluationRepo.findById(evaluationId);
      
      if (fullEvaluation) {
        const existingVersions = (fullEvaluation.metadata?.feedbackVersions || {}) as Record<string, string>;
        
        // Debug log existing versions
        console.log('=== EVALUATION VERSIONS DEBUG ===');
        console.log('Requested language:', requestedLanguage);
        console.log('Existing versions:', Object.keys(existingVersions));
        console.log('Full evaluation feedback:', fullEvaluation.feedback?.substring(0, 100) + '...');
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
            } else if (fullEvaluation.feedback) {
              // Use default feedback (might be in another language)
              sourceFeedback = fullEvaluation.feedback;
              sourceLanguage = 'en'; // Assume default is English unless we track source language
            } else {
              throw new Error('No source feedback available for translation');
            }
            
            console.log(`Translating evaluation from ${sourceLanguage} to ${requestedLanguage}`);
            console.log('Source feedback preview:', sourceFeedback.substring(0, 100) + '...');
            
            const translationService = new TranslationService();
            const careerType = (scenario?.metadata?.careerType || 'general') as string;
            
            // Special handling: if requesting English and source is English, no translation needed
            if (requestedLanguage === 'en' && sourceLanguage === 'en') {
              processedEvaluation = {
                id: fullEvaluation.id,
                score: fullEvaluation.score,
                feedback: sourceFeedback,
                feedbackVersions: { ...existingVersions, 'en': sourceFeedback },
                evaluatedAt: fullEvaluation.createdAt.toISOString()
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
              await taskRepo.update(taskId, {
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
                evaluatedAt: fullEvaluation.createdAt.toISOString()
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
                evaluatedAt: fullEvaluation.createdAt.toISOString()
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
              evaluatedAt: fullEvaluation.createdAt.toISOString()
            };
          }
        }
      }
    }
    
    // Return task data
    return NextResponse.json({
      id: task.id,
      title: task.title,
      type: task.type,
      status: task.status,
      context: task.content,
      interactions: task.interactions,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      evaluation: processedEvaluation,
      // Add career info
      careerType: (scenario?.metadata?.careerType || 'unknown') as string,
      scenarioTitle: scenario?.title || 'Discovery Scenario'
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
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programId, taskId } = await params;
    const userEmail = session.user.email;
    
    const body = await request.json();
    const { action, content } = body;
    
    // Get repositories
    const programRepo = repositoryFactory.getProgramRepository();
    const taskRepo = repositoryFactory.getTaskRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Verify program ownership
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== userEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get task with interactions
    const taskWithInteractions = await taskRepo.getTaskWithInteractions(taskId);
    if (!taskWithInteractions || taskWithInteractions.programId !== programId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskWithInteractions;
    
    if (action === 'submit') {
      // Add user response as interaction
      // Record user attempt
      await taskRepo.recordAttempt(taskId, {
        response: content.response,
        timeSpent: content.timeSpent || 0
      });
      
      // Get repositories for scenario lookup
      const scenarioRepo = repositoryFactory.getScenarioRepository();
      
      // Get scenario for context
      const scenario = await scenarioRepo.findById(program.scenarioId);
      const careerType = (scenario?.metadata?.careerType || 'unknown') as string;
      const language = program.metadata?.language || 'en';
      
      // Get user's preferred language from request header
      const acceptLanguage = request.headers.get('accept-language')?.split(',')[0];
      const userLanguage = acceptLanguage || language;
      
      // Load YAML data for world setting context
      let yamlData = null;
      if (careerType !== 'unknown') {
        const loader = new DiscoveryYAMLLoader();
        yamlData = await loader.loadPath(careerType as string, language);
      }
      
      // Use AI to evaluate the response
      const aiService = new VertexAIService({
        systemPrompt: 'You are an AI learning evaluator in a discovery-based learning environment.',
        temperature: 0.7,
        model: 'gemini-2.5-flash'
      });
      
      // Prepare evaluation prompt
      const evaluationPrompt = `
You are an AI learning evaluator in a discovery-based learning environment.

Career Path: ${careerType}
Task Title: ${task.title}
Task Instructions: ${(task.metadata as Record<string, unknown>)?.instructions || ''}
Task Context: ${JSON.stringify(task.context || {})}
${yamlData && (yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting ? `World Setting: ${(yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting?.description || 'Unknown'}\nAtmosphere: ${(yamlData as { world_setting?: { description?: string; atmosphere?: string } }).world_setting?.atmosphere || 'Unknown'}` : ''}

Learner's Response:
${content.response}

Please evaluate this response considering:
1. Understanding of the task requirements
2. Depth of analysis or quality of creation
3. Creativity and original thinking
4. Practical application of concepts
5. Evidence of learning and growth

${userLanguage === 'zhTW' ? 
`請用繁體中文提供評估，包含：
- 詳細說明做得好的地方和需要改進的地方
- 任務是否圓滿完成
- 獲得的經驗值（0-${(task.context as Record<string, unknown>)?.xp as number || 100}）
- 展現或提升的技能

請以 JSON 格式返回評估結果：
{
  "feedback": "詳細的中文回饋",
  "strengths": ["優點1", "優點2"],
  "improvements": ["改進建議1", "改進建議2"],
  "completed": true/false,
  "xpEarned": number (0-${(task.context as Record<string, unknown>)?.xp as number || 100}),
  "skillsImproved": ["技能1（例如：創意思考）", "技能2（例如：市場分析）"]
}
請確保所有內容都是繁體中文，包括技能名稱。` : 
`Provide your evaluation in English with:
- Detailed feedback explaining what was done well and areas for improvement
- Whether the task is completed satisfactorily
- XP points earned (0-${(task.context as Record<string, unknown>)?.xp as number || 100})
- Skills that were demonstrated or improved

Return your evaluation as a JSON object:
{
  "feedback": "Detailed feedback in English",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement area 1", "Improvement area 2"],
  "completed": true/false,
  "xpEarned": number (0-${(task.context as Record<string, unknown>)?.xp as number || 100}),
  "skillsImproved": ["Skill 1", "Skill 2"]
}`}`;

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
            xpEarned: (task.context as Record<string, unknown>)?.xp as number || 100,
            strengths: [],
            improvements: [],
            skillsImproved: []
          };
        }
        
        // Record AI evaluation as metadata (not a user attempt)
        // We'll store this in task metadata instead
        await taskRepo.update(taskId, {
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
          timestamp: r.createdAt.toISOString(),
          completed: (r.metadata as { completed?: boolean })?.completed,
          content: r.content
        }))
      });
      
      const passedAttempts = aiResponses.filter((i: Interaction) => {
        try {
          const parsed = JSON.parse(i.content) as { completed?: boolean };
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
        (task.context as Record<string, unknown>)?.xp as number || 100
      );
      
      // Generate comprehensive qualitative feedback using LLM based on full learning journey
      let comprehensiveFeedback = 'Task completed successfully!';
      let userLanguage = 'en'; // Default language
      let careerType = 'unknown'; // Default career type
      
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
            const parsed = JSON.parse(interaction.content) as { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
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
        const language = program.metadata?.language || 'en';
        
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
          yamlData = await loader.loadPath(careerType as string, language);
        }
        
        // Generate multilingual comprehensive qualitative feedback
        const comprehensivePrompt = generateComprehensiveFeedbackPrompt(
          userLanguage,
          careerType,
          task.title || '',
          (task.metadata as Record<string, unknown>)?.instructions as string || '',
          task.context || {},
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
          systemPrompt: getSystemPromptForLanguage({ language: userLanguage }),
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
              const parsed = JSON.parse(i.content) as { completed?: boolean };
              return parsed.completed === true;
            } catch {
              return false;
            }
          })
          .slice(-1)[0];
        
        if (lastSuccessfulInteraction) {
          try {
            const parsed = JSON.parse(lastSuccessfulInteraction.content) as { feedback?: string };
            comprehensiveFeedback = parsed.feedback || getFallbackMessage({ language: userLanguage });
          } catch {
            comprehensiveFeedback = getFallbackMessage({ language: userLanguage });
          }
        } else {
          comprehensiveFeedback = getFallbackMessage({ language: userLanguage });
        }
        
        if (userAttempts > 1) {
          const statsSection = getStatsSection(userLanguage, userAttempts, passedAttempts, bestXP);
          comprehensiveFeedback += statsSection;
        }
      }
      
      // Collect all skills improved across attempts
      const allSkillsImproved = new Set<string>();
      allFeedback.forEach(f => {
        const fRecord = f as Record<string, unknown>;
        if (fRecord.skillsImproved && Array.isArray(fRecord.skillsImproved)) {
          fRecord.skillsImproved.forEach((skill: unknown) => {
            if (typeof skill === 'string') {
              allSkillsImproved.add(skill);
            }
          });
        }
      });
      
      // Prepare multilingual feedback versions
      // Always store English version first, then current language if different
      const feedbackVersions: Record<string, string> = {};
      
      if (userLanguage === 'en') {
        // Generated feedback is already in English
        feedbackVersions['en'] = comprehensiveFeedback;
      } else {
        // Generated feedback is in user's language, need English version
        try {
          console.log('Generating English version for storage...');
          const translationService = new TranslationService();
          const englishFeedback = await translationService.translateFeedback(
            comprehensiveFeedback,
            'en',
            careerType
          );
          feedbackVersions['en'] = englishFeedback;
          feedbackVersions[userLanguage] = comprehensiveFeedback;
        } catch (error) {
          console.error('Failed to generate English version:', error);
          // Fallback: store current feedback as English
          feedbackVersions['en'] = comprehensiveFeedback;
        }
      }
      
      // Create formal evaluation record with multilingual support
      const evaluation = await evaluationRepo.create({
        userId: session.user.email,
        taskId: taskId,
        evaluationType: 'discovery_task',
        score: bestXP,
        maxScore: 100,
        timeTakenSeconds: 0,
        feedback: feedbackVersions['en'], // Default to English
        metadata: {
          feedbackVersions: feedbackVersions,
          dimensions: [],
          completed: true,
          xpEarned: bestXP,
          totalAttempts: userAttempts,
          passedAttempts: passedAttempts,
          skillsImproved: Array.from(allSkillsImproved),
          learningJourney: allFeedback,
          originalLanguage: userLanguage
        }
      });
      
      // Mark task as completed and save evaluation ID
      await taskRepo.update(taskId, {
        status: 'completed' as const,
        completedAt: new Date(),
        metadata: {
          ...(task.metadata || {}),
          evaluation: {
            id: evaluation.id,
            score: evaluation.score,
            feedback: feedbackVersions[userLanguage] || evaluation.feedback, // Return in user's language
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
      
      // Get tasks in the correct order based on program.taskIds
      const orderedTasks = program.taskIds
        .map(id => taskMap.get(id))
        .filter(Boolean) as unknown as ITask[];
      
      const completedTasks = orderedTasks.filter(t => t.status === 'completed').length;
      const nextTaskIndex = completedTasks;
      
      // Activate next task if available
      let nextTaskId = null;
      if (nextTaskIndex < orderedTasks.length) {
        const nextTask = orderedTasks[nextTaskIndex];
        await taskRepo.updateStatus(nextTask.id, 'active');
        nextTaskId = nextTask.id;
      }
      
      // Update program current task index and currentTaskId
      // Update program current task index
      await programRepo.update(programId, { currentTaskIndex: nextTaskIndex });
      
      // Update currentTaskId in metadata
      await programRepo.update(programId, {
        metadata: {
          ...program.metadata,
          currentTaskId: nextTaskId,
          currentTaskIndex: nextTaskIndex,
          totalXP: currentXP + bestXP
        }
      });
      
      // If all tasks completed, complete the program
      if (completedTasks === orderedTasks.length) {
        await programRepo.update(programId, { status: "completed" });
        
        // Create program completion evaluation
        await evaluationRepo.create({
          userId: session.user.email,
          programId: programId,
          evaluationType: 'discovery_completion',
          score: 100,
          maxScore: 100,
          timeTakenSeconds: 0,
          feedback: 'Congratulations! You have completed all learning tasks in this program.',
          metadata: {
            dimensions: [],
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
      const passedAttempts = aiResponses.filter((i: Interaction) => ((i.metadata as { completed?: boolean }) || {}).completed === true).length;
      const allFeedback = task.interactions.filter((i: Interaction) => i.type === 'ai_response').map((i: Interaction) => {
        try {
          return JSON.parse(i.content) as { xpEarned?: number; skillsImproved?: string[]; feedback?: string; completed?: boolean };
        } catch {
          return { xpEarned: 0, skillsImproved: [] };
        }
      });
      const bestXP = Math.max(...allFeedback.map(f => f.xpEarned || 0), (task.context as Record<string, unknown>)?.xp as number || 100);
      
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
            const parsed = JSON.parse(interaction.content) as { completed?: boolean; feedback?: string; strengths?: string[]; improvements?: string[]; xpEarned?: number };
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
        const language = program.metadata?.language || 'en';
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
          yamlData = await loader.loadPath(careerType as string, language);
        }
        
        const comprehensivePrompt = generateComprehensiveFeedbackPrompt(
          userLanguage,
          careerType,
          task.title || '',
          (task.metadata as Record<string, unknown>)?.instructions as string || '',
          task.context || {},
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
          systemPrompt: getSystemPromptForLanguage({ language: userLanguage }),
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
      if (task.metadata?.evaluationId) {
        const evaluationRepo = repositoryFactory.getEvaluationRepository();
        // Note: evaluationRepo doesn't have update method
        console.log('Would update evaluation:', task.metadata.evaluationId, {
          feedback: comprehensiveFeedback,
          metadata: {
            completed: true,
            xpEarned: bestXP,
            totalAttempts: userAttempts,
            passedAttempts: passedAttempts,
            regeneratedAt: new Date().toISOString()
          }
        });
        
        // Update task metadata with new feedback
        await taskRepo.update(taskId, {
          metadata: {
            ...task.metadata,
            lastRegeneratedFeedback: comprehensiveFeedback,
            lastRegeneratedAt: new Date().toISOString()
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
      await taskRepo.updateStatus(taskId, 'active');
      
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