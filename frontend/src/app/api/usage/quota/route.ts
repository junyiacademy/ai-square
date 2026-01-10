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

    const quota = aiUsageTracker.getQuotaStatus(auth.user.email);

    return NextResponse.json({
      success: true,
      data: quota,
    });
  } catch (error) {
    console.error("[AI Usage] Failed to get quota:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get usage quota" },
      { status: 500 },
    );
  }
}
