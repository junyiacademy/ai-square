import { VertexAI } from '@google-cloud/vertexai';
import * as yaml from 'js-yaml';
import { PBL_SCENARIO_JSON_SCHEMA, type PBLScenarioSchema } from './schemas/pbl-scenario.schema';
import { sortPBLScenario } from './utils/yaml-order';

let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    try {
      // Simply use environment variables - the SDK will handle auth
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
      }
      
      vertexAI = new VertexAI({
        project: projectId,
        location: location,
      });
    } catch (error) {
      console.error('Failed to initialize Vertex AI:', error);
      throw new Error('Failed to initialize Vertex AI. Please check your Google Cloud credentials.');
    }
  }
  return vertexAI;
}

export async function generateContent(prompt: string, systemPrompt?: string) {
  try {
    const vertex = getVertexAI();
    const model = vertex.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 65535,
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
  try {
    // Parse existing YAML to understand what's already there
    let existingData: Partial<PBLScenarioSchema> = {};
    try {
      existingData = yaml.load(yamlContent) as Partial<PBLScenarioSchema>;
    } catch (e) {
      console.warn('Could not parse existing YAML, starting fresh');
    }

    const vertex = getVertexAI();
    const model = vertex.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 65535,
        temperature: 0.3,
        topP: 0.8,
        responseMimeType: 'application/json',
        responseSchema: PBL_SCENARIO_JSON_SCHEMA,
      },
    });

    const prompt = `You are an expert educational content creator for AI literacy platforms.
    
Complete this PBL scenario with appropriate educational content. The existing content is:
${yamlContent}

Context: ${context || 'Educational content for AI Square platform'}

Requirements:
1. Complete all missing fields with meaningful educational content
2. Ensure consistency with existing content patterns
3. Use appropriate difficulty levels (beginner/intermediate/advanced)
4. Include realistic time estimates (in minutes)
5. Add proper KSA mapping codes if missing
6. Create engaging tasks with clear instructions
7. Use language code suffixes correctly: _zh, _es, _ja, _ko, _fr, _de, _ru, _it
8. For now, focus on completing the English content. Translation fields can be filled with placeholder text.

Return a complete JSON object following the PBL scenario schema.`;

    const result = await model.generateContent(prompt);
    const jsonResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse JSON and convert back to YAML
    const jsonData = JSON.parse(jsonResponse);
    
    // Sort the data according to schema order
    const sortedData = sortPBLScenario(jsonData);
    
    const yamlOutput = yaml.dump(sortedData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false, // We handle sorting ourselves
    });
    
    return yamlOutput;
  } catch (error) {
    console.error('Error in completeYAMLContent:', error);
    // Fallback to non-JSON mode
    return generateContent(
      `Complete this YAML content:\n\n${yamlContent}`,
      `Complete the YAML with educational content. Return only valid YAML, no explanations.`
    );
  }
}

export async function translateYAMLContent(yamlContent: string) {
  try {
    // Parse existing YAML
    const existingData = yaml.load(yamlContent) as PBLScenarioSchema;
    
    const vertex = getVertexAI();
    const model = vertex.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 65535,
        temperature: 0.3,
        topP: 0.8,
        responseMimeType: 'application/json',
        responseSchema: PBL_SCENARIO_JSON_SCHEMA,
      },
    });

    const prompt = `You are a professional translator for educational content.
    
Translate all text fields in this PBL scenario to these languages: Chinese (zh-TW), Spanish (es), Japanese (ja), Korean (ko), French (fr), German (de), Russian (ru), Italian (it).

Current content:
${JSON.stringify(existingData, null, 2)}

Guidelines:
1. Translate all text fields by adding language suffixes (_zh, _es, _ja, _ko, _fr, _de, _ru, _it)
2. Maintain educational terminology consistency
3. Adapt cultural context appropriately for each language
4. Preserve technical terms in commonly used forms
5. Keep the same structure and all existing content
6. Ensure translations are natural and educationally appropriate

Return a complete JSON object with all translations added.`;

    const result = await model.generateContent(prompt);
    const jsonResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse JSON and convert back to YAML
    const jsonData = JSON.parse(jsonResponse);
    
    // Sort the data according to schema order
    const sortedData = sortPBLScenario(jsonData);
    
    const yamlOutput = yaml.dump(sortedData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false, // We handle sorting ourselves
    });
    
    return yamlOutput;
  } catch (error) {
    console.error('Error in translateYAMLContent:', error);
    // Fallback to non-JSON mode
    const languages = ['zh', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
    return generateContent(
      `Translate this YAML content to languages: ${languages.join(', ')}\n\n${yamlContent}`,
      `Translate all text fields. Add language suffixes like _zh, _es, etc. Return only valid YAML.`
    );
  }
}

export async function improveYAMLContent(yamlContent: string) {
  try {
    // Parse existing YAML
    const existingData = yaml.load(yamlContent) as PBLScenarioSchema;
    
    const vertex = getVertexAI();
    const model = vertex.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 65535,
        temperature: 0.3,
        topP: 0.8,
        responseMimeType: 'application/json',
        responseSchema: PBL_SCENARIO_JSON_SCHEMA,
      },
    });

    const prompt = `You are an expert educational designer for AI literacy platforms.
    
Improve this PBL scenario for better educational effectiveness:
${JSON.stringify(existingData, null, 2)}

Improvements to make:
1. Enhance content clarity and educational value
2. Ensure learning objectives are specific and measurable
3. Improve task instructions for better student engagement
4. Add missing optional fields that would enhance learning
5. Ensure proper difficulty progression
6. Validate time estimates are realistic
7. Enhance AI module prompts for better interaction
8. Ensure KSA mapping is comprehensive and accurate
9. Improve language for clarity and engagement
10. Add helpful resources where appropriate

Return a complete JSON object with all improvements applied while preserving all existing content.`;

    const result = await model.generateContent(prompt);
    const jsonResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse JSON and convert back to YAML
    const jsonData = JSON.parse(jsonResponse);
    
    // Sort the data according to schema order
    const sortedData = sortPBLScenario(jsonData);
    
    const yamlOutput = yaml.dump(sortedData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false, // We handle sorting ourselves
    });
    
    return yamlOutput;
  } catch (error) {
    console.error('Error in improveYAMLContent:', error);
    // Fallback to non-JSON mode
    return generateContent(
      `Improve this YAML content for educational effectiveness:\n\n${yamlContent}`,
      `Enhance the content quality while preserving structure. Return only valid YAML.`
    );
  }
}