import { NextResponse } from "next/server";
import { getGitHubStorage } from "@/services/github-storage";
import { FileNode, FileContent } from "@/types";

// Helper function to organize flat list into tree structure
function buildFileTree(files: FileContent[]): FileNode[] {
  const tree: { [key: string]: FileNode } = {};

  // Initialize root directories
  const rootDirs = ["rubrics_data", "pbl_data", "assessment_data"];
  rootDirs.forEach((dir) => {
    tree[dir] = {
      name: dir,
      path: dir,
      type: "directory",
      children: [],
    };
  });

  // Process each file
  files.forEach((file) => {
    const pathParts = file.path.split("/");

    if (pathParts.length === 1) {
      // Top-level file in content directory
      const rootDir = pathParts[0].replace(/\.(yaml|yml)$/, "");
      if (tree[rootDir]) {
        tree[rootDir].children!.push({
          name: file.name,
          path: file.path,
          type: "file",
        });
      }
    } else {
      // File in subdirectory
      const rootDir = pathParts[0];
      if (tree[rootDir]) {
        tree[rootDir].children!.push({
          name: file.name,
          path: file.path,
          type: "file",
        });
      }
    }
  });

  // Filter out empty directories and sort
  return Object.values(tree)
    .filter((node) => node.children && node.children.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  try {
    const storage = getGitHubStorage();

    // Fetch files from each directory
    const directories = ["rubrics_data", "pbl_data", "assessment_data"];
    const allFiles: FileContent[] = [];

    for (const dir of directories) {
      try {
        const files = await storage.listFiles(dir);
        allFiles.push(...files);
      } catch (error) {
        console.error(`Failed to fetch files from ${dir}:`, error);
      }
    }

    // Build tree structure
    const fileTree = buildFileTree(allFiles);

    return NextResponse.json({ files: fileTree });
  } catch (error) {
    console.error("Failed to list files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 },
    );
  }
}
