import { VertexAI } from '@google-cloud/vertexai';

let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID || 'ai-square-dev',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
  }
  return vertexAI;
}

export async function generateContent(prompt: string, systemPrompt?: string) {
  try {
    const vertex = getVertexAI();
    const model = vertex.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.3,
        topP: 0.8,
      },
    });

    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\nUser: ${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Vertex AI error:', error);
    throw new Error('Failed to generate content');
  }
}

export async function completeYAMLContent(yamlContent: string, context?: string) {
  const systemPrompt = `You are an expert educational content creator specializing in YAML structure for AI literacy education platforms.
Your task is to analyze incomplete YAML content and complete it with appropriate, educational content.

Context: ${context || 'Educational content for AI Square platform'}

Guidelines:
1. Maintain proper YAML syntax and indentation
2. Complete missing fields with educational content
3. Ensure consistency with existing content patterns
4. Use appropriate difficulty levels and learning objectives
5. Include multilingual support where needed (en, zh-TW, es, ja, ko, fr, de, ru, it)
6. Follow PBL (Problem-Based Learning) best practices

Return only the completed YAML content without additional explanation.`;

  const prompt = `Complete this YAML content:\n\n${yamlContent}`;
  
  return generateContent(prompt, systemPrompt);
}

export async function translateYAMLContent(yamlContent: string, targetLanguages: string[] = ['zh-TW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']) {
  const systemPrompt = `You are a professional translator specializing in educational content for AI literacy platforms.
Your task is to translate YAML content while preserving structure and educational terminology accuracy.

Guidelines:
1. Preserve all YAML structure and syntax
2. Only translate content values, not keys
3. Maintain educational terminology consistency
4. Adapt cultural context appropriately
5. Keep technical terms in their commonly used form
6. Preserve formatting and special characters

Target languages: ${targetLanguages.join(', ')}

Return the complete YAML with all translations added using language suffixes (e.g., title_zh, title_es).`;

  const prompt = `Translate this YAML content to all target languages:\n\n${yamlContent}`;
  
  return generateContent(prompt, systemPrompt);
}

export async function improveYAMLContent(yamlContent: string) {
  const systemPrompt = `You are an expert educational designer and YAML validator for AI literacy platforms.
Your task is to analyze and improve YAML content for quality, consistency, and educational effectiveness.

Improvements to make:
1. Fix any YAML syntax errors
2. Improve content clarity and educational value
3. Ensure consistent formatting and structure
4. Add missing required fields
5. Enhance learning objectives and outcomes
6. Improve language and readability
7. Validate against educational best practices

Return the improved YAML content with clear structure and enhanced educational value.`;

  const prompt = `Analyze and improve this YAML content:\n\n${yamlContent}`;
  
  return generateContent(prompt, systemPrompt);
}