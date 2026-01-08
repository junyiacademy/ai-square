import { Octokit } from "@octokit/rest";
import {
  CacheEntry,
  FileContent,
  GitHubFileContent,
  GitHubCommit,
  OctokitError,
} from "@/types";

export class GitHubStorage {
  private octokit: Octokit;
  private cache = new Map<string, CacheEntry>();
  private owner: string;
  private repo: string;
  private basePath: string = "cms/content";

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is required");
    }

    this.octokit = new Octokit({ auth: token });
    this.owner = process.env.GITHUB_OWNER || "junyiacademy";
    this.repo = process.env.GITHUB_REPO || "ai-square";
  }

  // Cache management
  private getCacheKey(method: string, path: string): string {
    return `${method}:${path}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(
    key: string,
    data: T,
    ttlMs: number = 5 * 60 * 1000,
  ): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  private invalidateCache(path?: string): void {
    if (!path) {
      this.cache.clear();
      return;
    }

    // Invalidate specific path and all parent paths
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(path)) {
        this.cache.delete(key);
      }
    });
  }

  // List files in a directory
  async listFiles(path: string = ""): Promise<FileContent[]> {
    const cacheKey = this.getCacheKey("list", path);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const fullPath = path ? `${this.basePath}/${path}` : this.basePath;
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
      });

      // GitHub API returns array for directories
      if (!Array.isArray(data)) {
        throw new Error("Expected directory but got file");
      }

      const files = data
        .filter(
          (item) =>
            item.type === "file" &&
            (item.name.endsWith(".yaml") || item.name.endsWith(".yml")),
        )
        .map((item) => ({
          name: item.name,
          path: item.path.replace(`${this.basePath}/`, ""),
          sha: item.sha,
          size: item.size,
          type: item.type as "file",
          content: "", // Content not loaded in list
        }));

      this.setCache(cacheKey, files);
      return files;
    } catch (error) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 404) {
        return [];
      }
      throw error;
    }
  }

  // Get file content
  async getFile(path: string): Promise<FileContent> {
    const cacheKey = this.getCacheKey("file", path);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const fullPath = `${this.basePath}/${path}`;
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
      });

      if (Array.isArray(data) || data.type !== "file") {
        throw new Error("Expected file but got directory");
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");

      const file: FileContent = {
        name: data.name,
        path: path,
        sha: data.sha,
        content,
        size: data.size,
        type: "file",
      };

      this.setCache(cacheKey, file, 2 * 60 * 1000); // Cache for 2 minutes
      return file;
    } catch (error) {
      console.error("Error getting file:", error);
      throw error;
    }
  }

  // Update file content
  async updateFile(
    path: string,
    content: string,
    message: string,
    branch?: string,
  ): Promise<void> {
    try {
      const fullPath = `${this.basePath}/${path}`;

      // Get current file to obtain SHA
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: fullPath,
          ref: branch,
        });

        if (!Array.isArray(data) && data.type === "file") {
          sha = data.sha;
        }
      } catch (error) {
        // File doesn't exist, will create new
        const octokitError = error as OctokitError;
        if (octokitError.status !== 404) throw error;
      }

      // Update or create file
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: fullPath,
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
        branch,
      });

      // Invalidate cache
      this.invalidateCache(path);
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  }

  // Branch management
  async getCurrentBranch(): Promise<string> {
    // In GitHub context, we don't have a "current" branch
    // This would be managed by the frontend state
    return "main";
  }

  async createBranch(branchName: string): Promise<void> {
    try {
      // Get the latest commit SHA from main branch
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: "heads/main",
      });

      // Create new branch
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      });
    } catch (error) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 422) {
        // Branch already exists
        console.log(`Branch ${branchName} already exists`);
      } else {
        throw error;
      }
    }
  }

  async listBranches(): Promise<string[]> {
    const { data } = await this.octokit.repos.listBranches({
      owner: this.owner,
      repo: this.repo,
    });

    return data.map((branch) => branch.name);
  }

  async deleteBranch(branchName: string): Promise<void> {
    if (branchName === "main") {
      throw new Error("Cannot delete main branch");
    }

    await this.octokit.git.deleteRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${branchName}`,
    });
  }

  // Pull Request management
  async createPullRequest(
    title: string,
    body: string,
    sourceBranch: string,
    targetBranch: string = "main",
  ): Promise<{ number: number; url: string }> {
    // Create PR first
    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      head: sourceBranch,
      base: targetBranch,
    });

    // Then add label
    try {
      await this.octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: data.number,
        labels: ["cms-content-change"],
      });
      console.log(`Added cms-content-change label to PR #${data.number}`);
    } catch (error) {
      console.error(`Failed to add label to PR #${data.number}:`, error);
    }

    return {
      number: data.number,
      url: data.html_url,
    };
  }

  // Get recent commits for PR description
  async getCommitsBetweenBranches(
    sourceBranch: string,
    targetBranch: string = "main",
  ): Promise<GitHubCommit[]> {
    const { data } = await this.octokit.repos.compareCommits({
      owner: this.owner,
      repo: this.repo,
      base: targetBranch,
      head: sourceBranch,
    });

    return data.commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || "Unknown",
        email: commit.commit.author?.email || "",
        date: commit.commit.author?.date || "",
      },
    }));
  }

  // Get commit details for a branch
  async getBranchDetails(branchName: string) {
    const { data } = await this.octokit.repos.getBranch({
      owner: this.owner,
      repo: this.repo,
      branch: branchName,
    });

    return data;
  }
}

// Singleton instance
let instance: GitHubStorage | null = null;

export function getGitHubStorage(): GitHubStorage {
  if (!instance) {
    instance = new GitHubStorage();
  }
  return instance;
}
