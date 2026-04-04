/**
 * GET /api/discovery/user/budget
 *
 * Returns the current user's daily AI token budget status.
 * Response: { remaining, limit, sessionsRemaining, resetAt }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getBudgetStatus } from "@/lib/middleware/ai-token-tracker";

export async function GET(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const status = await getBudgetStatus(user.id);

    return NextResponse.json({
      remaining: status.tokensRemaining,
      limit: status.tokensLimit,
      sessionsRemaining: status.sessionsRemaining,
      sessionsLimit: status.sessionsLimit,
      resetAt: status.resetAt,
      tokensUsed: status.tokensUsed,
      sessionsStarted: status.sessionsStarted,
    });
  } catch (error) {
    console.error("[Budget API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget status" },
      { status: 500 }
    );
  }
}
