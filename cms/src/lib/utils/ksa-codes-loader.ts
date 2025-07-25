import * as fs from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';

interface KSACode {
  code: string;
  summary: string;
}

interface KSACodesData {
  knowledge: KSACode[];
  skills: KSACode[];
  attitudes: KSACode[];
}

// Cache the loaded KSA codes
let cachedKSACodes: KSACodesData | null = null;

export function loadKSACodes(): KSACodesData {
  if (cachedKSACodes) {
    return cachedKSACodes;
  }

  try {
    // Load the KSA codes YAML file
    const filePath = path.join(process.cwd(), 'content', 'rubrics_data', 'ksa_codes.yaml');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    interface KSAYamlData {
      knowledge_codes?: {
        themes: Record<string, {
          codes: Record<string, { summary: string }>
        }>
      };
      skills_codes?: {
        themes: Record<string, {
          codes: Record<string, { summary: string }>
        }>
      };
      attitudes_codes?: {
        themes: Record<string, {
          codes: Record<string, { summary: string }>
        }>
      };
    }
    
    const data = yaml.load(fileContent) as KSAYamlData;

    const ksaCodes: KSACodesData = {
      knowledge: [],
      skills: [],
      attitudes: []
    };

    // Extract Knowledge codes
    if (data.knowledge_codes?.themes) {
      for (const theme of Object.values(data.knowledge_codes.themes)) {
        if (theme.codes) {
          for (const [code, details] of Object.entries(theme.codes)) {
            ksaCodes.knowledge.push({
              code,
              summary: details.summary || ''
            });
          }
        }
      }
    }

    // Extract Skills codes
    if (data.skills_codes?.themes) {
      for (const theme of Object.values(data.skills_codes.themes)) {
        if (theme.codes) {
          for (const [code, details] of Object.entries(theme.codes)) {
            ksaCodes.skills.push({
              code,
              summary: details.summary || ''
            });
          }
        }
      }
    }

    // Extract Attitudes codes
    if (data.attitudes_codes?.themes) {
      for (const theme of Object.values(data.attitudes_codes.themes)) {
        if (theme.codes) {
          for (const [code, details] of Object.entries(theme.codes)) {
            ksaCodes.attitudes.push({
              code,
              summary: details.summary || ''
            });
          }
        }
      }
    }

    // Cache the result
    cachedKSACodes = ksaCodes;
    return ksaCodes;
  } catch (error) {
    console.error('Error loading KSA codes:', error);
    // Return fallback KSA codes if file loading fails
    return getFallbackKSACodes();
  }
}

// Fallback KSA codes in case file loading fails
function getFallbackKSACodes(): KSACodesData {
  return {
    knowledge: [
      { code: 'K1.1', summary: 'AI systems use algorithms combining procedures with statistical inferences' },
      { code: 'K1.2', summary: 'Machines learn by inferring outputs from inputs with varying autonomy' },
      { code: 'K1.3', summary: 'Generative AI uses probabilities without authentic understanding' },
      { code: 'K1.4', summary: 'AI systems operate differently based on purpose' },
      { code: 'K2.1', summary: 'AI reflects human choices and labor practices' },
      { code: 'K2.2', summary: 'AI trains on vast datasets from various sources' },
      { code: 'K2.3', summary: 'AI gathers new data from user interactions' },
      { code: 'K3.1', summary: 'AI can perpetuate biases from training data' },
      { code: 'K3.2', summary: 'AI predictions are based on probabilities, not certainties' },
      { code: 'K3.3', summary: 'Data quality affects AI reliability' },
      { code: 'K4.1', summary: 'AI impacts society in complex ways' },
      { code: 'K4.2', summary: 'AI raises ethical concerns' },
      { code: 'K4.3', summary: 'AI requires governance and regulation' }
    ],
    skills: [
      { code: 'S1.1', summary: 'Evaluate AI outputs critically' },
      { code: 'S1.2', summary: 'Identify appropriate AI tools for tasks' },
      { code: 'S1.3', summary: 'Use AI effectively and responsibly' },
      { code: 'S2.1', summary: 'Create with AI assistance' },
      { code: 'S3.1', summary: 'Manage AI risks and limitations' },
      { code: 'S4.1', summary: 'Design AI-enhanced solutions' },
      { code: 'S4.2', summary: 'Consider ethical implications' },
      { code: 'S4.3', summary: 'Evaluate AI system impacts' }
    ],
    attitudes: [
      { code: 'A1.1', summary: 'Maintain critical perspective on AI' },
      { code: 'A1.2', summary: 'Value human judgment over AI' },
      { code: 'A1.3', summary: 'Recognize AI limitations' },
      { code: 'A2.1', summary: 'Use AI ethically and responsibly' },
      { code: 'A2.2', summary: 'Consider societal impacts' },
      { code: 'A2.3', summary: 'Promote inclusive AI use' },
      { code: 'A3.1', summary: 'Stay informed about AI developments' },
      { code: 'A3.2', summary: 'Adapt to AI changes' },
      { code: 'A3.3', summary: 'Balance AI use with human skills' },
      { code: 'A4.1', summary: 'Question AI decisions' },
      { code: 'A4.2', summary: 'Advocate for responsible AI' },
      { code: 'A4.3', summary: 'Support AI literacy' }
    ]
  };
}

// Format KSA codes for prompt
export function formatKSACodesForPrompt(): string {
  const ksaCodes = loadKSACodes();
  
  let prompt = 'Available KSA codes from the AI Literacy Framework:\n\n';
  
  // Format Knowledge codes
  prompt += 'Knowledge (K) - Understanding AI concepts:\n';
  for (const k of ksaCodes.knowledge) {
    prompt += `- ${k.code}: ${k.summary}\n`;
  }
  
  prompt += '\nSkills (S) - Practical AI abilities:\n';
  for (const s of ksaCodes.skills) {
    prompt += `- ${s.code}: ${s.summary}\n`;
  }
  
  prompt += '\nAttitudes (A) - AI mindsets and values:\n';
  for (const a of ksaCodes.attitudes) {
    prompt += `- ${a.code}: ${a.summary}\n`;
  }
  
  return prompt;
}