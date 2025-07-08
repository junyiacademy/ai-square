import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, explorations, language } = body;

    // TODO: Integrate with actual AI service
    // For now, return a mock summary
    const summary = {
      summary: generateSummary(language),
      keyInsights: generateKeyInsights(language),
      learningOutcomes: generateLearningOutcomes(language),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Discovery summarize error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize exploration' },
      { status: 500 }
    );
  }
}

function generateSummary(language: string): string {
  const summaries: Record<string, string> = {
    en: "You explored various aspects of generative AI and showed excellent curiosity and critical thinking.",
    zh: "您探索了生成式AI的各個方面，展現了出色的好奇心和批判性思維。",
    es: "Exploraste varios aspectos de la IA generativa y mostraste excelente curiosidad y pensamiento crítico.",
  };
  return summaries[language] || summaries.en;
}

function generateKeyInsights(language: string): string[] {
  const insights: Record<string, string[]> = {
    en: ["Understood AI capabilities", "Identified limitations", "Made creative connections"],
    zh: ["理解了AI能力", "識別了限制", "建立了創造性聯繫"],
    es: ["Comprendió las capacidades de IA", "Identificó limitaciones", "Hizo conexiones creativas"],
  };
  return insights[language] || insights.en;
}

function generateLearningOutcomes(language: string): string[] {
  const outcomes: Record<string, string[]> = {
    en: ["Better understanding of generative AI", "Improved prompting skills"],
    zh: ["更好地理解生成式AI", "提高了提示技巧"],
    es: ["Mejor comprensión de la IA generativa", "Habilidades de indicaciones mejoradas"],
  };
  return outcomes[language] || outcomes.en;
}