/**
 * AI Insights Generator
 *
 * Uses Vertex AI Gemini 2.5 Flash to generate insights from weekly statistics.
 *
 * Design Decisions:
 * - Dynamic import of Vertex AI SDK to avoid loading in test environment
 * - Graceful degradation: returns null if AI is unavailable
 * - Fast and cost-effective: Uses gemini-2.5-flash model
 */

import type { WeeklyStats } from "./db-queries";

interface AIInsight {
  summary: string;
  highlights: string[];
  recommendations: string[];
  concerns: string[];
}

/**
 * Generate AI insights from weekly statistics
 *
 * Uses dynamic import to avoid loading Vertex AI SDK in test environment.
 * Returns null if:
 * - Running in test environment
 * - Vertex AI is not configured
 * - AI generation fails (graceful degradation)
 */
export async function generateAIInsights(
  stats: WeeklyStats,
): Promise<AIInsight | null> {
  // Skip AI in test environment
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  // Check if Vertex AI is configured
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || "us-central1";

  if (!projectId) {
    console.warn("GCP_PROJECT_ID not configured, skipping AI insights");
    return null;
  }

  try {
    // Dynamic import to avoid loading in test environment
    const { VertexAI } = await import("@google-cloud/vertexai");

    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    const model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || "gemini-2.5-flash",
    });

    const prompt = buildPrompt(stats);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.warn("AI generated empty response");
      return null;
    }

    // Parse JSON response
    const insight = parseAIResponse(text);
    return insight;
  } catch (error) {
    console.error("Error generating AI insights:", error);
    // Graceful degradation: return null if AI fails
    return null;
  }
}

/**
 * Build prompt for AI model
 */
function buildPrompt(stats: WeeklyStats): string {
  return `你是一位教育分析專家，正在分析 AI Square 線上學習平台的週報數據。

請分析以下週報統計數據並提供洞察：

**用戶增長：**
- 總用戶數：${stats.userGrowth.totalUsers}
- 本週新增：${stats.userGrowth.newThisWeek}
- 上週新增：${stats.userGrowth.newLastWeek}
- 週增長率：${stats.userGrowth.weekOverWeekGrowth.toFixed(1)}%
- 每日趨勢：${stats.userGrowth.dailyTrend.join(", ")}
- 每日平均：${stats.userGrowth.avgPerDay.toFixed(1)}

**用戶參與：**
- 週活躍用戶：${stats.engagement.weeklyActiveUsers}
- 每日平均活躍：${stats.engagement.dailyAvgActive}
- 留存率：${stats.engagement.retentionRate.toFixed(1)}%
- 活躍率：${stats.engagement.activeRate.toFixed(1)}%

**學習數據：**
- 評量模式完成：${stats.learning.assessmentCompletions}
- PBL模式完成：${stats.learning.pblCompletions}
- 探索模式完成：${stats.learning.discoveryCompletions}
- 總完成次數：${stats.learning.totalCompletions}
- 完成率：${stats.learning.completionRate.toFixed(1)}%

**系統健康：**
${
  stats.systemHealth
    ? `- API 成功率：${stats.systemHealth.apiSuccessRate.toFixed(2)}%
- 平均回應時間：${stats.systemHealth.avgResponseTime}ms
- 運行時間：${stats.systemHealth.uptime.toFixed(2)}%
- 資料庫狀態：${stats.systemHealth.dbStatus}`
    : "- 尚未整合 Cloud Monitoring"
}

請以以下 JSON 格式提供洞察（**重要：JSON 欄位名稱保持英文，但內容必須使用繁體中文**）：
{
  "summary": "一句話整體摘要",
  "highlights": ["關鍵正面發現 1", "關鍵正面發現 2", "關鍵正面發現 3"],
  "recommendations": ["可行動建議 1", "可行動建議 2"],
  "concerns": ["潛在問題 1", "潛在問題 2"]
}

重點分析：
1. 用戶增長趨勢和模式
2. 參與質量和留存情況
3. 學習模式偏好和有效性
4. 系統性能和可靠性
5. 可行動的改進建議

要求：
- 摘要簡潔（最多 150 字元）
- 每個亮點/建議/問題最多 100 字元
- 每個類別提供 2-3 項
- **所有內容必須使用繁體中文**
- **僅返回 JSON，不要其他文字**`;
}

/**
 * Parse AI response text into structured insight
 */
function parseAIResponse(text: string): AIInsight | null {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.highlights) &&
      Array.isArray(parsed.recommendations) &&
      Array.isArray(parsed.concerns)
    ) {
      return parsed as AIInsight;
    }

    console.warn("AI response missing required fields");
    return null;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return null;
  }
}
