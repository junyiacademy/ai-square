import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, messages, language } = body;

    // TODO: Integrate with actual AI evaluation service
    // For now, return a mock evaluation
    const evaluation = {
      score: Math.floor(Math.random() * 20) + 80, // 80-100
      feedback: generateFeedback(language),
      strengths: generateStrengths(language),
      improvements: generateImprovements(language),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('PBL evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate task' },
      { status: 500 }
    );
  }
}

function generateFeedback(language: string): string {
  const feedback: Record<string, string> = {
    en: "You demonstrated a good understanding of the AI ethics concepts and provided thoughtful solutions.",
    zh: "您展示了對AI倫理概念的良好理解，並提供了深思熟慮的解決方案。",
    es: "Demostraste una buena comprensión de los conceptos de ética en IA y proporcionaste soluciones reflexivas.",
  };
  return feedback[language] || feedback.en;
}

function generateStrengths(language: string): string[] {
  const strengths: Record<string, string[]> = {
    en: ["Clear communication", "Critical thinking", "Ethical awareness"],
    zh: ["清晰的溝通", "批判性思維", "倫理意識"],
    es: ["Comunicación clara", "Pensamiento crítico", "Conciencia ética"],
  };
  return strengths[language] || strengths.en;
}

function generateImprovements(language: string): string[] {
  const improvements: Record<string, string[]> = {
    en: ["Consider more stakeholder perspectives", "Explore long-term implications"],
    zh: ["考慮更多利益相關者的觀點", "探索長期影響"],
    es: ["Considera más perspectivas de las partes interesadas", "Explora las implicaciones a largo plazo"],
  };
  return improvements[language] || improvements.en;
}