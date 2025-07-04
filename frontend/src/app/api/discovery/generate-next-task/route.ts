/**
 * Generate Next Task API - Dynamically generate the next task based on performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import type { DynamicTask } from '@/lib/services/user-data-service';

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
      pathId,
      pathContext,
      storyContext,
      currentTaskNumber,
      previousTaskResult,
      locale = 'zh-TW'
    } = body;

    // Build generation prompt
    const prompt = buildNextTaskPrompt({
      pathContext,
      storyContext,
      currentTaskNumber,
      previousTaskResult,
      locale
    });

    // Generate with Vertex AI
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 4096, // Increased token limit for complete JSON
      },
    });

    const response = result.response;
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No task generated');
    }

    // Parse the generated task
    let taskData;
    try {
      // Clean the generated text to remove markdown code blocks
      let cleanedText = generatedText.trim();
      
      // Remove markdown code block markers if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Check if response appears truncated (common signs)
      if (!cleanedText.endsWith('}') && !cleanedText.endsWith(']')) {
        console.error('Response appears truncated:', cleanedText);
        throw new Error('Generated response appears to be truncated');
      }
      
      // Log the cleaned text for debugging
      console.log('Attempting to parse cleaned JSON:', cleanedText.length > 500 ? 
        cleanedText.substring(0, 500) + '...[truncated for log]' : cleanedText);
      
      taskData = JSON.parse(cleanedText);
      
      // Validate required fields
      if (!taskData.title || !taskData.description) {
        throw new Error('Missing required fields in generated task');
      }
      
    } catch (parseError) {
      console.error('Failed to parse generated task. Length:', generatedText.length);
      console.error('Raw response:', generatedText);
      console.error('Parse error:', parseError);
      
      // Fallback: Create a basic task structure
      console.log('Using fallback task generation...');
      taskData = {
        title: `挑戰任務 ${currentTaskNumber + 1}`,
        description: `基於前一個任務的經驗，現在需要進一步提升您的技能和知識。`,
        duration: '25分鐘',
        difficulty: Math.min(10, currentTaskNumber + 1),
        objective: '應用並擴展已學技能',
        previousSummary: `您已成功完成了前面的任務，展現了良好的學習能力。`,
        currentChallenge: `面對新的挑戰，您需要運用所學知識解決更複雜的問題。`,
        choices: [
          {
            id: 'choice_1',
            text: '採用創新方法',
            consequence: '將探索新的解決方案'
          },
          {
            id: 'choice_2',
            text: '運用經典策略',
            consequence: '將使用驗證過的方法'
          }
        ]
      };
    }

    // Create the dynamic task
    // Generate task ID directly without DiscoveryService (which uses localStorage)
    const taskId = `task_${pathId}_${currentTaskNumber + 1}_${Date.now()}`;
    
    const dynamicTask: DynamicTask = {
      id: taskId,
      pathId,
      sequenceNumber: currentTaskNumber + 1,
      title: taskData.title,
      description: taskData.description,
      duration: taskData.duration || '20分鐘',
      difficulty: taskData.difficulty || currentTaskNumber + 1,
      sourceLanguage: locale,
      storyContext: {
        previousSummary: taskData.previousSummary,
        currentChallenge: taskData.currentChallenge,
        choices: taskData.choices || []
      },
      generationInfo: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-2.5-flash',
        previousTaskResult,
        userPerformanceScore: previousTaskResult?.score || 0
      }
    };

    // Don't save on server side - localStorage is not available
    // The client will save the task when it receives the response
    
    return NextResponse.json({
      success: true,
      task: dynamicTask
    });
  } catch (error) {
    console.error('Task generation error:', error);
    return NextResponse.json(
      { 
        error: 'Task generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function buildNextTaskPrompt(params: {
  pathContext: any;
  storyContext: any;
  currentTaskNumber: number;
  previousTaskResult: any;
  locale: string;
}): string {
  const { pathContext, storyContext, currentTaskNumber, previousTaskResult, locale } = params;
  
  const languageInstructions = locale === 'zh-TW' 
    ? '請使用繁體中文生成所有內容。'
    : locale === 'en'
    ? 'Please generate all content in English.'
    : `Please generate all content in the language for locale: ${locale}.`;

  // Adjust difficulty based on performance
  let difficultyAdjustment = '';
  if (previousTaskResult?.score >= 90) {
    difficultyAdjustment = '用戶表現優異，請提高挑戰難度。';
  } else if (previousTaskResult?.score <= 60) {
    difficultyAdjustment = '用戶需要更多練習，請降低難度並提供更多引導。';
  } else {
    difficultyAdjustment = '用戶表現良好，保持適中的挑戰性。';
  }

  return `你是一個遊戲關卡設計師，需要基於用戶的表現生成下一個任務。

背景資訊：
- 路徑名稱：${pathContext.title}
- 世界觀：${storyContext.worldSetting}
- 主線故事：${storyContext.narrative}
- 當前是第 ${currentTaskNumber + 1} 個任務

前一個任務結果：
- 任務名稱：${previousTaskResult?.taskTitle || '未知'}
- 完成分數：${previousTaskResult?.score || 0}/100
- 用戶選擇：${JSON.stringify(previousTaskResult?.choices || [])}
- 花費時間：${previousTaskResult?.timeSpent || '未知'}

${difficultyAdjustment}

請生成下一個任務，要求格式如下：
{
  "title": "任務標題",
  "description": "任務描述（控制在80字內）",
  "duration": "預計時間",
  "difficulty": ${Math.min(10, currentTaskNumber + 1)},
  "objective": "學習目標（簡潔）",
  "previousSummary": "前情提要（30字內）",
  "currentChallenge": "當前挑戰（50字內）",
  "choices": [
    {
      "id": "choice_1",
      "text": "選項1（20字內）",
      "consequence": "後果說明（30字內）"
    },
    {
      "id": "choice_2", 
      "text": "選項2（20字內）",
      "consequence": "後果說明（30字內）"
    }
  ]
}

${languageInstructions}

重要要求：
1. 嚴格控制字數限制，避免內容過長
2. 必須提供2個選擇選項
3. 只返回有效的 JSON 格式
4. 不要添加任何說明文字或標記
5. 確保 JSON 完整且格式正確`;
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'Next Task Generation API is running',
    endpoint: '/api/discovery/generate-next-task',
    method: 'POST',
    requiredFields: ['userId', 'pathId', 'pathContext', 'storyContext', 'currentTaskNumber', 'previousTaskResult']
  });
}