import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth';
import { TranslationService } from '@/lib/services/translation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }
    
    const { programId } = await params;
    const { targetLanguage } = await request.json();
    
    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language required' }, { status: 400 });
    }
    
    const programRepo = repositoryFactory.getProgramRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.email) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Find evaluation
    const evaluations = await evaluationRepo.findByProgram(programId);
    const evaluation = evaluations.find(e => e.evaluationType === 'discovery_complete');
    
    if (!evaluation || !evaluation.metadata?.qualitativeFeedback) {
      return NextResponse.json(
        { error: 'No feedback to translate' },
        { status: 404 }
      );
    }
    
    const currentFeedback = evaluation.metadata.qualitativeFeedback as Record<string, unknown>;
    const feedbackVersions = (evaluation.metadata.qualitativeFeedbackVersions || {}) as Record<string, unknown>;
    const careerType = (evaluation.metadata.careerType as string) || 'general';
    
    // Check if translation already exists
    if (feedbackVersions[targetLanguage as string]) {
      return NextResponse.json({
        translatedFeedback: feedbackVersions[targetLanguage as string],
        cached: true
      });
    }
    
    // Translate feedback
    try {
      const translationService = new TranslationService();
      
      const translatedFeedback = {
        overallAssessment: await translationService.translateFeedback(
          currentFeedback.overallAssessment as string, targetLanguage, careerType
        ),
        careerAlignment: await translationService.translateFeedback(
          currentFeedback.careerAlignment as string, targetLanguage, careerType
        ),
        strengths: await Promise.all(
          ((currentFeedback.strengths as string[]) || []).map((s: string) => 
            translationService.translateFeedback(s, targetLanguage, careerType)
          )
        ),
        growthAreas: await Promise.all(
          ((currentFeedback.growthAreas as string[]) || []).map((g: string) => 
            translationService.translateFeedback(g, targetLanguage, careerType)
          )
        ),
        nextSteps: await Promise.all(
          ((currentFeedback.nextSteps as string[]) || []).map((n: string) => 
            translationService.translateFeedback(n, targetLanguage, careerType)
          )
        )
      };
      
      // Update evaluation with new translation
      // Store updated versions for future use (when update method is available)
      // const updatedVersions = {
      //   ...feedbackVersions,
      //   [targetLanguage]: translatedFeedback
      // };
      
      // Note: Evaluation repository doesn't have an update method
      // In a real implementation, you might want to create a new evaluation
      // or implement an update method in the repository
      console.log('Translation complete. Note: Update method not available in evaluation repository');
      
      return NextResponse.json({
        translatedFeedback,
        cached: false
      });
    } catch (error) {
      console.error('Translation error:', error);
      return NextResponse.json(
        { error: 'Failed to translate feedback' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in translate-feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}