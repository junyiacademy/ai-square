import { NextRequest, NextResponse } from "next/server";
import { getGitHubStorage } from "@/services/github-storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 },
      );
    }

    const storage = getGitHubStorage();
    const file = await storage.getFile(filePath);

    return NextResponse.json({
      content: file.content,
      path: filePath,
      sha: file.sha,
    });
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content, branch, message } = await request.json();

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: "File path and content are required" },
        { status: 400 },
      );
    }

    // Get current branch from session or use provided branch
    const currentBranch = branch || "main";

    // Use provided message or generate default
    const commitMessage =
      message ||
      `更新 ${filePath}

透過 AI Square CMS 更新內容

🤖 Generated with AI Square CMS`;

    const storage = getGitHubStorage();
    await storage.updateFile(filePath, content, commitMessage, currentBranch);

    return NextResponse.json({
      success: true,
      path: filePath,
      branch: currentBranch,
    });
  } catch (error) {
    console.error("Failed to save file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
