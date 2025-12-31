import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BranchManager from "../BranchManager";

// Mock fetch
global.fetch = jest.fn();

describe("BranchManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  it("should render branch manager interface", () => {
    render(<BranchManager />);

    expect(screen.getByText("Branch Management")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter branch name"),
    ).toBeInTheDocument();
    expect(screen.getByText("Create Branch")).toBeInTheDocument();
  });

  it("should load and display pull requests", async () => {
    const mockPRs = [
      {
        number: 1,
        title: "feat: Add new scenario",
        state: "open",
        branch: "feature-branch",
        merged: false,
        url: "https://github.com/test/repo/pull/1",
      },
      {
        number: 2,
        title: "fix: Update existing scenario",
        state: "open",
        branch: "fix-branch",
        merged: false,
        url: "https://github.com/test/repo/pull/2",
      },
    ];

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pullRequests: mockPRs }),
    } as Response);

    render(<BranchManager />);

    await waitFor(() => {
      expect(screen.getByText("feat: Add new scenario")).toBeInTheDocument();
      expect(
        screen.getByText("fix: Update existing scenario"),
      ).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith("/api/branches/list");
  });

  it("should create a new branch", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pullRequests: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Branch created successfully",
        }),
      } as Response);

    render(<BranchManager />);

    const branchInput = screen.getByPlaceholderText("Enter branch name");
    fireEvent.change(branchInput, { target: { value: "new-feature-branch" } });

    fireEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/git/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "new-feature-branch",
        }),
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Branch created successfully"),
      ).toBeInTheDocument();
    });
  });

  it("should handle branch creation errors", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pullRequests: [] }),
      } as Response)
      .mockRejectedValueOnce(new Error("Branch creation failed"));

    render(<BranchManager />);

    const branchInput = screen.getByPlaceholderText("Enter branch name");
    fireEvent.change(branchInput, { target: { value: "invalid-branch" } });

    fireEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => {
      expect(screen.getByText("Error creating branch")).toBeInTheDocument();
    });
  });

  it("should prevent creating branch with empty name", () => {
    render(<BranchManager />);

    const createButton = screen.getByText("Create Branch");
    expect(createButton).toBeDisabled();
  });

  it("should enable create button when branch name is entered", () => {
    render(<BranchManager />);

    const branchInput = screen.getByPlaceholderText("Enter branch name");
    const createButton = screen.getByText("Create Branch");

    expect(createButton).toBeDisabled();

    fireEvent.change(branchInput, { target: { value: "new-branch" } });

    expect(createButton).not.toBeDisabled();
  });

  it("should create pull request for branch", async () => {
    const mockPRs = [
      {
        number: 1,
        title: "feat: Add new scenario",
        state: "open",
        branch: "feature-branch",
        merged: false,
        url: "https://github.com/test/repo/pull/1",
      },
    ];

    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pullRequests: mockPRs }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          pullRequest: {
            number: 2,
            title: "New PR",
            url: "https://github.com/test/repo/pull/2",
          },
        }),
      } as Response);

    render(<BranchManager />);

    await waitFor(() => {
      expect(screen.getByText("feat: Add new scenario")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create PR"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/git/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: "feature-branch",
          title: "feat: Add new scenario",
          description: "Automated PR created from CMS",
        }),
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Pull request created successfully"),
      ).toBeInTheDocument();
    });
  });

  it("should merge pull request", async () => {
    const mockPRs = [
      {
        number: 1,
        title: "feat: Add new scenario",
        state: "open",
        branch: "feature-branch",
        merged: false,
        url: "https://github.com/test/repo/pull/1",
      },
    ];

    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pullRequests: mockPRs }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    render(<BranchManager />);

    await waitFor(() => {
      expect(screen.getByText("feat: Add new scenario")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Merge"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/branches/feature-branch/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pullNumber: 1,
          commitTitle: "feat: Add new scenario",
        }),
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Pull request merged successfully"),
      ).toBeInTheDocument();
    });
  });

  it("should handle PR loading errors", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<BranchManager />);

    await waitFor(() => {
      expect(
        screen.getByText("Error loading pull requests"),
      ).toBeInTheDocument();
    });
  });

  it("should refresh pull requests list", async () => {
    const mockPRs = [
      {
        number: 1,
        title: "feat: Add new scenario",
        state: "open",
        branch: "feature-branch",
        merged: false,
        url: "https://github.com/test/repo/pull/1",
      },
    ];

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ pullRequests: mockPRs }),
    } as Response);

    render(<BranchManager />);

    await waitFor(() => {
      expect(screen.getByText("feat: Add new scenario")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("should display empty state when no PRs exist", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pullRequests: [] }),
    } as Response);

    render(<BranchManager />);

    await waitFor(() => {
      expect(screen.getByText("No open pull requests")).toBeInTheDocument();
    });
  });

  it("should show PR details and actions", async () => {
    const mockPRs = [
      {
        number: 1,
        title: "feat: Add new scenario",
        state: "open",
        branch: "feature-branch",
        merged: false,
        url: "https://github.com/test/repo/pull/1",
      },
    ];

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pullRequests: mockPRs }),
    } as Response);

    render(<BranchManager />);

    await waitFor(() => {
      expect(screen.getByText("feat: Add new scenario")).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("feature-branch")).toBeInTheDocument();
      expect(screen.getByText("Create PR")).toBeInTheDocument();
      expect(screen.getByText("Merge")).toBeInTheDocument();
    });
  });
});
