import { VertexAI, SchemaType } from "@google-cloud/vertexai";

// Language names mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zhTW: "Traditional Chinese (繁體中文)",
  "zh-TW": "Traditional Chinese (繁體中文)",
  zhCN: "Simplified Chinese (简体中文)",
  "zh-CN": "Simplified Chinese (简体中文)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
};

// Types for feedback structure
export interface FeedbackStrength {
  area: string;
  description: string;
  example: string;
}

export interface FeedbackImprovement {
  area: string;
  description: string;
  suggestion: string;
}

export interface QualitativeFeedback {
  overallAssessment: string;
  strengths: FeedbackStrength[];
  areasForImprovement: FeedbackImprovement[];
  nextSteps: string[];
  encouragement: string;
}

export interface TaskSummary {
  taskId: string;
  score: number;
  conversations: string[];
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface PerformanceData {
  overallScore: number;
  evaluatedTasks: number;
  totalTasks: number;
  totalTimeSeconds: number;
  domainScores: Record<string, number>;
  taskSummaries: TaskSummary[];
}

export interface ScenarioContext {
  title: string;
  learningObjectives: string[];
}

/**
 * Service for generating AI-powered qualitative feedback
 * Encapsulates Vertex AI integration and feedback generation logic
 */
export class FeedbackGenerationService {
  private vertexAI: VertexAI;
  private model: ReturnType<VertexAI["getGenerativeModel"]>;

  // Feedback JSON schema for structured output
  private readonly feedbackSchema = {
    type: SchemaType.OBJECT,
    properties: {
      overallAssessment: {
        type: SchemaType.STRING,
        description: "Brief overall assessment of performance",
      },
      strengths: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            area: {
              type: SchemaType.STRING,
              description: "Specific strength area",
            },
            description: {
              type: SchemaType.STRING,
              description: "Detailed description of what they did well",
            },
            example: {
              type: SchemaType.STRING,
              description: "Specific example from their conversations",
            },
          },
          required: ["area", "description", "example"],
        },
      },
      areasForImprovement: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            area: {
              type: SchemaType.STRING,
              description: "Area needing improvement",
            },
            description: {
              type: SchemaType.STRING,
              description: "What needs work",
            },
            suggestion: {
              type: SchemaType.STRING,
              description: "Specific actionable suggestion",
            },
          },
          required: ["area", "description", "suggestion"],
        },
      },
      nextSteps: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          description: "Specific next step",
        },
      },
      encouragement: {
        type: SchemaType.STRING,
        description: "Personalized encouraging message",
      },
    },
    required: [
      "overallAssessment",
      "strengths",
      "areasForImprovement",
      "nextSteps",
      "encouragement",
    ],
  };

  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || "ai-square-463013",
      location: process.env.VERTEX_AI_LOCATION || "us-central1",
    });

    this.model = this.vertexAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are a multilingual AI literacy education expert providing qualitative feedback for Problem-Based Learning scenarios.
Your role is to analyze learners' performance based on their conversations and provide constructive, encouraging feedback.

Focus on:
1. Identifying strengths and positive behaviors
2. Highlighting areas for improvement with specific suggestions
3. Relating feedback to the scenario's learning objectives
4. Providing actionable next steps

Keep the tone supportive, encouraging, and educational.

CRITICAL: You must ALWAYS respond in the EXACT language specified in the prompt. If Japanese is requested, respond ONLY in Japanese. If French is requested, respond ONLY in French. Never mix languages.

You must always respond with a valid JSON object following the exact schema provided.`,
    });
  }

  /**
   * Generate qualitative feedback for learner performance
   */
  async generateQualitativeFeedback(
    performanceData: PerformanceData,
    scenarioContext: ScenarioContext,
    language: string,
  ): Promise<QualitativeFeedback> {
    try {
      const prompt = this.buildPrompt(
        performanceData,
        scenarioContext,
        language,
      );

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65535,
          responseMimeType: "application/json",
          responseSchema: this.feedbackSchema,
        },
      });

      const response = result.response;
      const feedbackText =
        response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      return this.parseFeedbackResponse(feedbackText, language);
    } catch (error) {
      console.error("Error generating feedback:", error);
      return this.getFallbackFeedback(language);
    }
  }

  /**
   * Build the prompt for feedback generation
   */
  buildPrompt(
    performanceData: PerformanceData,
    scenarioContext: ScenarioContext,
    language: string,
  ): string {
    const languageName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES["en"];

    return `
Analyze this learner's performance in the "${scenarioContext.title}" scenario.

Scenario Objectives:
${scenarioContext.learningObjectives?.join("\n") || "General AI literacy improvement"}

Overall Performance:
- Overall Score: ${performanceData.overallScore}%
- Tasks Completed: ${performanceData.evaluatedTasks}/${performanceData.totalTasks}
- Total Time: ${Math.round((performanceData.totalTimeSeconds || 0) / 60)} minutes

Task Performance:
${performanceData.taskSummaries
  .map(
    (task, index) => `
Task ${index + 1}: Score ${task.score}%
Key conversations: ${task.conversations.slice(0, 3).join("; ")}
Feedback: ${task.feedback}
`,
  )
  .join("\n")}

Domain Scores:
${Object.entries(performanceData.domainScores || {})
  .map(([domain, score]) => `${domain}: ${score}%`)
  .join("\n")}

Generate comprehensive qualitative feedback for this learner's performance.

The feedback should:
- Provide an overall assessment that summarizes their performance
- Identify at least 2 specific strengths with concrete examples from their conversations
- Highlight 2-3 areas for improvement with actionable suggestions
- Suggest 2-3 specific next steps for continued learning
- End with a personalized encouraging message

IMPORTANT: You MUST provide ALL feedback in ${languageName} language.
Do not mix languages. The entire response must be in ${languageName}.
`;
  }

  /**
   * Parse and validate feedback response with error handling
   */
  private parseFeedbackResponse(
    feedbackText: string,
    language: string,
  ): QualitativeFeedback {
    try {
      return JSON.parse(feedbackText) as QualitativeFeedback;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Response text:", feedbackText);

      // Try to repair truncated JSON
      const repaired = this.repairTruncatedJSON(feedbackText);
      if (repaired) {
        try {
          return JSON.parse(repaired) as QualitativeFeedback;
        } catch (repairError) {
          console.error("Failed to parse repaired JSON:", repairError);
        }
      }

      // Return fallback feedback
      return this.getFallbackFeedback(language);
    }
  }

  /**
   * Attempt to repair truncated JSON responses
   * Returns repaired JSON string or null if repair fails
   */
  repairTruncatedJSON(truncatedJson: string): string | null {
    if (!truncatedJson.includes("{")) {
      return null;
    }

    try {
      let repairedJson = truncatedJson.trim();

      // Count open braces and brackets
      const openBraces = (repairedJson.match(/{/g) || []).length;
      const closeBraces = (repairedJson.match(/}/g) || []).length;
      const openBrackets = (repairedJson.match(/\[/g) || []).length;
      const closeBrackets = (repairedJson.match(/]/g) || []).length;

      // Check if there's an unclosed string by counting quotes
      const quoteCount = (repairedJson.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        // Odd number of quotes means unclosed string
        repairedJson += '"';
      }

      // Close unclosed arrays
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repairedJson += "]";
      }

      // Close unclosed objects
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repairedJson += "}";
      }

      // Validate repaired JSON
      JSON.parse(repairedJson);
      return repairedJson;
    } catch {
      return null;
    }
  }

  /**
   * Get fallback feedback when AI generation fails
   */
  getFallbackFeedback(language: string): QualitativeFeedback {
    if (language === "zhTW" || language === "zh-TW") {
      return {
        overallAssessment: "已完成效能分析評估",
        strengths: [
          {
            area: "任務完成",
            description: "成功完成情境任務",
            example: "積極與 AI 助手互動",
          },
        ],
        areasForImprovement: [
          {
            area: "進階練習",
            description: "持續探索 AI 的能力",
            suggestion: "嘗試更複雜的情境以加深理解",
          },
        ],
        nextSteps: ["回顧情境目標並反思學習成果", "探索更多 AI 素養資源"],
        encouragement: "做得很好!完成了這個情境!繼續探索和學習 AI 吧。",
      };
    }

    // Default English fallback
    return {
      overallAssessment: "Performance analysis completed",
      strengths: [
        {
          area: "Task Completion",
          description: "Successfully completed the scenario tasks",
          example: "Engaged actively with the AI assistant",
        },
      ],
      areasForImprovement: [
        {
          area: "Further Practice",
          description: "Continue exploring AI capabilities",
          suggestion: "Try more complex scenarios to deepen understanding",
        },
      ],
      nextSteps: [
        "Review the scenario objectives and reflect on learning",
        "Explore additional AI literacy resources",
      ],
      encouragement:
        "Great job completing this scenario! Keep exploring and learning about AI.",
    };
  }
}
