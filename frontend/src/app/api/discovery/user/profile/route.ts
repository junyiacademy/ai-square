/**
 * GET /api/discovery/user/profile
 * Returns gamification profile: level, XP, achievements, streak, skill progress
 */

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/get-pool";
import { GamificationRepository } from "@/lib/repositories/postgresql/gamification-repository";
import { getUnifiedAuth, createUnauthorizedResponse } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

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

    const repo = new GamificationRepository(getPool());
    const profile = await repo.getProfile(user.id);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching gamification profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}
