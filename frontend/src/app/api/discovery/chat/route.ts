import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import {
  hasTokenBudget,
  recordTokenUsage,
} from "@/lib/middleware/ai-token-tracker";

// Per-user rate limit: 10 requests per minute
const DISCOVERY_CHAT_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60_000,
  message:
    "你發送訊息太頻繁了，請稍等 1 分鐘後再試。(Rate limit: 10 requests/min)",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message || !context) {
      return NextResponse.json(
        { error: "Message and context are required" },
        { status: 400 }
      );
    }

    // Authenticate user for per-user limits
    const session = await getUnifiedAuth(request);
    let userId: string | null = null;

    if (session?.user?.email) {
      try {
        const userRepo = repositoryFactory.getUserRepository();
        const user = await userRepo.findByEmail(session.user.email);
        if (user) {
          userId = user.id;
        }
      } catch (err) {
        console.warn("[Discovery Chat] Could not resolve user for limits:", err);
      }
    }

    // Per-user rate limit (10 req/min)
    if (userId) {
      const rateLimitKey = `discovery-chat:${userId}`;
      const rateLimitResult = checkRateLimit(
        rateLimitKey,
        DISCOVERY_CHAT_RATE_LIMIT
      );
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: "Too Many Requests",
            message: DISCOVERY_CHAT_RATE_LIMIT.message,
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimitResult.retryAfter ?? 60),
              "X-RateLimit-Limit": String(DISCOVERY_CHAT_RATE_LIMIT.maxRequests),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }

    // Per-user daily token budget check
    if (userId) {
      const budgetOk = await hasTokenBudget(userId);
      if (!budgetOk) {
        return NextResponse.json(
          {
            response:
              "你今天的 AI 使用額度已用完（每日上限 200,000 tokens）。額度將於明天 UTC 午夜重置，請明天再來繼續學習！📚",
          },
          { status: 200 } // Return 200 to avoid breaking UI, same as other errors here
        );
      }
    }

    // Build the system prompt with context
    const systemPrompt = `You are an AI ${context.aiRole} helping a student with the "${context.pathTitle}" exploration path.

Current Context:
- Current Task: ${context.currentTask} (${context.taskIndex}/${context.totalTasks})
- Task Description: ${context.currentTaskDescription}
- Task Progress: ${context.taskProgress}%
- Completed Tasks: ${context.completedTasks}
- Path Skills: ${context.skills.join(", ")}
- Language: Traditional Chinese (Taiwan)

Your role is to:
1. Guide the student through the current task
2. Provide encouragement and constructive feedback
3. Answer questions related to ${context.pathTitle}
4. Give practical tips and examples
5. Celebrate their progress and achievements

Important guidelines:
- Be conversational and friendly
- Use emojis appropriately to make the conversation engaging
- Provide specific, actionable advice
- Relate answers to the current task when possible
- Keep responses concise but helpful (2-3 sentences ideal)
- Use Traditional Chinese for all responses
- Be encouraging and supportive`;

    const userPrompt = `Student message: ${message}

Please respond as the AI ${context.aiRole} in Traditional Chinese, being helpful, encouraging, and relevant to the current task.`;

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || "ai-square-463013",
      location: process.env.VERTEX_AI_LOCATION || "us-central1",
    });

    const model = vertexAI.preview.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Generate response using Vertex AI
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [
            {
              text: "我了解了，我會扮演AI助手的角色，用繁體中文友善地協助學生。",
            },
          ],
        },
        { role: "user", parts: [{ text: userPrompt }] },
      ],
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      throw new Error("No response generated");
    }

    // Record token usage asynchronously (non-blocking)
    if (userId) {
      const usageMetadata = response.usageMetadata;
      const tokensUsed =
        usageMetadata?.totalTokenCount ||
        Math.ceil((message.length + text.length) / 4);
      recordTokenUsage(userId, tokensUsed).catch((err) =>
        console.warn("[Discovery Chat] Token tracking failed:", err)
      );
    }

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("AI chat error:", error);

    // Return a generic error response
    return NextResponse.json(
      {
        response:
          "抱歉，我暫時無法處理你的訊息。請稍後再試，或者繼續探索當前的任務！💪",
      },
      { status: 200 } // Return 200 to avoid breaking the UI
    );
  }
}
