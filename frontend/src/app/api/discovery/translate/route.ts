/**
 * Discovery Translation API - Using Vertex AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

// Supported languages
const SUPPORTED_LOCALES: Record<string, string> = {
  'zh-TW': '繁體中文',
  'en': 'English',
  'es': 'Español',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'ru': 'Русский',
  'it': 'Italiano',
  'zhCN': '简体中文',
  'pt': 'Português',
  'ar': 'العربية',
  'id': 'Bahasa Indonesia',
  'th': 'ไทย'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, sourceLocale, targetLocale, fields } = body;

    // Validate locales
    if (!SUPPORTED_LOCALES[sourceLocale] || !SUPPORTED_LOCALES[targetLocale]) {
      return NextResponse.json(
        { error: 'Unsupported locale' },
        { status: 400 }
      );
    }

    // If same locale, return original
    if (sourceLocale === targetLocale) {
      return NextResponse.json({ translatedContent: content });
    }

    // Build translation prompt
    const prompt = buildTranslationPrompt(
      content,
      sourceLocale,
      targetLocale,
      fields
    );

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
      location: process.env.VERTEX_AI_LOCATION || 'asia-east1',
    });

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    // Call Vertex AI
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more accurate translations
        maxOutputTokens: 2048,
      },
    });

    const response = result.response;
    const translatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translatedText) {
      throw new Error('No translation generated');
    }

    // Parse the JSON response
    let translatedContent;
    try {
      // Clean the generated text to remove markdown code blocks
      let cleanedText = translatedText.trim();
      
      // Remove markdown code block markers if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      translatedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse translation response:', translatedText);
      console.error('Parse error:', parseError);
      // Return original content if parsing fails
      return NextResponse.json({ translatedContent: content });
    }

    return NextResponse.json({ translatedContent });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildTranslationPrompt(
  context: Record<string, unknown>,
  sourceLocale: string,
  targetLocale: string,
  fields?: string[]
): string {
  const sourceLanguage = SUPPORTED_LOCALES[sourceLocale];
  const targetLanguage = SUPPORTED_LOCALES[targetLocale];
  
  // Filter content to only specified fields if provided
  const contentToTranslate = fields 
    ? Object.fromEntries(
        Object.entries(context).filter(([key]) => fields.includes(key))
      )
    : context;

  return `你是一個專業的翻譯員，專門翻譯教育和職涯發展相關的內容。

請將以下內容從 ${sourceLanguage} 翻譯成 ${targetLanguage}。
保持原始的 JSON 結構，只翻譯文字內容。
對於專有名詞和技術術語，請使用目標語言中最常用的表達方式。
如果是陣列，保持陣列格式並翻譯每個元素。

原始內容：
${JSON.stringify(contentToTranslate, null, 2)}

請以 JSON 格式返回翻譯結果，保持完全相同的結構。
重要：只返回 JSON，不要包含任何其他說明文字。`;
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'Discovery Translation API is running',
    supportedLocales: Object.keys(SUPPORTED_LOCALES)
  });
}