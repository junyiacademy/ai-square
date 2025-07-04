/**
 * AI Path Generation API - Using Vertex AI to generate custom paths
 */

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { DiscoveryService } from '@/lib/services/discovery-service';
import type { SavedPathData } from '@/lib/services/user-data-service';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

const model = vertexAI.preview.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      assessmentResults,
      userPrompt,
      preferences,
      conversationHistory,
      locale = 'zh-TW',
      requestId
    } = body;

    // Build generation prompt
    const prompt = buildPathGenerationPrompt({
      assessmentResults,
      userPrompt,
      preferences,
      conversationHistory,
      locale
    });

    // Generate with Vertex AI
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    });

    const response = result.response;
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No content generated');
    }

    // Parse the generated content
    let generatedData;
    try {
      // Clean the generated text to remove markdown code blocks
      let cleanedText = generatedText.trim();
      
      // Remove markdown code block markers if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      generatedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse generated content:', generatedText);
      console.error('Parse error:', parseError);
      throw new Error('Invalid generation format');
    }

    // Generate initial tasks
    const initialTasks = await generateInitialTasks(generatedData, locale);

    // Create the complete path data
    const discoveryService = new DiscoveryService();
    const pathId = discoveryService.generatePathId();
    
    const generatedPath: SavedPathData = {
      id: pathId,
      assessmentId: requestId || `assessment_${Date.now()}`,
      pathData: {
        id: pathId,
        title: generatedData.title,
        subtitle: generatedData.subtitle,
        description: generatedData.description,
        category: generatedData.category || 'custom',
        skills: generatedData.skills || [],
        aiAssistants: generatedData.aiAssistants || [],
        tasks: initialTasks
      },
      matchPercentage: calculateMatchPercentage(assessmentResults, generatedData),
      isFavorite: false,
      isCustom: true,
      createdAt: new Date().toISOString(),
      sourceLanguage: locale,
      version: 1,
      generationContext: {
        userPrompt: userPrompt || '',
        conversationHistory,
        preferences
      },
      storyContext: {
        worldSetting: generatedData.worldSetting,
        protagonist: generatedData.protagonist,
        narrative: generatedData.narrative,
        theme: generatedData.theme
      },
      isPublic: false
    };

    // Save AI conversation
    if (conversationHistory && conversationHistory.length > 0) {
      const sessionId = `session_${Date.now()}`;
      discoveryService.saveAIConversation(sessionId, {
        sessionId,
        startedAt: new Date().toISOString(),
        messages: conversationHistory,
        context: { assessmentResults, preferences },
        result: 'generated_path'
      });
    }

    return NextResponse.json({
      success: true,
      path: generatedPath
    });
  } catch (error) {
    console.error('Path generation error:', error);
    return NextResponse.json(
      { 
        error: 'Generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function buildPathGenerationPrompt(params: {
  assessmentResults: any;
  userPrompt?: string;
  preferences?: any;
  conversationHistory?: any[];
  locale: string;
}): string {
  const { assessmentResults, userPrompt, preferences, locale } = params;
  
  const languageInstructions = locale === 'zh-TW' 
    ? '請使用繁體中文生成所有內容。'
    : locale === 'en'
    ? 'Please generate all content in English.'
    : `Please generate all content in the language for locale: ${locale}.`;

  return `你是一個創意十足的職涯冒險設計師。基於用戶的評估結果和偏好，創建一個獨特且引人入勝的職涯探索路徑。

用戶評估結果：
- 科技傾向：${assessmentResults.tech}%
- 創意傾向：${assessmentResults.creative}%
- 商業傾向：${assessmentResults.business}%

${userPrompt ? `用戶的特殊要求：${userPrompt}` : ''}
${preferences ? `額外偏好：${JSON.stringify(preferences)}` : ''}

請創建一個包含以下元素的職涯路徑：

1. **基本資訊**
   - title: 吸引人的職涯路徑名稱
   - subtitle: 簡短的副標題（說明這個路徑的特色）
   - description: 詳細描述（100-200字）
   - category: 主要類別（technology/creative/business/hybrid）
   - skills: 會學到的核心技能清單（5-8個）
   - aiAssistants: AI 助手角色清單（3-5個，例如：技術導師、創意顧問等）

2. **故事設定**
   - worldSetting: 獨特的世界觀設定（例如：未來科技城市、魔法創意學院、商業帝國等）
   - protagonist: 主角設定（包含 name、background、goals 等）
   - narrative: 主線故事簡介
   - theme: 故事主題（例如：成長、創新、領導力等）

3. **獨特賣點**
   - 結合用戶的興趣評估結果
   - 創造有趣的故事背景
   - 設計循序漸進的成長路線
   - 加入遊戲化元素

${languageInstructions}

請以 JSON 格式返回，確保所有欄位都有適當的內容。
重要：只返回 JSON 物件，不要包含任何其他說明文字或 markdown 標記。

範例格式：
{
  "title": "...",
  "subtitle": "...",
  "description": "...",
  "category": "...",
  "skills": ["...", "..."],
  "aiAssistants": ["...", "..."],
  "worldSetting": "...",
  "protagonist": {
    "name": "...",
    "background": "...",
    "goals": ["...", "..."]
  },
  "narrative": "...",
  "theme": "..."
}`;
}

async function generateInitialTasks(pathData: any, locale: string): Promise<any[]> {
  // Generate 3 initial tasks based on the path
  const taskPrompt = `基於以下職涯路徑，生成前 3 個循序漸進的任務：

路徑名稱：${pathData.title}
世界觀：${pathData.worldSetting}
主線故事：${pathData.narrative}
核心技能：${pathData.skills.join(', ')}

請生成 3 個任務，每個任務包含：
- id: 任務ID（task_1, task_2, task_3）
- title: 任務標題
- description: 任務描述（結合故事情境）
- duration: 預計時間（例如：20分鐘）
- difficulty: 難度（1-3，逐漸增加）
- objective: 學習目標
- scenario: 情境描述（融入世界觀）

${locale === 'zh-TW' ? '使用繁體中文' : `使用 ${locale} 語言`}

以 JSON 陣列格式返回，只返回陣列，不要其他文字。`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: taskPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const response = result.response;
    const tasksText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!tasksText) {
      throw new Error('No tasks generated');
    }

    // Clean the generated text to remove markdown code blocks
    let cleanedText = tasksText.trim();
    
    // Remove markdown code block markers if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const tasks = JSON.parse(cleanedText);
    return tasks;
  } catch (error) {
    console.error('Failed to generate tasks:', error);
    // Return default tasks if generation fails
    return [
      {
        id: 'task_1',
        title: '初次探索',
        description: '開始你的冒險旅程',
        duration: '15分鐘',
        difficulty: 1,
        objective: '熟悉基本概念',
        scenario: '你剛剛踏入這個世界...'
      },
      {
        id: 'task_2',
        title: '技能學習',
        description: '學習核心技能',
        duration: '20分鐘',
        difficulty: 2,
        objective: '掌握基礎技能',
        scenario: '在導師的指導下...'
      },
      {
        id: 'task_3',
        title: '實戰挑戰',
        description: '完成第一個挑戰',
        duration: '25分鐘',
        difficulty: 3,
        objective: '應用所學知識',
        scenario: '現在是展現實力的時候...'
      }
    ];
  }
}

function calculateMatchPercentage(
  assessmentResults: any,
  generatedData: any
): number {
  // Calculate match based on category alignment
  const categoryWeights: Record<string, { tech: number; creative: number; business: number }> = {
    technology: { tech: 0.7, creative: 0.2, business: 0.1 },
    creative: { tech: 0.2, creative: 0.7, business: 0.1 },
    business: { tech: 0.1, creative: 0.2, business: 0.7 },
    hybrid: { tech: 0.33, creative: 0.33, business: 0.34 }
  };

  const weights = categoryWeights[generatedData.category] || categoryWeights.hybrid;
  
  const match = 
    (assessmentResults.tech * weights.tech) +
    (assessmentResults.creative * weights.creative) +
    (assessmentResults.business * weights.business);
  
  // Add some randomness to make it more interesting (85-100%)
  return Math.round(Math.min(100, match + Math.random() * 15));
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'Path Generation API is running',
    endpoint: '/api/discovery/generate-path',
    method: 'POST',
    requiredFields: ['userId', 'assessmentResults'],
    optionalFields: ['userPrompt', 'preferences', 'conversationHistory', 'locale']
  });
}