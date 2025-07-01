import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { OctokitError } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ branch: string }> }
) {
  try {
    const { branch } = await params;
    const { prNumber, deleteAfterMerge = true } = await request.json();
    
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER || 'junyiacademy';
    const repo = process.env.GITHUB_REPO || 'ai-square';

    // Get PR info
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Check if PR is mergeable
    if (!pr.mergeable) {
      return NextResponse.json({
        success: false,
        error: 'PR is not mergeable. Please resolve conflicts.'
      });
    }

    if (pr.state !== 'open') {
      return NextResponse.json({
        success: false,
        error: 'PR is not open'
      });
    }

    // Merge PR
    const { data: mergeResult } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash' // Use squash merge for cleaner history
    });

    // Delete branch if requested
    if (deleteAfterMerge && mergeResult.merged) {
      try {
        await octokit.git.deleteRef({
          owner,
          repo,
          ref: `heads/${branch}`
        });
      } catch (error) {
        console.error('Failed to delete branch after merge:', error);
        // Non-critical error, continue
      }
    }

    return NextResponse.json({
      success: true,
      merged: mergeResult.merged,
      message: mergeResult.message,
      sha: mergeResult.sha
    });
  } catch (error) {
    console.error('Merge PR error:', error);
    const octokitError = error as OctokitError;
    
    if (octokitError.status === 404) {
      return NextResponse.json(
        { error: 'PR not found' },
        { status: 404 }
      );
    }

    if (octokitError.status === 405) {
      return NextResponse.json(
        { error: 'PR is not mergeable' },
        { status: 405 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to merge PR' },
      { status: 500 }
    );
  }
}