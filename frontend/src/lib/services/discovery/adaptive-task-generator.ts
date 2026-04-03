/**
 * Adaptive Task Generator
 * Uses the Learner Model to generate difficulty-adjusted tasks via LLM.
 * Each task is generated one-at-a-time after the previous completes.
 */

import { VertexAIService } from "@/lib/ai/vertex-ai-service";
import { DiscoveryYAMLLoader, DiscoveryPath, SkillTreeSkill } from "@/lib/services/discovery-yaml-loader";
import { LearnerModelService } from "./learner-model-service";
import type { DifficultyLevel, GeneratedTask, LearnerModel } from "./gamification-types";

export class AdaptiveTaskGenerator {
  private learnerModelService: LearnerModelService;
  private yamlLoader: DiscoveryYAMLLoader;

  constructor() {
    this.learnerModelService = new LearnerModelService();
    this.yamlLoader = new DiscoveryYAMLLoader();
  }

  /**
   * Generate a single adaptive task for a user.
   * Uses learner model + YAML world setting + target skill to build the LLM prompt.
   */
  async generateTask(
    userId: string,
    careerId: string,
    targetSkillId: string,
    language: string = "en",
  ): Promise<GeneratedTask> {
    const [learnerModel, yamlData] = await Promise.all([
      this.learnerModelService.getLearnerModel(userId, careerId),
      this.yamlLoader.loadPath(careerId, language),
    ]);

    if (!yamlData) {
      throw new Error(`YAML data not found for career: ${careerId}`);
    }

    const allSkills = this.yamlLoader.extractAllSkills(yamlData);
    const targetSkill = allSkills.find((s) => s.id === targetSkillId) || allSkills[0];

    if (!targetSkill) {
      throw new Error(`Skill ${targetSkillId} not found in career ${careerId}`);
    }

    const prompt = this.buildAdaptivePrompt(learnerModel, yamlData, targetSkill, language);

    const aiService = new VertexAIService({
      systemPrompt: "You are an expert educational content designer. Always respond with valid JSON.",
      temperature: 0.7,
      model: "gemini-2.5-flash",
    });

    const response = await aiService.sendMessage(prompt, {
      feature: "adaptive-task-generator",
    });

    return this.parseTaskResponse(response.content, learnerModel.difficultyLevel, targetSkillId);
  }

  /**
   * Select the best skill to target based on learner model.
   * Prioritizes: struggle areas first, then least-practiced skills.
   */
  async selectTargetSkill(
    userId: string,
    careerId: string,
    language: string = "en",
  ): Promise<string> {
    const [learnerModel, yamlData] = await Promise.all([
      this.learnerModelService.getLearnerModel(userId, careerId),
      this.yamlLoader.loadPath(careerId, language),
    ]);

    if (!yamlData) throw new Error(`YAML not found for: ${careerId}`);

    const allSkills = this.yamlLoader.extractAllSkills(yamlData);
    if (allSkills.length === 0) throw new Error(`No skills defined for: ${careerId}`);

    // If there are struggle areas, target those first
    if (learnerModel.struggleAreas.length > 0) {
      const validStruggle = learnerModel.struggleAreas.find((s) =>
        allSkills.some((sk) => sk.id === s),
      );
      if (validStruggle) return validStruggle;
    }

    // Otherwise, pick a random core skill (weighted towards less practiced)
    const coreSkills = yamlData.skill_tree.core_skills || [];
    if (coreSkills.length > 0) {
      const randomIndex = Math.floor(Math.random() * coreSkills.length);
      return coreSkills[randomIndex].id;
    }

    return allSkills[0].id;
  }

  private buildAdaptivePrompt(
    model: LearnerModel,
    yamlData: DiscoveryPath,
    targetSkill: SkillTreeSkill,
    language: string,
  ): string {
    const ws = yamlData.world_setting;
    const difficultyGuidance = this.getDifficultyGuidance(model, targetSkill.id);

    return `你是「${ws.name}」的導師

## 世界觀
${ws.description}
氛圍：${ws.atmosphere}

## 學習者檔案
- 難度：${model.difficultyLevel}
- 已完成任務數：${model.totalTasksCompleted}
- 最近分數：${model.recentScores.slice(-5).join(", ") || "無"}
- 弱項技能：${model.struggleAreas.join(", ") || "無"}
- 強項技能：${model.strengthAreas.join(", ") || "無"}
- 平均分數：${Math.round(model.averageScore)}%
- 平均嘗試次數：${model.averageAttempts.toFixed(1)}

## 任務要求
目標技能：${targetSkill.name}（${targetSkill.description}）

## 難度調整規則
${difficultyGuidance}

## 輸出格式
回傳 JSON，不要加 markdown code block：
{
  "title": { "en": "Task title in English", "zhTW": "任務標題中文" },
  "description": { "en": "Description in English", "zhTW": "描述中文" },
  "objectives": ["Objective 1", "Objective 2"],
  "hints": ["Hint 1"],
  "completionCriteria": "Criteria to pass",
  "xpReward": ${this.calculateXpReward(model.difficultyLevel)},
  "skillsTargeted": ["${targetSkill.id}"],
  "difficulty": "${model.difficultyLevel}",
  "scaffolding": ${model.struggleAreas.includes(targetSkill.id)}
}

Write the task content in language: ${language}
Make the task fit naturally within the "${ws.name}" world setting.`;
  }

  private getDifficultyGuidance(model: LearnerModel, targetSkillId: string): string {
    const isStruggle = model.struggleAreas.includes(targetSkillId);
    const isStrength = model.strengthAreas.includes(targetSkillId);

    if (isStruggle) {
      return `- 學員在此技能表現較弱 → 提供更多引導、分步驟、給提示
- 簡化問題、提供範例
- 確保學員能成功完成以建立信心`;
    }

    if (isStrength) {
      return `- 學員在此技能已很強 → 加入邊界案例、跨技能應用、限制條件
- 增加挑戰性，要求深入分析
- 減少提示，鼓勵獨立思考`;
    }

    switch (model.difficultyLevel) {
      case "beginner":
        return "- 初學者 → 基礎概念、清楚的步驟說明、給多一點提示";
      case "intermediate":
        return "- 中級 → 實際應用、適度挑戰、給 1-2 個提示";
      case "advanced":
        return "- 進階 → 複雜情境、需要多步驟推理、最少提示";
      case "expert":
        return "- 專家 → 開放式問題、需要創新思維、不給提示";
      default:
        return "- 適度挑戰";
    }
  }

  private calculateXpReward(difficulty: DifficultyLevel): number {
    const rewards: Record<DifficultyLevel, number> = {
      beginner: 50,
      intermediate: 80,
      advanced: 120,
      expert: 200,
    };
    return rewards[difficulty] || 50;
  }

  private parseTaskResponse(
    content: string,
    fallbackDifficulty: DifficultyLevel,
    fallbackSkillId: string,
  ): GeneratedTask {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        title: typeof parsed.title === "object" ? parsed.title : { en: String(parsed.title) },
        description: typeof parsed.description === "object" ? parsed.description : { en: String(parsed.description) },
        objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
        hints: Array.isArray(parsed.hints) ? parsed.hints : [],
        completionCriteria: parsed.completionCriteria || "Complete the task objectives",
        xpReward: parsed.xpReward || this.calculateXpReward(fallbackDifficulty),
        skillsTargeted: parsed.skillsTargeted || [fallbackSkillId],
        difficulty: parsed.difficulty || fallbackDifficulty,
        scaffolding: parsed.scaffolding ?? false,
      };
    } catch {
      // Return a safe fallback
      return {
        title: { en: "Practice Task" },
        description: { en: content.slice(0, 500) },
        objectives: ["Complete the given exercise"],
        hints: [],
        completionCriteria: "Submit a complete response",
        xpReward: this.calculateXpReward(fallbackDifficulty),
        skillsTargeted: [fallbackSkillId],
        difficulty: fallbackDifficulty,
        scaffolding: false,
      };
    }
  }
}
