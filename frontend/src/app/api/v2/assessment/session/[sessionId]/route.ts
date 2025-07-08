import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
    // Get user email from session/auth (placeholder for now)
    const userEmail = 'demo@example.com'; // TODO: Get from auth
    
    const storageService = new AssessmentStorageService();
    
    // Get the assessment session
    const session = await storageService.getAssessmentSession(userEmail, sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Assessment session not found' },
        { status: 404 }
      );
    }
    
    // Load question details to provide full question data
    const yamlPath = path.join(process.cwd(), 'public', 'assessment_data', 'ai_literacy_questions.yaml');
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(yamlContent) as any;
    
    const questionsMap = new Map(data.questions.map((q: any) => [q.id, q]));
    
    // Build detailed questions array with user responses
    const questions = session.responses.map(response => {
      const question = questionsMap.get(response.questionId);
      if (!question) return null;
      
      return {
        id: response.questionId,
        question: question.question,
        options: question.options,
        correctAnswer: question.correct_answer,
        userAnswer: response.answer,
        isCorrect: response.answer === question.correct_answer,
        explanation: question.explanation,
        domain: question.domain,
        difficulty: question.difficulty,
        timeSpent: response.timeSpent,
        ksa: question.ksa_mapping || { knowledge: [], skills: [], attitudes: [] }
      };
    }).filter(q => q !== null);
    
    return NextResponse.json({
      session,
      questions
    });
  } catch (error) {
    console.error('Error fetching assessment session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment session' },
      { status: 500 }
    );
  }
}