import { NextRequest, NextResponse } from 'next/server'

// 使用 Google Gemini 進行翻譯
async function translateWithGemini(text: string, targetLang: string, fieldType: string): Promise<string> {
  const languageMap: Record<string, string> = {
    'zh': 'Traditional Chinese (Taiwan)',
    'es': 'Spanish',
    'ja': 'Japanese',
    'ko': 'Korean',
    'fr': 'French',
    'de': 'German',
    'ru': 'Russian',
    'it': 'Italian'
  }

  const prompt = `Translate the following ${fieldType} from English to ${languageMap[targetLang]}. 
Keep the translation natural and appropriate for educational content.
Only return the translated text without any explanation.

Text to translate: "${text}"`

  try {
    // TODO: 整合 Gemini API
    // const response = await gemini.generateContent(prompt)
    // return response.text()
    
    // 暫時返回模擬翻譯
    return `[${languageMap[targetLang]}] ${text}`
  } catch (error) {
    console.error(`Translation error for ${targetLang}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLanguages } = await request.json()
    
    if (!texts || !targetLanguages) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const translations: Record<string, Record<string, any>> = {}
    
    // 對每個目標語言進行翻譯
    for (const lang of targetLanguages) {
      translations[lang] = {}
      
      // 翻譯每個欄位
      for (const [field, value] of Object.entries(texts)) {
        if (field === 'prerequisites') {
          // 處理陣列類型的欄位
          try {
            const prerequisites = JSON.parse(value as string)
            const translatedPrereqs = await Promise.all(
              prerequisites.map((prereq: string) => 
                translateWithGemini(prereq, lang, 'prerequisite')
              )
            )
            translations[lang][field] = translatedPrereqs
          } catch (e) {
            console.error('Error parsing prerequisites:', e)
            translations[lang][field] = []
          }
        } else {
          // 處理一般文字欄位
          translations[lang][field] = await translateWithVertex(
            value as string, 
            lang, 
            field
          )
        }
      }
    }

    return NextResponse.json({ translations })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}