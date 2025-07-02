import { VertexAI, SchemaType } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';
import * as yaml from 'js-yaml';
import { type PBLScenarioSchema } from './schemas/pbl-scenario.schema';
import { sortPBLScenario } from './utils/yaml-order';
import { formatKSACodesForPrompt } from './utils/ksa-codes-loader';
import { PBLScenario, KSAMapping } from '@/types';

let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
      
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
      }
      
      // Check if we have service account JSON from Secret Manager
      const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      
      if (credentialsJson) {
        // Parse the JSON credentials from Secret Manager
        const credentials = JSON.parse(credentialsJson);
        
        // Create GoogleAuth with the parsed credentials
        const auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        
        vertexAI = new VertexAI({
          project: projectId,
          location: location,
          googleAuthOptions: {
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          }
        });
      } else {
        // Fallback to default authentication (for local development)
        vertexAI = new VertexAI({
          project: projectId,
          location: location,
        });
      }
      
      console.log('Vertex AI initialized successfully');
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
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            scenario_info: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                difficulty: { type: SchemaType.STRING },
                estimated_duration: { type: SchemaType.NUMBER },
                target_domains: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                },
                prerequisites: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                },
                learning_objectives: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                }
              },
              required: ["id", "title", "description", "difficulty", "estimated_duration", "target_domains", "prerequisites", "learning_objectives"]
            },
            ksa_mapping: {
              type: SchemaType.OBJECT,
              properties: {
                knowledge: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                },
                skills: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                },
                attitudes: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                }
              }
            },
            tasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING },
                  estimated_duration: { type: SchemaType.NUMBER }
                }
              }
            }
          },
          required: ["scenario_info", "tasks"]
        },
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
5. Add proper KSA mapping codes if missing (see reference below)
6. Create engaging tasks with clear instructions
7. Use language code suffixes correctly: _zhTW, _es, _ja, _ko, _fr, _de, _ru, _it, _zhCN, _pt, _ar, _id, _th
8. For now, focus on completing the English content. Translation fields can be filled with placeholder text.

${formatKSACodesForPrompt()}

Return a complete JSON object following the PBL scenario schema.`;

    const result = await model.generateContent(prompt);
    const jsonResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse JSON and convert back to YAML
    const jsonData = JSON.parse(jsonResponse);
    
    // Sort the data according to schema order
    const sortedData = sortPBLScenario(jsonData as PBLScenario);
    
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
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            scenario_info: { type: SchemaType.OBJECT },
            ksa_mapping: { type: SchemaType.OBJECT },
            tasks: { type: SchemaType.ARRAY }
          }
        },
      },
    });

    const prompt = `You are a professional translator for educational content.
    
Translate all text fields in this PBL scenario to these languages: Chinese Traditional (zh-TW), Spanish (es), Japanese (ja), Korean (ko), French (fr), German (de), Russian (ru), Italian (it), Chinese Simplified (zh-CN), Portuguese (pt), Arabic (ar), Indonesian (id), Thai (th).

Current content:
${JSON.stringify(existingData, null, 2)}

Guidelines:
1. Translate all text fields by adding language suffixes (_zhTW, _es, _ja, _ko, _fr, _de, _ru, _it, _zhCN, _pt, _ar, _id, _th)
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
    const sortedData = sortPBLScenario(jsonData as PBLScenario);
    
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
    const languages = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it', 'zhCN', 'pt', 'ar', 'id', 'th'];
    return generateContent(
      `Translate this YAML content to languages: ${languages.join(', ')}\n\n${yamlContent}`,
      `Translate all text fields. Add language suffixes like _zhTW, _es, etc. Return only valid YAML.`
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
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            scenario_info: { type: SchemaType.OBJECT },
            ksa_mapping: { type: SchemaType.OBJECT },
            tasks: { type: SchemaType.ARRAY }
          }
        },
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
8. Ensure KSA mapping is comprehensive and accurate (see reference below)
9. Improve language for clarity and engagement
10. Add helpful resources where appropriate

${formatKSACodesForPrompt()}

Return a complete JSON object with all improvements applied while preserving all existing content.`;

    const result = await model.generateContent(prompt);
    const jsonResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse JSON and convert back to YAML
    const jsonData = JSON.parse(jsonResponse);
    
    // Sort the data according to schema order
    const sortedData = sortPBLScenario(jsonData as PBLScenario);
    
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

export async function mapKSAContent(yamlContent: string) {
  try {
    // Parse existing YAML
    const existingData = yaml.load(yamlContent) as PBLScenarioSchema;
    
    // Keep only KSA mapping, return original content with updated KSA
    const updatedData: PBLScenarioSchema = {
      ...existingData,
      ksa_mapping: { knowledge: [], skills: [], attitudes: [] } // Will be replaced
    };
    
    const vertex = getVertexAI();
    
    // Define a simple schema for KSA mapping
    const ksaSchema = {
      type: SchemaType.OBJECT,
      properties: {
        ksa_mapping: {
          type: SchemaType.OBJECT,
          properties: {
            knowledge: { 
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING } 
            },
            skills: { 
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING } 
            },
            attitudes: { 
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING } 
            }
          },
          required: ["knowledge", "skills", "attitudes"]
        }
      },
      required: ["ksa_mapping"]
    };
    
    const model = vertex.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.3,
        topP: 0.8,
        responseMimeType: 'application/json',
        responseSchema: ksaSchema,
      },
    });

    const prompt = `You are an expert in AI literacy education and competency mapping.
    
Analyze this PBL scenario and map it to appropriate KSA (Knowledge, Skills, Attitudes) competency codes.

Current scenario:
${JSON.stringify(existingData, null, 2)}

${formatKSACodesForPrompt()}

Based on the scenario's learning objectives, tasks, and content, analyze which competencies are addressed.

Guidelines:
1. Map 3-5 codes per category based on scenario relevance
2. Focus on primary competencies addressed by the scenario
3. Consider the difficulty level and target audience
4. Ensure codes align with learning objectives and tasks

Return your response as a valid JSON object with EXACTLY this structure:
{
  "ksa_mapping": {
    "knowledge": ["K1.1", "K2.3"],
    "skills": ["S1.1", "S2.2"],
    "attitudes": ["A1.1", "A2.1"]
  }
}

IMPORTANT: Return ONLY the JSON object above. No explanations, no markdown, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parse the KSA mapping
    let ksaMapping: KSAMapping;
    try {
      // Clean the response - remove any markdown or extra text
      let cleanResponse = response.trim();
      
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = cleanResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[1];
      }
      
      // Find the JSON object in the response
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      const jsonResponse = JSON.parse(cleanResponse) as { ksa_mapping: KSAMapping };
      ksaMapping = jsonResponse.ksa_mapping || { knowledge: [], skills: [], attitudes: [] };
      
      // Validate the structure
      if (!Array.isArray(ksaMapping.knowledge) || 
          !Array.isArray(ksaMapping.skills) || 
          !Array.isArray(ksaMapping.attitudes)) {
        throw new Error('Invalid KSA mapping structure');
      }
      
      console.log('Successfully parsed KSA mapping:', ksaMapping);
    } catch (e) {
      console.error('Failed to parse KSA response:', e);
      console.log('Raw response:', response);
      ksaMapping = { knowledge: [], skills: [], attitudes: [] };
    }
    
    // Update only the KSA mapping
    updatedData.ksa_mapping = ksaMapping;
    
    // Sort and convert back to YAML
    const sortedData = sortPBLScenario(updatedData);
    const yamlOutput = yaml.dump(sortedData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
    
    return yamlOutput;
  } catch (error) {
    console.error('Error in mapKSAContent:', error);
    // Fallback: return original content
    return yamlContent;
  }
}