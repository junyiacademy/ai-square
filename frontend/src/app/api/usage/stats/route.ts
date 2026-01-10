import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { aiUsageTracker } from "@/lib/ai/usage-tracker";

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    if (!auth) {
      return createUnauthorizedResponse();
    }

    const isAdmin = auth.user.role === "admin";
    const userKey = isAdmin ? undefined : auth.user.email;

    const stats = aiUsageTracker.getStats({
      userKey,
      sinceMs: 30 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      scope: isAdmin ? "all" : "user",
      data: stats,
    });
  } catch (error) {
    console.error("[AI Usage] Failed to get stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get usage stats" },
      { status: 500 },
    );
  }
}
