import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { getLanguageFromHeader, LANGUAGE_NAMES } from '@/lib/utils/language';
import { VertexAI } from '@google-cloud/vertexai';

// POST - Translate existing evaluation to current language
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user session
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const { taskId } = await params;

    // Get current language from request
    const currentLang = getLanguageFromHeader(request);
    const targetLanguage = LANGUAGE_NAMES[currentLang as keyof typeof LANGUAGE_NAMES] || LANGUAGE_NAMES['en'];

    // Use unified architecture
    const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
    const taskRepo = repositoryFactory.getTaskRepository();
    const evalRepo = repositoryFactory.getEvaluationRepository();
    const userRepo = repositoryFactory.getUserRepository();

    // Get user by email to get UUID
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get task to check if it has evaluationId
    const task = await taskRepo.findById(taskId);

    let evaluation = null;
    const evaluationId = task?.metadata?.evaluationId as string | undefined;
    if (evaluationId) {
      evaluation = await evalRepo.findById(evaluationId);
    } else {
      // Fallback: search by task
      const evaluations = await evalRepo.findByTask(taskId);
      evaluation = evaluations[0] || null;
    }

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'No evaluation found to translate' },
        { status: 404 }
      );
    }

    // Check if already in target language
    const evaluationLang = evaluation.metadata?.language as string || 'en';
    if (evaluationLang === currentLang) {
      return NextResponse.json({
        success: true,
        message: 'Evaluation already in requested language',
        data: {
          evaluation: {
            strengths: evaluation.feedbackData?.strengths || [],
            improvements: evaluation.feedbackData?.improvements || [],
            nextSteps: evaluation.feedbackData?.nextSteps || [],
            conversationInsights: evaluation.aiAnalysis || {},
            language: currentLang
          }
        }
      });
    }

    console.log(`Translating evaluation from ${evaluationLang} to ${currentLang}`);

    try {
      // Initialize Vertex AI for translation
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });

      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `You are a professional translator specializing in educational content.
Translate the evaluation feedback to ${targetLanguage}.
Maintain the exact meaning, tone, and educational value.
Output ONLY the JSON structure, no explanations.`,
      });

      const contentToTranslate = {
        strengths: evaluation.feedbackData?.strengths || [],
        improvements: evaluation.feedbackData?.improvements || [],
        nextSteps: evaluation.feedbackData?.nextSteps || [],
        conversationInsights: evaluation.aiAnalysis || {}
      };

      const prompt = `Translate all text to ${targetLanguage}:
${JSON.stringify(contentToTranslate, null, 2)}

Return the same JSON structure with all text translated.`;

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3, // Low temperature for consistent translation
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });

      const response = result.response;
      const translatedText = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const translatedContent = JSON.parse(translatedText);

      // Update evaluation with translated content (OVERWRITE)
      await evalRepo.update?.(evaluation.id, {
        feedbackData: {
          strengths: translatedContent.strengths || [],
          improvements: translatedContent.improvements || [],
          nextSteps: translatedContent.nextSteps || []
        },
        aiAnalysis: translatedContent.conversationInsights || {},
        metadata: {
          ...evaluation.metadata,
          language: currentLang, // Update language
          translatedFrom: evaluationLang,
          translatedAt: new Date().toISOString()
        }
      });

      console.log(`Translation completed and saved for ${currentLang}`);

      return NextResponse.json({
        success: true,
        message: 'Evaluation translated successfully',
        data: {
          evaluation: {
            strengths: translatedContent.strengths || [],
            improvements: translatedContent.improvements || [],
            nextSteps: translatedContent.nextSteps || [],
            conversationInsights: translatedContent.conversationInsights || {},
            language: currentLang
          }
        }
      });

    } catch (error) {
      console.error('Translation failed:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to translate evaluation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in translate endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process translation request' },
      { status: 500 }
    );
  }
}
