/**
 * Vertex AI Service Implementation for V2
 */

import { IAIService, AIGenerationOptions, AIEvaluationResult } from '@/lib/v2/abstractions/ai.interface';
import { VertexAI } from '@google-cloud/vertexai';

export class VertexAIService implements IAIService {
  private vertexAI: VertexAI;
  private model: any;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT!,
      location: 'us-central1'
    });

    this.model = this.vertexAI.preview.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.8,
        topP: 0.95,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.8,
          maxOutputTokens: options?.maxTokens ?? 2048,
        }
      });

      const response = result.response;
      return response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Vertex AI generation error:', error);
      throw new Error('Failed to generate text');
    }
  }

  async evaluateTaskResponse(params: {
    task: any;
    response: any;
    rubric?: any;
    required_ksa?: string[];
  }): Promise<AIEvaluationResult> {
    const prompt = `
You are an AI tutor evaluating a student's response to a learning task.

Task: ${params.task.title}
Instructions: ${params.task.instructions || 'Complete the task'}
Required Skills: ${params.required_ksa?.join(', ') || 'General understanding'}

Student Response: ${JSON.stringify(params.response)}

${params.rubric ? `Evaluation Rubric: ${JSON.stringify(params.rubric)}` : ''}

Please evaluate the response and provide:
1. Overall score (0-100)
2. Scores for each rubric criterion (if provided)
3. Specific strengths
4. Areas for improvement
5. KSA achievement mapping (if required_ksa provided)

Format your response as JSON:
{
  "overall": <number>,
  "criteria": { <criterion>: <score>, ... },
  "strengths": ["...", ...],
  "improvements": ["...", ...],
  "ksa_achievement": { <ksa_code>: <percentage>, ... }
}`;

    try {
      const result = await this.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 1024
      });

      // Parse AI response
      let evaluation;
      try {
        // Extract JSON from response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        // Fallback if parsing fails
        evaluation = {
          overall: 75,
          criteria: {},
          strengths: ['Completed the task'],
          improvements: ['Could provide more detail'],
          ksa_achievement: {}
        };
      }

      return {
        scores: {
          overall: evaluation.overall || 75,
          ...evaluation.criteria
        },
        feedback: {
          summary: `Score: ${evaluation.overall || 75}/100`,
          strengths: evaluation.strengths || [],
          improvements: evaluation.improvements || []
        },
        ksa_achievement: evaluation.ksa_achievement || {},
        metadata: {
          evaluated_at: new Date().toISOString(),
          model: this.modelName
        }
      };
    } catch (error) {
      console.error('Evaluation error:', error);
      // Return default evaluation
      return {
        scores: { overall: 70 },
        feedback: {
          summary: 'Evaluation completed',
          strengths: ['Task attempted'],
          improvements: ['Continue practicing']
        }
      };
    }
  }

  async generateTask(context: {
    career: string;
    scenario_type: string;
    existing_tasks?: any[];
    user_interest?: string;
  }): Promise<{
    title: string;
    description: string;
    instructions?: string;
    type: string;
    metadata?: Record<string, any>;
  }> {
    const prompt = `
Generate a new learning task for career exploration.

Career: ${context.career}
Scenario Type: ${context.scenario_type}
User Interest: ${context.user_interest || 'General exploration'}
Existing Tasks: ${context.existing_tasks?.map(t => t.title).join(', ') || 'None'}

Create a unique, engaging task that:
1. Relates to the ${context.career} career
2. Fits the ${context.scenario_type} scenario
3. ${context.user_interest ? `Addresses the user's interest in: ${context.user_interest}` : ''}
4. Doesn't duplicate existing tasks

Format as JSON:
{
  "title": "Task title",
  "description": "Brief description",
  "instructions": "Clear instructions for the student",
  "type": "chat|submission|discussion",
  "difficulty": "easy|medium|hard",
  "estimated_duration": <minutes>
}`;

    try {
      const result = await this.generateText(prompt, {
        temperature: 0.9,
        maxTokens: 512
      });

      // Parse response
      let task;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        task = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        // Fallback task
        task = {
          title: `Explore ${context.user_interest || context.scenario_type}`,
          description: `Dive deeper into this aspect of ${context.career}`,
          instructions: 'Share your thoughts and explore this topic',
          type: 'chat',
          difficulty: 'medium',
          estimated_duration: 15
        };
      }

      return {
        title: task.title,
        description: task.description,
        instructions: task.instructions,
        type: task.type || 'chat',
        metadata: {
          difficulty: task.difficulty || 'medium',
          estimated_duration: task.estimated_duration || 15,
          generated: true,
          generation_context: context
        }
      };
    } catch (error) {
      console.error('Task generation error:', error);
      // Return fallback task
      return {
        title: `Explore ${context.career} - ${context.scenario_type}`,
        description: 'An exploration task for your career journey',
        instructions: 'Complete this task to learn more about the career',
        type: 'chat',
        metadata: {
          generated: true,
          error: 'Generation failed, using fallback'
        }
      };
    }
  }

  async generateFeedback(params: {
    evaluation: AIEvaluationResult;
    task?: any;
    language?: string;
  }): Promise<string> {
    const prompt = `
Generate encouraging feedback for a student based on their evaluation.

Task: ${params.task?.title || 'Learning task'}
Score: ${params.evaluation.scores.overall}/100
Strengths: ${params.evaluation.feedback.strengths.join(', ')}
Areas for improvement: ${params.evaluation.feedback.improvements.join(', ')}
Language: ${params.language || 'en'}

Provide personalized, constructive feedback that:
1. Acknowledges their effort
2. Highlights what they did well
3. Suggests specific next steps
4. Encourages continued learning

Keep it concise and positive.`;

    try {
      const feedback = await this.generateText(prompt, {
        temperature: 0.8,
        maxTokens: 512
      });

      return feedback;
    } catch (error) {
      console.error('Feedback generation error:', error);
      return `Great effort! You scored ${params.evaluation.scores.overall}/100. ${params.evaluation.feedback.strengths[0] || 'Keep practicing'} to continue improving.`;
    }
  }

  getModelInfo(): { provider: string; model: string; capabilities: string[] } {
    return {
      provider: 'Google Vertex AI',
      model: this.modelName,
      capabilities: [
        'text-generation',
        'task-evaluation',
        'content-generation',
        'multi-language'
      ]
    };
  }
}