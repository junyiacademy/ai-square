/**
 * GET /api/discovery/user/daily-challenges
 * Returns 1-3 random daily challenges from the user's active career YAML.
 * Derived from example_tasks in the YAML (beginner/intermediate/advanced levels).
 * No completion tracking — display only.
 */

import { NextRequest, NextResponse } from "next/server";
import { DiscoveryYAMLLoader } from "@/lib/services/discovery-yaml-loader";
import { getUnifiedAuth, createUnauthorizedResponse } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import { getPool } from "@/lib/db/get-pool";

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  xpReward: number;
  skillsImproved: string[];
  careerId: string;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Deterministic per-day seed so challenges stay consistent within a day
function todaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
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

    const lang = request.nextUrl.searchParams.get("lang") || "en";

    // Find the user's most recently active career
    const pool = getPool();
    const { rows } = await pool.query<{ metadata: Record<string, unknown>; skills: Record<string, unknown> }>(
      `SELECT metadata, skills FROM users WHERE id = $1`,
      [user.id],
    );

    const skills = rows[0]?.skills;
    // Pick career with most skill entries (most active)
    let activeCareerId: string | null = null;
    if (skills && typeof skills === "object" && !Array.isArray(skills)) {
      const entries = Object.entries(skills as Record<string, unknown>);
      if (entries.length > 0) {
        activeCareerId = entries.sort(
          ([, a], [, b]) =>
            Object.keys(b as Record<string, unknown>).length -
            Object.keys(a as Record<string, unknown>).length,
        )[0][0];
      }
    }

    // Fall back to first available career if none found
    if (!activeCareerId) {
      const loader = new DiscoveryYAMLLoader();
      const allPaths = await loader.scanPaths();
      activeCareerId = allPaths[0] ?? "app_developer";
    }

    const loader = new DiscoveryYAMLLoader();
    const pathData = await loader.loadPath(activeCareerId, lang);

    if (!pathData) {
      return NextResponse.json({ success: true, challenges: [], careerId: activeCareerId });
    }

    // Collect example tasks across all difficulty levels
    const exampleTasks = pathData.example_tasks as Record<
      string,
      Array<{ id: string; title: string; description: string; skills_improved: string[]; xp_reward: number }>
    > | undefined;

    if (!exampleTasks) {
      return NextResponse.json({ success: true, challenges: [], careerId: activeCareerId });
    }

    const allTasks: DailyChallenge[] = [];
    const difficultyMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
      beginner: "beginner",
      intermediate: "intermediate",
      advanced: "advanced",
    };

    for (const [difficulty, tasks] of Object.entries(exampleTasks)) {
      const diff = difficultyMap[difficulty] ?? "beginner";
      for (const task of tasks) {
        allTasks.push({
          id: task.id,
          title: task.title,
          description: task.description,
          difficulty: diff,
          xpReward: task.xp_reward ?? 50,
          skillsImproved: task.skills_improved ?? [],
          careerId: activeCareerId,
        });
      }
    }

    // Pick 3 deterministic-random tasks for today
    const rng = seededRandom(todaySeed());
    const shuffled = [...allTasks].sort(() => rng() - 0.5);
    const challenges = shuffled.slice(0, Math.min(3, shuffled.length));

    return NextResponse.json({ success: true, challenges, careerId: activeCareerId });
  } catch (error) {
    console.error("Error fetching daily challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily challenges" },
      { status: 500 },
    );
  }
}
