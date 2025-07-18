import { NextRequest, NextResponse } from 'next/server';
import { 
  getProgramRepository,
  getEvaluationRepository
} from '@/lib/implementations/gcs-v2';
import { getServerSession } from '@/lib/auth/session';
import { TranslationService } from '@/lib/services/translation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { programId } = await params;
    const { targetLanguage } = await request.json();
    
    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language required' }, { status: 400 });
    }
    
    const programRepo = getProgramRepository();
    const evaluationRepo = getEvaluationRepository();
    
    // Get program
    const program = await programRepo.findById(programId);
    if (!program || program.userId !== session.user.email) {
      return NextResponse.json(
        { error: 'Program not found or access denied' },
        { status: 404 }
      );
    }
    
    // Find evaluation
    const evaluations = await evaluationRepo.findByTarget('program', programId);
    const evaluation = evaluations.find(e => e.evaluationType === 'discovery_complete');
    
    if (!evaluation || !evaluation.metadata?.qualitativeFeedback) {
      return NextResponse.json(
        { error: 'No feedback to translate' },
        { status: 404 }
      );
    }
    
    const currentFeedback = evaluation.metadata.qualitativeFeedback;
    const feedbackVersions = evaluation.metadata.qualitativeFeedbackVersions || {};
    const careerType = evaluation.metadata.careerType || 'general';
    
    // Check if translation already exists
    if (feedbackVersions[targetLanguage]) {
      return NextResponse.json({
        translatedFeedback: feedbackVersions[targetLanguage],
        cached: true
      });
    }
    
    // Translate feedback
    try {
      const translationService = new TranslationService();
      
      const translatedFeedback = {
        overallAssessment: await translationService.translateFeedback(
          currentFeedback.overallAssessment, targetLanguage, careerType
        ),
        careerAlignment: await translationService.translateFeedback(
          currentFeedback.careerAlignment, targetLanguage, careerType
        ),
        strengths: await Promise.all(
          (currentFeedback.strengths || []).map((s: string) => 
            translationService.translateFeedback(s, targetLanguage, careerType)
          )
        ),
        growthAreas: await Promise.all(
          (currentFeedback.growthAreas || []).map((g: string) => 
            translationService.translateFeedback(g, targetLanguage, careerType)
          )
        ),
        nextSteps: await Promise.all(
          (currentFeedback.nextSteps || []).map((n: string) => 
            translationService.translateFeedback(n, targetLanguage, careerType)
          )
        )
      };
      
      // Update evaluation with new translation
      const updatedVersions = {
        ...feedbackVersions,
        [targetLanguage]: translatedFeedback
      };
      
      await evaluationRepo.update(evaluation.id, {
        metadata: {
          ...evaluation.metadata,
          qualitativeFeedbackVersions: updatedVersions
        }
      });
      
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