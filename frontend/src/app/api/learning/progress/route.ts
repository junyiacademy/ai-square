/**
 * Learning Progress API Route
 * GET /api/learning/progress - Get user learning progress
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { postgresqlLearningService } from "@/lib/services/postgresql-learning-service";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    // Get learning progress
    const result = await postgresqlLearningService.getLearningProgress(
      session.user.email,
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error("Error getting learning progress:", error);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
