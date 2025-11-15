import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { OctokitError } from '@/types';

type FileStatus = 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';

interface DiffFile {
  filename: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branch: string }> }
) {
  try {
    const { branch } = await params;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER || 'junyiacademy';
    const repo = process.env.GITHUB_REPO || 'ai-square';

    // Compare branch with main
    const { data: comparison } = await octokit.repos.compareCommits({
      owner,
      repo,
      base: 'main',
      head: branch
    });

    // Get file changes with patches
    const files: DiffFile[] = comparison.files?.map(file => ({
      filename: file.filename,
      status: file.status as FileStatus,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
      previousFilename: file.previous_filename
    })) || [];

    // Get commits
    const commits = comparison.commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      branch,
      aheadBy: comparison.ahead_by,
      behindBy: comparison.behind_by,
      files,
      commits
    });
  } catch (error) {
    console.error('Get branch diff error:', error);
    const octokitError = error as OctokitError;

    if (octokitError.status === 404) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get branch diff' },
      { status: 500 }
    );
  }
}
