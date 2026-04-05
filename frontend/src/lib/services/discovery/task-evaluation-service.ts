import { VertexAIService } from "@/lib/ai/vertex-ai-service";
import { Interaction } from "@/lib/repositories/interfaces";

export interface DimensionScore {
  score: number;
  comment: string;
}

export interface EvaluationDimensions {
  understanding: DimensionScore;
  analysis: DimensionScore;
  practice: DimensionScore;
  expression: DimensionScore;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  completed: boolean;
  xpEarned: number;
  skillsImproved: string[];
  dimensions?: EvaluationDimensions;
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

  static buildRubricsEvaluationPrompt(
    taskTitle: string,
    taskInstructions: string,
    taskContent: Record<string, unknown>,
    userResponse: string,
    maxXP: number,
    userLanguage: string,
  ): string {
    const isZhTW = userLanguage === "zhTW" || userLanguage.startsWith("zh");

    const taskContext = [
      isZhTW
        ? `任務標題：${taskTitle}`
        : `Task Title: ${taskTitle}`,
      taskInstructions
        ? isZhTW
          ? `任務說明：${taskInstructions}`
          : `Instructions: ${taskInstructions}`
        : "",
      taskContent.description
        ? isZhTW
          ? `任務描述：${taskContent.description}`
          : `Description: ${taskContent.description}`
        : "",
      taskContent.instructions
        ? isZhTW
          ? `任務指示：${taskContent.instructions}`
          : `Task Instructions: ${taskContent.instructions}`
        : "",
      taskContent.worldSetting
        ? isZhTW
          ? `世界設定：${taskContent.worldSetting}`
          : `World Setting: ${taskContent.worldSetting}`
        : "",
      taskContent.career
        ? isZhTW
          ? `職涯背景：${taskContent.career}`
          : `Career Context: ${taskContent.career}`
        : "",
      taskContent.role
        ? isZhTW
          ? `學生角色：${taskContent.role}`
          : `Student Role: ${taskContent.role}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (isZhTW) {
      return `你是一位教育評估專家。請根據以下 4 個維度評估學生的回答，每個維度 25 分，總分 100 分。

**任務背景**
${taskContext}

**學習者回答**
${userResponse}

**評分標準**

**維度 1：理解力（25 分）**
- 21-25：準確辨識問題核心，展現對領域知識的理解
- 16-20：理解問題但概念不夠精確
- 11-15：部分理解，有知識缺口
- 6-10：理解表面但抓不到核心
- 0-5：完全偏離

**維度 2：分析力（25 分）**
- 21-25：有系統地拆解問題，考慮多面向
- 16-20：有分析但不夠全面
- 11-15：缺乏結構
- 6-10：只描述沒分析
- 0-5：沒有分析

**維度 3：實踐力（25 分）**
- 21-25：方案具體可行，考慮限制和風險
- 16-20：方向正確但缺執行細節
- 11-15：太籠統或不可行
- 6-10：只有想法沒有方案
- 0-5：沒有方案

**維度 4：表達力（25 分）**
- 21-25：條理清晰、邏輯連貫
- 16-20：大致清楚但需更好組織
- 11-15：能看出想法但混亂
- 6-10：很難理解
- 0-5：答非所問

**回饋原則**
1. 先肯定再建議（找到做對的地方真誠肯定）
2. 具體指出問題（不說「需要更深入」，說具體哪裡不夠）
3. 給出下一步（告訴學生如何改善）
4. 用導師口吻（不是考官）
5. 最多 3 個改進建議

**XP 計算**（基礎 XP：${maxXP}）
- 85分以上：100% XP
- 70-84分：80% XP
- 55-69分：60% XP
- 40-54分：40% XP
- 40分以下：20% XP

**判斷是否完成任務**：如果總分 >= 55 分且回答確實針對任務要求，completed = true

請以繁體中文回傳 JSON：
{
  "score": 總分(0-100),
  "dimensions": {
    "understanding": { "score": N, "comment": "具體評語" },
    "analysis": { "score": N, "comment": "具體評語" },
    "practice": { "score": N, "comment": "具體評語" },
    "expression": { "score": N, "comment": "具體評語" }
  },
  "completed": true/false,
  "feedback": "整體回饋文字（導師口吻，先肯定再建議）",
  "strengths": ["優點1", "優點2"],
  "improvements": ["建議1", "建議2", "建議3"],
  "xpEarned": N,
  "skillsImproved": ["實際展現的相關技能"]
}`;
    }

    return `You are an expert educational evaluator. Assess the student's response across 4 dimensions, each worth 25 points (total 100 points).

**Task Context**
${taskContext}

**Student's Response**
${userResponse}

**Scoring Rubrics**

**Dimension 1: Understanding (25 points)**
- 21-25: Accurately identifies core issues, demonstrates domain knowledge
- 16-20: Understands the problem but concepts lack precision
- 11-15: Partial understanding, knowledge gaps present
- 6-10: Surface understanding, misses the core
- 0-5: Completely off-track

**Dimension 2: Analysis (25 points)**
- 21-25: Systematically breaks down the problem, considers multiple angles
- 16-20: Some analysis but not comprehensive
- 11-15: Lacks structure
- 6-10: Describes without analyzing
- 0-5: No analysis

**Dimension 3: Practice (25 points)**
- 21-25: Concrete, feasible solution with consideration of constraints and risks
- 16-20: Right direction but lacks execution detail
- 11-15: Too vague or impractical
- 6-10: Ideas without actionable plans
- 0-5: No solution proposed

**Dimension 4: Expression (25 points)**
- 21-25: Clear structure, logical coherence
- 16-20: Generally clear but needs better organization
- 11-15: Ideas visible but disorganized
- 6-10: Difficult to understand
- 0-5: Off-topic

**Feedback Principles**
1. Affirm first, then suggest (genuinely acknowledge what's done right)
2. Be specific about issues (not "needs more depth" but exactly where it's lacking)
3. Give next steps (tell the student how to improve)
4. Use mentor tone (not examiner)
5. Maximum 3 improvement suggestions

**XP Calculation** (base XP: ${maxXP})
- 85+: 100% XP
- 70-84: 80% XP
- 55-69: 60% XP
- 40-54: 40% XP
- Below 40: 20% XP

**Task completion**: completed = true if total score >= 55 AND response genuinely addresses the task

Return JSON:
{
  "score": total(0-100),
  "dimensions": {
    "understanding": { "score": N, "comment": "specific comment" },
    "analysis": { "score": N, "comment": "specific comment" },
    "practice": { "score": N, "comment": "specific comment" },
    "expression": { "score": N, "comment": "specific comment" }
  },
  "completed": true/false,
  "feedback": "Overall feedback (mentor tone, affirm then suggest)",
  "strengths": ["strength1", "strength2"],
  "improvements": ["suggestion1", "suggestion2", "suggestion3"],
  "xpEarned": N,
  "skillsImproved": ["demonstrated relevant skills"]
}`;
  }

  static async evaluateTaskSubmission(
    task: { title?: unknown; metadata?: unknown; content?: unknown },
    userResponse: string,
    userLanguage: string,
  ): Promise<EvaluationResult> {
    const taskInstructions = this.getLocalizedValue(
      (task.metadata as Record<string, unknown>)?.instructions || "",
      userLanguage,
    );
    const maxXP =
      ((task.content as Record<string, unknown>)?.xp as number) || 100;
    const taskContent = (task.content as Record<string, unknown>) || {};

    const aiService = new VertexAIService({
      systemPrompt:
        "You are an expert educational evaluator specializing in career exploration for students aged 15-18. Evaluate responses using structured rubrics and provide constructive mentor-style feedback.",
      temperature: 0.7,
      model: "gemini-2.5-flash",
    });

    const taskTitle = this.getLocalizedValue(task.title, userLanguage);
    const localizedContent: Record<string, unknown> = {
      ...taskContent,
      description: taskContent.description
        ? this.getLocalizedValue(taskContent.description, userLanguage)
        : undefined,
      instructions: taskContent.instructions
        ? this.getLocalizedValue(taskContent.instructions, userLanguage)
        : undefined,
    };

    const evaluationPrompt = this.buildRubricsEvaluationPrompt(
      taskTitle,
      taskInstructions,
      localizedContent,
      userResponse,
      maxXP,
      userLanguage,
    );

    const aiResponse = await aiService.sendMessage(evaluationPrompt, {
      feature: "discovery-task-evaluation-service",
    });

    try {
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as EvaluationResult;
        // Ensure score is set (sum dimensions if missing)
        if (!parsed.score && parsed.dimensions) {
          parsed.score =
            (parsed.dimensions.understanding?.score || 0) +
            (parsed.dimensions.analysis?.score || 0) +
            (parsed.dimensions.practice?.score || 0) +
            (parsed.dimensions.expression?.score || 0);
        }
        return parsed;
      }
      throw new Error("No JSON found in AI response");
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      return {
        score: maxXP,
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
