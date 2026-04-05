/**
 * GET /api/discovery/leaderboard
 * Returns leaderboard with current user's rank highlighted, ±2 around them.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/get-pool";
import { getUnifiedAuth, createUnauthorizedResponse } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
  level: number;
  isCurrentUser: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const currentUser = await userRepo.findByEmail(session.user.email);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pool = getPool();

    // Fetch top 50 users by XP
    const { rows } = await pool.query<{
      id: string;
      name: string;
      total_xp: number;
      level: number;
    }>(
      `SELECT id, name, total_xp, level
       FROM users
       ORDER BY total_xp DESC
       LIMIT 50`,
    );

    // Assign ranks
    const ranked: LeaderboardEntry[] = rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.id,
      name: row.name ?? "Anonymous",
      totalXp: row.total_xp ?? 0,
      level: row.level ?? 1,
      isCurrentUser: row.id === currentUser.id,
    }));

    // Find current user's position
    const currentUserIdx = ranked.findIndex((e) => e.isCurrentUser);

    let visible: LeaderboardEntry[];
    if (currentUserIdx === -1) {
      // User not in top 50 — show top 5 without a highlighted row
      visible = ranked.slice(0, 5);
    } else {
      // Show ±2 around the user
      const start = Math.max(0, currentUserIdx - 2);
      const end = Math.min(ranked.length - 1, currentUserIdx + 2);
      visible = ranked.slice(start, end + 1);
    }

    return NextResponse.json({
      success: true,
      leaderboard: visible,
      currentUserRank: currentUserIdx === -1 ? null : currentUserIdx + 1,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
