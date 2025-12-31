import { NextRequest, NextResponse } from "next/server";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";
import {
  getUnifiedAuth,
  createUnauthorizedResponse,
} from "@/lib/auth/unified-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  try {
    // Try to get user from authentication
    const session = await getUnifiedAuth(request);

    // If no auth, check if user info is in query params (for viewing history)
    let userEmail: string | null = null;

    if (session?.user.email) {
      userEmail = session.user.email;
    } else {
      // Check for user info from query params
      const { searchParams } = new URL(request.url);
      const emailParam = searchParams.get("userEmail");

      if (emailParam) {
        userEmail = emailParam;
      } else {
        return createUnauthorizedResponse();
      }
    }

    // Await params before using
    const { programId } = await params;

    const programRepo = repositoryFactory.getProgramRepository();
    const evaluationRepo = repositoryFactory.getEvaluationRepository();

    // Get program
    const program = await programRepo.findById(programId);
    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Verify ownership - need to get user ID from email
    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(userEmail);
    if (!user || program.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get evaluation for this program
    const evaluations = await evaluationRepo.findByProgram(programId);
    console.log("Found evaluations for program", programId, {
      evaluationsCount: evaluations.length,
      evaluationTypes: evaluations.map((e) => e.evaluationType),
      evaluationIds: evaluations.map((e) => e.id),
    });

    const evaluation = evaluations.find(
      (e) => e.evaluationType === "assessment_complete",
    );

    if (!evaluation) {
      console.error(
        "No assessment_complete evaluation found for program",
        programId,
        {
          evaluationCount: evaluations.length,
          evaluationTypes: evaluations.map((e) => ({
            type: e.evaluationType,
            subtype: e.evaluationSubtype,
          })),
        },
      );
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      evaluation,
      program,
    });
  } catch (error) {
    console.error("Error getting evaluation:", error);
    return NextResponse.json(
      { error: "Failed to load evaluation" },
      { status: 500 },
    );
  }
}
