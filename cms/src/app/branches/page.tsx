"use client";

import { useState, useEffect } from "react";
import {
  GitBranch,
  GitPullRequest,
  Clock,
  User,
  GitCommit,
  FileText,
  Eye,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ExternalLink,
  Merge,
} from "lucide-react";
import Link from "next/link";

interface BranchDetails {
  name: string;
  creatorEmail: string;
  creationTime: string;
  commitsAhead: number;
  lastCommitMessage: string;
  prNumber?: number;
  prStatus?: "open" | "closed" | "merged";
  prUrl?: string;
}

interface DiffFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}

interface BranchDiff {
  branch: string;
  aheadBy: number;
  behindBy: number;
  files: DiffFile[];
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [branchDiffs, setBranchDiffs] = useState<Record<string, BranchDiff>>(
    {},
  );
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null);
  const [processingBranch, setProcessingBranch] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/branches/list");
      const data = await response.json();
      if (data.success) {
        setBranches(data.branches);
      }
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranchDiff = async (branchName: string) => {
    if (branchDiffs[branchName]) return;

    setLoadingDiff(branchName);
    try {
      const response = await fetch(
        `/api/branches/${encodeURIComponent(branchName)}/diff`,
      );
      const data = await response.json();
      if (data.success) {
        setBranchDiffs((prev) => ({ ...prev, [branchName]: data }));
      }
    } catch (error) {
      console.error("Failed to load diff:", error);
    } finally {
      setLoadingDiff(null);
    }
  };

  const toggleBranch = async (branchName: string) => {
    if (expandedBranch === branchName) {
      setExpandedBranch(null);
    } else {
      setExpandedBranch(branchName);
      await loadBranchDiff(branchName);
    }
  };

  const createPR = async (branch: BranchDetails) => {
    setProcessingBranch(branch.name);
    try {
      const response = await fetch(
        `/api/branches/${encodeURIComponent(branch.name)}/pr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();
      if (data.success || data.pr) {
        window.open(data.pr.url, "_blank");
        await loadBranches(); // Reload to update PR status
      } else {
        alert(data.error || "Failed to create PR");
      }
    } catch (error) {
      console.error("Create PR error:", error);
      alert("Failed to create pull request");
    } finally {
      setProcessingBranch(null);
    }
  };

  const mergePR = async (branch: BranchDetails) => {
    if (!branch.prNumber) return;

    if (!confirm(`Are you sure you want to merge PR #${branch.prNumber}?`))
      return;

    setProcessingBranch(branch.name);
    try {
      const response = await fetch(
        `/api/branches/${encodeURIComponent(branch.name)}/merge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prNumber: branch.prNumber }),
        },
      );

      const data = await response.json();
      if (data.success) {
        // Show success message
        const toast = document.createElement("div");
        toast.className =
          "fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in flex items-center gap-2";
        toast.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          PR #${branch.prNumber} merged successfully!
        `;
        document.body.appendChild(toast);

        // Remove the merged branch from the list immediately
        setBranches((prev) => prev.filter((b) => b.name !== branch.name));
        setExpandedBranch(null);

        // Remove toast after 3 seconds
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);

        // Reload branches from GitHub to ensure we have the latest data
        await loadBranches();
      } else {
        alert(data.error || "Failed to merge PR");
      }
    } catch (error) {
      console.error("Merge PR error:", error);
      alert("Failed to merge pull request");
    } finally {
      setProcessingBranch(null);
    }
  };

  const switchToBranch = async (branchName: string) => {
    try {
      const response = await fetch("/api/git/branch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: branchName }),
      });

      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Switch branch error:", error);
      alert("Failed to switch branch");
    }
  };

  const getStatusBadge = (branch: BranchDetails) => {
    if (branch.prStatus === "open") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          Open PR
        </span>
      );
    }
    if (branch.prStatus === "merged") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
          Merged
        </span>
      );
    }
    if (branch.prStatus === "closed") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          Closed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
        No PR
      </span>
    );
  };

  const renderDiff = (file: DiffFile) => {
    if (!file.patch) return null;

    const lines = file.patch.split("\n");
    return (
      <div className="mt-2 font-mono text-xs bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
        <div className="p-2 bg-gray-800 border-b border-gray-700">
          {file.status === "renamed" ? (
            <span>
              {file.previousFilename} → {file.filename}
            </span>
          ) : (
            <span>{file.filename}</span>
          )}
        </div>
        <pre className="p-3 overflow-x-auto">
          {lines.map((line, idx) => {
            let className = "";
            if (line.startsWith("+") && !line.startsWith("+++")) {
              className = "bg-green-900/30 text-green-300";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              className = "bg-red-900/30 text-red-300";
            } else if (line.startsWith("@@")) {
              className = "text-blue-400";
            }

            return (
              <div key={idx} className={className}>
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to CMS
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-indigo-600" />
                Branch Management
              </h1>
              <button
                onClick={() => {
                  setIsLoading(true);
                  // Force refresh by clearing cache
                  loadBranches().finally(() => setIsLoading(false));
                }}
                className="ml-auto p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh branches"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : branches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft p-12 text-center">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No CMS branches found
            </h3>
            <p className="text-gray-600">
              Start editing content in the CMS to create branches.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-soft p-4">
              <p className="text-sm text-gray-600">
                Found <span className="font-semibold">{branches.length}</span>{" "}
                CMS branches
              </p>
            </div>

            {branches.map((branch) => (
              <div
                key={branch.name}
                className="bg-white rounded-xl shadow-soft overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Branch Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {branch.name}
                        </h3>
                        {getStatusBadge(branch)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="truncate">
                            {branch.creatorEmail}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(branch.creationTime).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GitCommit className="w-4 h-4" />
                          <span>{branch.commitsAhead} commits ahead</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">
                            {branch.lastCommitMessage}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      {branch.prStatus === "open" ? (
                        <a
                          href={branch.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View PR
                        </a>
                      ) : branch.prStatus !== "merged" ? (
                        <button
                          onClick={() => createPR(branch)}
                          disabled={processingBranch === branch.name}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {processingBranch === branch.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <GitPullRequest className="w-4 h-4" />
                          )}
                          Create PR
                        </button>
                      ) : null}

                      <button
                        onClick={() => switchToBranch(branch.name)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <GitBranch className="w-4 h-4" />
                        Switch
                      </button>

                      <button
                        onClick={() => toggleBranch(branch.name)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedBranch === branch.name ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedBranch === branch.name && (
                  <div className="border-t border-gray-100">
                    {loadingDiff === branch.name ? (
                      <div className="p-8 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      </div>
                    ) : branchDiffs[branch.name] ? (
                      <div className="p-6 space-y-6">
                        {/* Commits */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Commits
                          </h4>
                          <div className="space-y-2">
                            {branchDiffs[branch.name].commits.map((commit) => (
                              <div
                                key={commit.sha}
                                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                              >
                                <GitCommit className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {commit.message}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {commit.author} •{" "}
                                    {new Date(commit.date).toLocaleString()}
                                  </p>
                                </div>
                                <code className="text-xs text-gray-500 font-mono">
                                  {commit.sha.substring(0, 7)}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* File Changes */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">
                            File Changes
                          </h4>
                          <div className="space-y-3">
                            {branchDiffs[branch.name].files.map((file) => (
                              <div
                                key={file.filename}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                              >
                                <div className="p-3 bg-gray-50 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-mono">
                                      {file.filename}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        file.status === "added"
                                          ? "bg-green-100 text-green-700"
                                          : file.status === "removed"
                                            ? "bg-red-100 text-red-700"
                                            : file.status === "modified"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {file.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-green-600">
                                      +{file.additions}
                                    </span>
                                    <span className="text-red-600">
                                      -{file.deletions}
                                    </span>
                                  </div>
                                </div>
                                {file.patch && renderDiff(file)}
                              </div>
                            ))}
                          </div>

                          {/* Merge Button - Placed after file changes */}
                          {branch.prStatus === "open" && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Review the changes above before merging
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    This will merge PR #{branch.prNumber} into
                                    the main branch
                                  </p>
                                </div>
                                <button
                                  onClick={() => mergePR(branch)}
                                  disabled={processingBranch === branch.name}
                                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 font-medium disabled:opacity-50 hover:shadow-md"
                                >
                                  {processingBranch === branch.name ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Merging...
                                    </>
                                  ) : (
                                    <>
                                      <Merge className="w-4 h-4" />
                                      Merge Pull Request
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
