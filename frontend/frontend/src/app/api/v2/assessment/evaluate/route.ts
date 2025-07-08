import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, answer, language } = body;

    // TODO: Integrate with actual assessment service
    // For now, return a mock evaluation based on the demo data
    const isCorrect = answer === 'option_b'; // Demo correct answer
    
    const evaluation = {
      correct: isCorrect,
      feedback: generateFeedback(isCorrect, language),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Assessment evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate assessment' },
      { status: 500 }
    );
  }
}

function generateFeedback(correct: boolean, language: string): string {
  const feedback: Record<string, { correct: string; incorrect: string }> = {
    en: {
      correct: "Correct! Machine learning is indeed a method where computers learn from data without explicit programming.",
      incorrect: "Not quite. Machine learning specifically refers to computers learning from data patterns without being explicitly programmed for each task.",
    },
    zh: {
      correct: "正確！機器學習確實是計算機無需明確編程就能從數據中學習的方法。",
      incorrect: "不太對。機器學習特指計算機從數據模式中學習，而無需為每個任務進行明確編程。",
    },
    es: {
      correct: "¡Correcto! El aprendizaje automático es efectivamente un método donde las computadoras aprenden de los datos sin programación explícita.",
      incorrect: "No exactamente. El aprendizaje automático se refiere específicamente a las computadoras aprendiendo de patrones de datos sin ser programadas explícitamente para cada tarea.",
    },
  };

  const langFeedback = feedback[language] || feedback.en;
  return correct ? langFeedback.correct : langFeedback.incorrect;
}