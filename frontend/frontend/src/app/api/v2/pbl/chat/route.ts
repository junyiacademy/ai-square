import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, message, history, language } = body;

    // TODO: Integrate with actual AI service
    // For now, return a mock response
    const response = {
      message: generatePBLResponse(message, language),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('PBL chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

function generatePBLResponse(message: string, language: string): string {
  // Mock responses based on language
  const responses: Record<string, string[]> = {
    en: [
      "That's an interesting perspective. Let me help you think through this problem.",
      "Good question! Consider the following aspects...",
      "Let's analyze this step by step.",
    ],
    zh: [
      "這是一個有趣的觀點。讓我幫助您思考這個問題。",
      "好問題！請考慮以下幾個方面...",
      "讓我們一步一步地分析。",
    ],
    es: [
      "Esa es una perspectiva interesante. Déjame ayudarte a pensar en este problema.",
      "¡Buena pregunta! Considera los siguientes aspectos...",
      "Analicemos esto paso a paso.",
    ],
  };

  const langResponses = responses[language] || responses.en;
  return langResponses[Math.floor(Math.random() * langResponses.length)];
}