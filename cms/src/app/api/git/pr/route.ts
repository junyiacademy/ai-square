import { NextRequest, NextResponse } from "next/server";
import { getGitHubStorage } from "@/services/github-storage";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { title, body } = await request.json();
    const cookieStore = await cookies();

    if (!title) {
      return NextResponse.json(
        { error: "PR title is required" },
        { status: 400 },
      );
    }

    // Get current branch from cookie
    const currentBranch = cookieStore.get("cms-branch")?.value || "main";

    // If we're on main, no PR to create
    if (currentBranch === "main") {
      return NextResponse.json({
        success: false,
        message:
          "Please make some changes and save first to create a feature branch.",
      });
    }

    const storage = getGitHubStorage();

    // Get commits for this branch
    const commits = await storage.getCommitsBetweenBranches(
      currentBranch,
      "main",
    );
    console.log(
      "Found commits:",
      commits.map((c) => ({
        sha: c.sha.substring(0, 7),
        message: c.message.substring(0, 50) + "...",
      })),
    );

    // Generate intelligent PR description using LLM
    let detailedBody = body || "Content updates made via AI Square CMS";

    try {
      console.log("Generating PR description with commits:", commits.length);
      const descResponse = await fetch(
        `${request.headers.get("origin") || "http://localhost:3000"}/api/git/generate-pr-description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commits,
            branch: currentBranch,
          }),
        },
      );

      if (!descResponse.ok) {
        console.error("PR description API failed:", descResponse.status);
      }

      const descData = await descResponse.json();
      console.log("PR description response:", descData);

      if (descData.success) {
        detailedBody = descData.description;
        console.log("Using AI-generated PR description");
      } else {
        console.log("AI generation failed, using fallback");
      }
    } catch (error) {
      console.error("Failed to generate AI PR description:", error);

      // Fallback to detailed commit list
      detailedBody = `${body || "Content updates made via AI Square CMS"}

## 📝 變更摘要

本次 PR 包含 ${commits.length} 個提交：

${commits
  .map((commit) => {
    const lines = commit.message.split("\n");
    const summary = lines[0];
    const details = lines.slice(1).join("\n").trim();
    return `### ${summary}
${details ? "\n" + details : ""}
`;
  })
  .join("\n")}`;
    }

    // Add footer
    detailedBody += `

---
🤖 Generated with AI Square CMS
Branch: \`${currentBranch}\`

> 💡 **提示**：合併後可以安全刪除此分支`;

    // Create PR
    const pr = await storage.createPullRequest(
      title,
      detailedBody,
      currentBranch,
      "main",
    );

    // Clear branch cookie to switch back to main
    const response = NextResponse.json({
      success: true,
      prUrl: pr.url,
      prNumber: pr.number,
      branch: currentBranch,
      message: "Pull request created successfully",
      description: detailedBody,
    });

    response.cookies.delete("cms-branch");

    return response;
  } catch (error) {
    console.error("Create PR error:", error);
    return NextResponse.json(
      { error: "Failed to create pull request" },
      { status: 500 },
    );
  }
}
