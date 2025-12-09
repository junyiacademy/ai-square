/**
 * PBL Task Evaluation Service
 * Handles PBL task evaluation using Vertex AI
 */

import { VertexAI, SchemaType } from '@google-cloud/vertexai';
import { Conversation } from '@/types/pbl-evaluate';
import {
  PBLEvaluationPromptBuilder,
  EvaluationPromptParams
} from './pbl-evaluation-prompt-builder.service';

export interface EvaluationResult {
  success: boolean;
  evaluation: {
    score: number;
    ksaScores: {
      knowledge: number;
      skills: number;
      attitudes: number;
    };
    individualKsaScores?: Record<string, unknown>;
    domainScores: Record<string, number | undefined>;
    rubricsScores: {
      'Research Quality': number;
      'AI Utilization': number;
      'Content Quality': number;
      'Learning Progress': number;
    };
    conversationInsights: {
      effectiveExamples: Array<{
        quote: string;
        reason: string;
      }>;
      improvementAreas: Array<{
        quote: string;
        suggestion: string;
      }>;
    };
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
    evaluatedAt: string;
    taskId: string;
    conversationCount: number;
    targetDomains: string[];
  };
  error?: string;
}

/**
 * Service for evaluating PBL tasks using AI
 */
export class PBLTaskEvaluationService {
  private promptBuilder: PBLEvaluationPromptBuilder;

  constructor() {
    this.promptBuilder = new PBLEvaluationPromptBuilder();
  }

  /**
   * Evaluate a PBL task
   */
  async evaluateTask(params: EvaluationPromptParams): Promise<EvaluationResult> {
    try {
      // Build evaluation prompt
      const prompt = this.promptBuilder.buildPrompt(params);

      // Initialize Vertex AI
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });

      // Get the generative model
      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: `You are a multilingual AI literacy education expert.
CRITICAL: You must ALWAYS respond in the EXACT language specified in the prompt.
Never mix languages. ALL text fields must be in the target language.
For Traditional Chinese (繁體中文), use Traditional Chinese ONLY.
For Simplified Chinese (简体中文), use Simplified Chinese ONLY.`,
      });

      // Call AI for evaluation
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65535,
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              score: { type: SchemaType.NUMBER },
              ksaScores: {
                type: SchemaType.OBJECT,
                properties: {
                  knowledge: { type: SchemaType.NUMBER },
                  skills: { type: SchemaType.NUMBER },
                  attitudes: { type: SchemaType.NUMBER }
                },
                required: ['knowledge', 'skills', 'attitudes']
              },
              individualKsaScores: { type: SchemaType.OBJECT },
              domainScores: {
                type: SchemaType.OBJECT,
                properties: {
                  engaging_with_ai: { type: SchemaType.NUMBER },
                  creating_with_ai: { type: SchemaType.NUMBER },
                  managing_with_ai: { type: SchemaType.NUMBER },
                  designing_with_ai: { type: SchemaType.NUMBER }
                },
                required: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']
              },
              rubricsScores: {
                type: SchemaType.OBJECT,
                properties: {
                  'Research Quality': { type: SchemaType.NUMBER },
                  'AI Utilization': { type: SchemaType.NUMBER },
                  'Content Quality': { type: SchemaType.NUMBER },
                  'Learning Progress': { type: SchemaType.NUMBER }
                },
                required: ['Research Quality', 'AI Utilization', 'Content Quality', 'Learning Progress']
              },
              conversationInsights: {
                type: SchemaType.OBJECT,
                properties: {
                  effectiveExamples: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        quote: { type: SchemaType.STRING },
                        reason: { type: SchemaType.STRING }
                      },
                      required: ['quote', 'reason']
                    }
                  },
                  improvementAreas: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        quote: { type: SchemaType.STRING },
                        suggestion: { type: SchemaType.STRING }
                      },
                      required: ['quote', 'suggestion']
                    }
                  }
                },
                required: ['effectiveExamples', 'improvementAreas']
              },
              strengths: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              improvements: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              nextSteps: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              }
            },
            required: ['score', 'ksaScores', 'domainScores', 'rubricsScores', 'conversationInsights', 'strengths', 'improvements', 'nextSteps']
          }
        }
      });

      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON response
      let evaluation;
      try {
        evaluation = JSON.parse(text);
        console.log('Successfully parsed evaluation response');
        console.log('AI Response - domainScores:', JSON.stringify(evaluation.domainScores || {}, null, 2));
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw response:', text);

        // Return fallback evaluation
        evaluation = this.createFallbackEvaluation(params.conversations);
      }

      // Process domain scores: Convert -1 to undefined for "NA" display
      evaluation.domainScores = this.processDomainScores(evaluation.domainScores);

      // Add timestamp and metadata
      const evaluationResult = {
        ...evaluation,
        evaluatedAt: new Date().toISOString(),
        taskId: params.task.id || '',
        conversationCount: params.conversations.filter((c: Conversation) => c.type === 'user').length,
        targetDomains: params.targetDomains || []
      };

      return {
        success: true,
        evaluation: evaluationResult
      };

    } catch (error) {
      console.error('Error in evaluation:', error);

      let errorMessage = 'Failed to evaluate';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', error.stack);
      }

      return {
        success: false,
        evaluation: this.createFallbackEvaluation(params.conversations, params.task.id),
        error: errorMessage
      };
    }
  }

  /**
   * Process domain scores: Convert -1 to undefined
   */
  public processDomainScores(domainScores: Record<string, number>): Record<string, number | undefined> {
    if (!domainScores) {
      return {};
    }

    const processedDomainScores: Record<string, number | undefined> = {};
    for (const [domain, score] of Object.entries(domainScores)) {
      // If score is -1, it means the domain is not in targetDomains
      processedDomainScores[domain] = score === -1 ? undefined : score;
    }
    return processedDomainScores;
  }

  /**
   * Create fallback evaluation for error cases
   */
  private createFallbackEvaluation(
    conversations: Conversation[],
    taskId?: string
  ): EvaluationResult['evaluation'] {
    return {
      score: 20,
      ksaScores: {
        knowledge: 20,
        skills: 20,
        attitudes: 20
      },
      individualKsaScores: {},
      domainScores: {
        engaging_with_ai: 20,
        creating_with_ai: 20,
        managing_with_ai: 20,
        designing_with_ai: 20
      },
      rubricsScores: {
        "Research Quality": 1,
        "AI Utilization": 1,
        "Content Quality": 1,
        "Learning Progress": 1
      },
      conversationInsights: {
        effectiveExamples: [],
        improvementAreas: [
          {
            quote: conversations.filter((c: Conversation) => c.type === 'user')[0]?.content || "No message",
            suggestion: "Instead of just greeting, try asking a specific question about the task"
          }
        ]
      },
      strengths: ["Initiated contact with learning system (A1.1)"],
      improvements: [
        "Need to engage more meaningfully with learning content (K1.1)",
        "Ask specific questions related to the task (S1.1)"
      ],
      nextSteps: [
        "Read the task instructions carefully (K1.1)",
        "Formulate questions about the learning objectives (S1.1, A1.1)"
      ],
      evaluatedAt: new Date().toISOString(),
      taskId: taskId || '',
      conversationCount: conversations.filter((c: Conversation) => c.type === 'user').length,
      targetDomains: []
    };
  }
}
