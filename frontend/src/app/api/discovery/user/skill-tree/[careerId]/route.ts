/**
 * GET /api/discovery/user/skill-tree/[careerId]
 * Returns skill tree with user progress overlaid
 */

import { NextRequest, NextResponse } from "next/server";
import { SkillProgressService } from "@/lib/services/discovery/skill-progress-service";
import { getUnifiedAuth, createUnauthorizedResponse } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> },
) {
  try {
    const { careerId } = await params;

    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const language = request.nextUrl.searchParams.get("lang") || "en";
    const service = new SkillProgressService();
    const skillTree = await service.getSkillTreeWithProgress(user.id, careerId, language);

    return NextResponse.json({ success: true, skillTree });
  } catch (error) {
    console.error("Error fetching skill tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch skill tree" },
      { status: 500 },
    );
  }
}
