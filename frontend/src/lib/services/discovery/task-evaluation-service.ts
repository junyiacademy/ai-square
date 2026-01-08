import { VertexAIService } from "@/lib/ai/vertex-ai-service";
import { Interaction } from "@/lib/repositories/interfaces";

export interface EvaluationResult {
  feedback: string;
  strengths: string[];
  improvements: string[];
  completed: boolean;
  xpEarned: number;
  skillsImproved: string[];
}

export class TaskEvaluationService {
  static getLocalizedValue(obj: unknown, language: string): string {
    if (typeof obj === "string") return obj;
    if (typeof obj === "object" && obj !== null) {
      const multilingualObj = obj as Record<string, string>;
      return (
        multilingualObj[language] ||
        multilingualObj["en"] ||
        JSON.stringify(obj)
      );
    }
    return String(obj);
  }

  static async evaluateTaskSubmission(
    task: { title?: unknown; metadata?: unknown; content?: unknown },
    userResponse: string,
    userLanguage: string,
  ): Promise<EvaluationResult> {
    const taskInstructions =
      (task.metadata as Record<string, unknown>)?.instructions || "";
    const maxXP =
      ((task.content as Record<string, unknown>)?.xp as number) || 100;
    const taskContent = (task.content as Record<string, unknown>) || {};

    const aiService = new VertexAIService({
      systemPrompt:
        userLanguage === "zhTW"
          ? "你是嚴格的學習評估助手。請根據任務要求客觀評估學習者是否真正完成了任務。如果回答與任務無關或未完成要求，必須給予誠實的評估。"
          : "You are a strict learning evaluator. Objectively assess if the learner actually completed the task based on requirements. If response is unrelated or incomplete, provide honest assessment.",
      temperature: 0.7,
      model: "gemini-2.5-flash",
    });

    const evaluationPrompt =
      userLanguage === "zhTW"
        ? `嚴格評估學習者是否完成了指定任務：

任務標題：${this.getLocalizedValue(task.title, userLanguage)}
任務說明：${this.getLocalizedValue(taskInstructions, userLanguage)}
${taskContent.description ? `任務描述：${this.getLocalizedValue(taskContent.description, userLanguage)}` : ""}
${taskContent.instructions ? `任務指示：${this.getLocalizedValue(taskContent.instructions, userLanguage)}` : ""}
${taskContent.requirements ? `具體要求：${JSON.stringify(taskContent.requirements)}` : ""}

學習者回答：
${userResponse}

請仔細判斷：
1. 回答是否真的針對任務要求？
2. 是否實際完成了要求的內容？
3. 如果回答與任務無關，completed 必須為 false

請用繁體中文以 JSON 格式回覆：
{
  "feedback": "具體說明是否完成任務及原因",
  "strengths": ["優點（如果有）"],
  "improvements": ["必須改進的地方"],
  "completed": true/false（嚴格判斷）,
  "xpEarned": number (0-${maxXP}，未完成任務應該很低),
  "skillsImproved": ["實際展現的相關技能"]
}`
        : `Strictly evaluate if the learner completed the assigned task:

Task Title: ${this.getLocalizedValue(task.title, userLanguage)}
Instructions: ${this.getLocalizedValue(taskInstructions, userLanguage)}
${taskContent.description ? `Description: ${this.getLocalizedValue(taskContent.description, userLanguage)}` : ""}
${taskContent.instructions ? `Task Instructions: ${this.getLocalizedValue(taskContent.instructions, userLanguage)}` : ""}
${taskContent.requirements ? `Requirements: ${JSON.stringify(taskContent.requirements)}` : ""}

Learner's Response:
${userResponse}

Carefully judge:
1. Does the response address the task requirements?
2. Did they actually complete what was asked?
3. If response is unrelated to task, completed MUST be false

Return JSON:
{
  "feedback": "Specific feedback on task completion",
  "strengths": ["Strengths if any"],
  "improvements": ["What needs improvement"],
  "completed": true/false (strict judgment),
  "xpEarned": number (0-${maxXP}, should be low if not completed),
  "skillsImproved": ["Actually demonstrated relevant skills"]
}`;

    const aiResponse = await aiService.sendMessage(evaluationPrompt);

    try {
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as EvaluationResult;
      }
      throw new Error("No JSON found in AI response");
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      return {
        feedback: aiResponse.content,
        completed: true,
        xpEarned: maxXP,
        strengths: [],
        improvements: [],
        skillsImproved: [],
      };
    }
  }

  static createUserInteraction(content: {
    response: string;
    timeSpent?: number;
  }): Interaction {
    return {
      timestamp: new Date().toISOString(),
      type: "user_input",
      content: content.response,
      metadata: {
        timeSpent: content.timeSpent || 0,
      },
    };
  }

  static createAIInteraction(evaluationResult: EvaluationResult): Interaction {
    return {
      timestamp: new Date().toISOString(),
      type: "ai_response",
      content: evaluationResult,
      metadata: {
        completed: evaluationResult.completed,
        xpEarned: evaluationResult.xpEarned,
      },
    };
  }
}
