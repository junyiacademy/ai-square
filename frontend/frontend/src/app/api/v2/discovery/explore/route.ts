import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, query, history, language } = body;

    // TODO: Integrate with actual AI service
    // For now, return a mock response
    const response = {
      message: generateDiscoveryResponse(query, language),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Discovery explore error:', error);
    return NextResponse.json(
      { error: 'Failed to process exploration' },
      { status: 500 }
    );
  }
}

function generateDiscoveryResponse(query: string, language: string): string {
  const responses: Record<string, string[]> = {
    en: [
      "That's a fascinating area to explore! Here's what I found...",
      "Great discovery question! Let me share some insights...",
      "Interesting exploration! Consider these aspects...",
    ],
    zh: [
      "這是一個令人著迷的探索領域！這是我的發現...",
      "很好的探索問題！讓我分享一些見解...",
      "有趣的探索！考慮這些方面...",
    ],
    es: [
      "¡Es un área fascinante para explorar! Esto es lo que encontré...",
      "¡Gran pregunta de descubrimiento! Déjame compartir algunas ideas...",
      "¡Exploración interesante! Considera estos aspectos...",
    ],
  };

  const langResponses = responses[language] || responses.en;
  return langResponses[Math.floor(Math.random() * langResponses.length)];
}