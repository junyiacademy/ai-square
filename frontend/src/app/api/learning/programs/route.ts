/**
 * Learning Programs API Routes
 * POST /api/learning/programs - Create new learning program
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { postgresqlLearningService } from "@/lib/services/postgresql-learning-service";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    // Parse request body
    const body = await request.json();
    const { scenarioId, metadata } = body;

    // Validate required fields
    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: "scenarioId is required" },
        { status: 400 },
      );
    }

    // Create learning program
    const result = await postgresqlLearningService.createLearningProgram(
      scenarioId,
      session.user.email,
      metadata,
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating learning program:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
