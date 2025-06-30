import { NextRequest, NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import * as yaml from 'js-yaml'

// PBL Scenario Schema 定義
const PBL_SCHEMA = {
  type: 'object',
  properties: {
    scenario_info: {
      type: 'object',
      required: ['id', 'title', 'difficulty', 'estimated_duration'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        estimated_duration: { type: 'number' },
        target_domains: { type: 'array', items: { type: 'string' } },
        prerequisites: { type: 'array', items: { type: 'string' } },
        learning_objectives: { type: 'array', items: { type: 'string' } }
      }
    },
    ksa_mapping: {
      type: 'object',
      properties: {
        knowledge: { type: 'array', items: { type: 'string' } },
        skills: { type: 'array', items: { type: 'string' } },
        attitudes: { type: 'array', items: { type: 'string' } }
      }
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'category'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          time_limit: { type: 'number' },
          instructions: { type: 'array', items: { type: 'string' } },
          expected_outcome: { type: 'string' },
          resources: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    completion_criteria: {
      type: 'object',
      properties: {
        min_tasks_completed: { type: 'number' },
        required_competencies: { type: 'array', items: { type: 'string' } },
        min_overall_score: { type: 'number' }
      }
    }
  }
}

const LANGUAGES = ['zh', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']

// 初始化 Vertex AI
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || '',
  location: 'us-central1',
})

const model = vertex_ai.preview.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.7,
    topP: 0.8,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { currentYaml, userRequest, validationErrors } = await request.json()
    
    // 解析當前 YAML
    let currentContent
    try {
      currentContent = yaml.load(currentYaml)
    } catch (error) {
      currentContent = {}
    }

    // 建構 prompt
    const prompt = `You are a PBL (Problem-Based Learning) scenario editor assistant. 

Current YAML content:
\`\`\`yaml
${currentYaml}
\`\`\`

Current validation errors:
${validationErrors.length > 0 ? validationErrors.join('\n') : 'None'}

User request: "${userRequest}"

Please help the user by:
1. Understanding their request
2. Modifying the YAML content accordingly
3. If translation is requested, translate to these languages: ${LANGUAGES.join(', ')}
4. Ensure the output follows the PBL scenario schema

IMPORTANT RULES:
- For multi-language fields, use suffix pattern: field_zh, field_es, etc.
- Keep English fields without suffix (e.g., title, description)
- Preserve existing content unless specifically asked to change
- Follow the exact YAML structure with scenario_info, ksa_mapping, tasks, completion_criteria
- If creating new tasks, ensure each has unique ID and all required fields
- When translating, keep translations natural and educational

Respond with a JSON object containing:
{
  "explanation": "Brief explanation in Traditional Chinese of what was done",
  "updatedYaml": "The complete updated YAML content as a string",
  "changes": ["List of changes made"]
}

JSON Response:`

    // 呼叫 Vertex AI
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()
    
    // 解析 JSON 回應
    let jsonResponse
    try {
      // 嘗試找出 JSON 部分
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (error) {
      console.error('JSON parse error:', error)
      
      // 如果解析失敗，返回錯誤訊息
      return NextResponse.json({
        explanation: '抱歉，處理您的請求時發生錯誤。請再試一次。',
        updatedYaml: currentYaml,
        changes: []
      })
    }

    // 驗證更新後的 YAML
    if (jsonResponse.updatedYaml) {
      try {
        yaml.load(jsonResponse.updatedYaml)
      } catch (error) {
        jsonResponse.explanation += '\n\n⚠️ 注意：生成的 YAML 可能有格式問題，請檢查並手動修正。'
      }
    }

    return NextResponse.json(jsonResponse)
    
  } catch (error) {
    console.error('AI assist error:', error)
    return NextResponse.json(
      { error: 'AI assistance failed' },
      { status: 500 }
    )
  }
}