import { NextRequest, NextResponse } from "next/server";
import { getGitHubStorage } from "@/services/github-storage";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();
    const cookieStore = await cookies();

    // Get current branch from cookie
    const currentBranch = cookieStore.get("cms-branch")?.value || "main";

    // If already on a feature branch, return current branch
    if (currentBranch !== "main") {
      return NextResponse.json({
        success: true,
        branch: currentBranch,
        isNew: false,
        message: `Already on feature branch: ${currentBranch}`,
      });
    }

    // Create new feature branch with file name
    const sanitizedFileName = fileName
      ? fileName.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/\.ya?ml$/, "")
      : "edit";
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const newBranch = `cms-${sanitizedFileName}-${timestamp}`;

    const storage = getGitHubStorage();
    await storage.createBranch(newBranch);

    // Set branch in cookie
    const response = NextResponse.json({
      success: true,
      branch: newBranch,
      isNew: true,
      message: `Created new branch: ${newBranch}`,
    });

    response.cookies.set("cms-branch", newBranch, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Branch creation error:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const currentBranch = cookieStore.get("cms-branch")?.value || "main";

    return NextResponse.json({
      currentBranch,
      isOnMain: currentBranch === "main",
      hasUncommittedChanges: false, // Not applicable with GitHub API
    });
  } catch (error) {
    console.error("Branch status error:", error);
    return NextResponse.json(
      { error: "Failed to get branch status" },
      { status: 500 },
    );
  }
}

// New endpoint to switch branches
export async function PUT(request: NextRequest) {
  try {
    const { branch } = await request.json();

    const response = NextResponse.json({
      success: true,
      branch,
    });

    if (branch === "main") {
      // Clear the branch cookie to go back to main
      response.cookies.delete("cms-branch");
    } else {
      response.cookies.set("cms-branch", branch, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return response;
  } catch (error) {
    console.error("Branch switch error:", error);
    return NextResponse.json(
      { error: "Failed to switch branch" },
      { status: 500 },
    );
  }
}
