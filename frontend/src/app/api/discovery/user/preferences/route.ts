/**
 * GET  /api/discovery/user/preferences
 * POST /api/discovery/user/preferences
 *
 * Manages discovery preferences persisted in users.metadata.discoveryPreferences.
 * Used to save interest quiz results so they survive page refresh.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getPool } from "@/lib/db/get-pool";

export interface DiscoveryPreferences {
  interestQuizCompleted: boolean;
  interestScores?: {
    tech: number;
    creative: number;
    business: number;
  };
  interestAnswers?: Record<string, string[]>;
  completedAt?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const metadata = (user.metadata as Record<string, unknown>) || {};
    const preferences =
      (metadata.discoveryPreferences as DiscoveryPreferences) || null;

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error("Error fetching discovery preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<DiscoveryPreferences>;

    // Validate incoming data
    const preferences: DiscoveryPreferences = {
      interestQuizCompleted: body.interestQuizCompleted ?? false,
      interestScores: body.interestScores,
      interestAnswers: body.interestAnswers,
      completedAt: body.completedAt || new Date().toISOString(),
    };

    // Merge into existing metadata using raw SQL (UpdateUserDto doesn't expose metadata field)
    const pool = getPool();
    await pool.query(
      `UPDATE users
       SET metadata = COALESCE(metadata, '{}')::jsonb || jsonb_build_object('discoveryPreferences', $1::jsonb),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(preferences), user.id],
    );

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error("Error saving discovery preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
