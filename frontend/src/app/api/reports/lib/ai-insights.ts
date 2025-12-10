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

import type { WeeklyStats } from './db-queries';

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
  stats: WeeklyStats
): Promise<AIInsight | null> {
  // Skip AI in test environment
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  // Check if Vertex AI is configured
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

  if (!projectId) {
    console.warn('GCP_PROJECT_ID not configured, skipping AI insights');
    return null;
  }

  try {
    // Dynamic import to avoid loading in test environment
    const { VertexAI } = await import('@google-cloud/vertexai');

    const vertexAI = new VertexAI({
      project: projectId,
      location: location
    });

    const model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash'
    });

    const prompt = buildPrompt(stats);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.warn('AI generated empty response');
      return null;
    }

    // Parse JSON response
    const insight = parseAIResponse(text);
    return insight;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    // Graceful degradation: return null if AI fails
    return null;
  }
}

/**
 * Build prompt for AI model
 */
function buildPrompt(stats: WeeklyStats): string {
  return `You are an educational analytics expert analyzing weekly statistics for AI Square, an online learning platform.

Analyze the following weekly statistics and provide insights:

**User Growth:**
- Total Users: ${stats.userGrowth.totalUsers}
- New This Week: ${stats.userGrowth.newThisWeek}
- New Last Week: ${stats.userGrowth.newLastWeek}
- Week-over-Week Growth: ${stats.userGrowth.weekOverWeekGrowth.toFixed(1)}%
- Daily Trend: ${stats.userGrowth.dailyTrend.join(', ')}
- Average Per Day: ${stats.userGrowth.avgPerDay.toFixed(1)}

**Engagement:**
- Weekly Active Users: ${stats.engagement.weeklyActiveUsers}
- Daily Average Active: ${stats.engagement.dailyAvgActive}
- Retention Rate: ${stats.engagement.retentionRate.toFixed(1)}%
- Active Rate: ${stats.engagement.activeRate.toFixed(1)}%

**Learning:**
- Assessment Completions: ${stats.learning.assessmentCompletions}
- PBL Completions: ${stats.learning.pblCompletions}
- Discovery Completions: ${stats.learning.discoveryCompletions}
- Total Completions: ${stats.learning.totalCompletions}
- Completion Rate: ${stats.learning.completionRate.toFixed(1)}%

**System Health:**
- API Success Rate: ${stats.systemHealth.apiSuccessRate.toFixed(2)}%
- Average Response Time: ${stats.systemHealth.avgResponseTime}ms
- Uptime: ${stats.systemHealth.uptime.toFixed(2)}%
- Database Status: ${stats.systemHealth.dbStatus}

Provide insights in the following JSON format:
{
  "summary": "One-sentence overall summary",
  "highlights": ["Key positive finding 1", "Key positive finding 2", "Key positive finding 3"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "concerns": ["Potential concern 1", "Potential concern 2"]
}

Focus on:
1. User growth trends and patterns
2. Engagement quality and retention
3. Learning mode preferences and effectiveness
4. System performance and reliability
5. Actionable recommendations for improvement

Keep the summary concise (max 150 characters).
Keep each highlight/recommendation/concern to max 100 characters.
Provide 2-3 items for each category.

Return ONLY the JSON, no other text.`;
}

/**
 * Parse AI response text into structured insight
 */
function parseAIResponse(text: string): AIInsight | null {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (
      typeof parsed.summary === 'string' &&
      Array.isArray(parsed.highlights) &&
      Array.isArray(parsed.recommendations) &&
      Array.isArray(parsed.concerns)
    ) {
      return parsed as AIInsight;
    }

    console.warn('AI response missing required fields');
    return null;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return null;
  }
}
