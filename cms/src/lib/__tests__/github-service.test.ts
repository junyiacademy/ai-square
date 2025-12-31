import { GitHubService } from "../github-service";

// Mock Octokit
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
        getBranch: jest.fn(),
      },
      git: {
        createRef: jest.fn(),
        getRef: jest.fn(),
      },
      pulls: {
        create: jest.fn(),
        list: jest.fn(),
        merge: jest.fn(),
      },
    },
  })),
}));

describe("GitHubService", () => {
  let githubService: GitHubService;

  beforeEach(() => {
    githubService = new GitHubService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("listFiles", () => {
    it("should list files from root directory", async () => {
      const mockFiles = {
        data: [
          { name: "file1.yaml", type: "file", path: "file1.yaml" },
          { name: "dir1", type: "dir", path: "dir1" },
        ],
      };

      (
        githubService as any
      ).octokit.rest.repos.getContent.mockResolvedValueOnce(mockFiles);

      const result = await githubService.listFiles();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "file1.yaml",
        type: "file",
        path: "file1.yaml",
      });
    });

    it("should list files from subdirectory", async () => {
      const mockFiles = {
        data: [
          { name: "subfile.yaml", type: "file", path: "subdir/subfile.yaml" },
        ],
      };

      (
        githubService as any
      ).octokit.rest.repos.getContent.mockResolvedValueOnce(mockFiles);

      const result = await githubService.listFiles("subdir");

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("subdir/subfile.yaml");
    });

    it("should handle API errors", async () => {
      (
        githubService as any
      ).octokit.rest.repos.getContent.mockRejectedValueOnce(
        new Error("API Error"),
      );

      await expect(githubService.listFiles()).rejects.toThrow(
        "Failed to list files: API Error",
      );
    });
  });

  describe("readFile", () => {
    it("should read file content", async () => {
      const mockContent = {
        data: {
          content: Buffer.from("test content").toString("base64"),
          encoding: "base64",
        },
      };

      (
        githubService as any
      ).octokit.rest.repos.getContent.mockResolvedValueOnce(mockContent);

      const result = await githubService.readFile("test.yaml");

      expect(result).toBe("test content");
    });

    it("should handle read errors", async () => {
      (
        githubService as any
      ).octokit.rest.repos.getContent.mockRejectedValueOnce(
        new Error("File not found"),
      );

      await expect(githubService.readFile("nonexistent.yaml")).rejects.toThrow(
        "Failed to read file",
      );
    });
  });

  describe("saveFile", () => {
    it("should save file to main branch", async () => {
      (
        githubService as any
      ).octokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: "abc123" } },
      });

      await githubService.saveFile(
        "test.yaml",
        "new content",
        "Update test file",
      );

      expect(
        (githubService as any).octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        path: "test.yaml",
        message: "Update test file",
        content: Buffer.from("new content").toString("base64"),
        branch: "main",
      });
    });

    it("should save file to specific branch", async () => {
      (
        githubService as any
      ).octokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: "abc123" } },
      });

      await githubService.saveFile(
        "test.yaml",
        "new content",
        "Update test file",
        "feature-branch",
      );

      expect(
        (githubService as any).octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: "feature-branch",
        }),
      );
    });
  });

  describe("createBranch", () => {
    it("should create new branch from main", async () => {
      const mockMainBranch = {
        data: { commit: { sha: "main-sha" } },
      };

      (githubService as any).octokit.rest.repos.getBranch.mockResolvedValueOnce(
        mockMainBranch,
      );
      (githubService as any).octokit.rest.git.createRef.mockResolvedValueOnce(
        {},
      );

      await githubService.createBranch("new-feature");

      expect(
        (githubService as any).octokit.rest.git.createRef,
      ).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        ref: "refs/heads/new-feature",
        sha: "main-sha",
      });
    });

    it("should handle branch creation errors", async () => {
      (githubService as any).octokit.rest.repos.getBranch.mockRejectedValueOnce(
        new Error("Main branch not found"),
      );

      await expect(githubService.createBranch("new-feature")).rejects.toThrow(
        "Failed to create branch",
      );
    });
  });

  describe("createPullRequest", () => {
    it("should create pull request", async () => {
      const mockPR = {
        data: {
          number: 1,
          html_url: "https://github.com/test-owner/test-repo/pull/1",
          title: "Test PR",
        },
      };

      (githubService as any).octokit.rest.pulls.create.mockResolvedValueOnce(
        mockPR,
      );

      const result = await githubService.createPullRequest(
        "feature-branch",
        "Test PR",
        "Test description",
      );

      expect(result).toEqual({
        number: 1,
        url: "https://github.com/test-owner/test-repo/pull/1",
        title: "Test PR",
      });
    });

    it("should handle PR creation errors", async () => {
      (githubService as any).octokit.rest.pulls.create.mockRejectedValueOnce(
        new Error("Cannot create PR"),
      );

      await expect(
        githubService.createPullRequest(
          "feature-branch",
          "Test PR",
          "Test description",
        ),
      ).rejects.toThrow("Failed to create pull request");
    });
  });

  describe("listPullRequests", () => {
    it("should list open pull requests", async () => {
      const mockPRs = {
        data: [
          {
            number: 1,
            title: "PR 1",
            state: "open",
            head: { ref: "feature-1" },
            merged: false,
            html_url: "https://github.com/test-owner/test-repo/pull/1",
          },
          {
            number: 2,
            title: "PR 2",
            state: "open",
            head: { ref: "feature-2" },
            merged: false,
            html_url: "https://github.com/test-owner/test-repo/pull/2",
          },
        ],
      };

      (githubService as any).octokit.rest.pulls.list.mockResolvedValueOnce(
        mockPRs,
      );

      const result = await githubService.listPullRequests();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        number: 1,
        title: "PR 1",
        state: "open",
        branch: "feature-1",
        merged: false,
        url: "https://github.com/test-owner/test-repo/pull/1",
      });
    });
  });

  describe("mergePullRequest", () => {
    it("should merge pull request", async () => {
      (githubService as any).octokit.rest.pulls.merge.mockResolvedValueOnce({
        data: { merged: true, sha: "merge-sha" },
      });

      const result = await githubService.mergePullRequest(1, "Merge PR");

      expect(result).toBe(true);
      expect(
        (githubService as any).octokit.rest.pulls.merge,
      ).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        pull_number: 1,
        commit_title: "Merge PR",
      });
    });

    it("should handle merge failures", async () => {
      (githubService as any).octokit.rest.pulls.merge.mockResolvedValueOnce({
        data: { merged: false },
      });

      const result = await githubService.mergePullRequest(1, "Merge PR");

      expect(result).toBe(false);
    });
  });
});
