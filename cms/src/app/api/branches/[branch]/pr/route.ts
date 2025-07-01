import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { GitHubPullRequest, OctokitError } from '@/types';

// GET - Get PR info for a branch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branch: string }> }
) {
  try {
    const { branch } = await params;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER || 'junyiacademy';
    const repo = process.env.GITHUB_REPO || 'ai-square';

    // Check for existing PR
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      head: `${owner}:${branch}`,
      state: 'all'
    });

    if (prs.length === 0) {
      return NextResponse.json({
        success: true,
        pr: null
      });
    }

    const pr = prs[0] as GitHubPullRequest; // Most recent PR
    
    return NextResponse.json({
      success: true,
      pr: {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        merged: pr.merged || false,
        mergedAt: pr.merged_at,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url,
        author: pr.user?.login,
        mergeable: pr.mergeable || null,
        mergeableState: pr.mergeable_state || 'unknown'
      }
    });
  } catch (error) {
    console.error('Get PR error:', error);
    return NextResponse.json(
      { error: 'Failed to get PR info' },
      { status: 500 }
    );
  }
}

// POST - Create PR for a branch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ branch: string }> }
) {
  try {
    const { branch } = await params;
    const { title, body } = await request.json();
    
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER || 'junyiacademy';
    const repo = process.env.GITHUB_REPO || 'ai-square';

    // Check if PR already exists
    const { data: existingPrs } = await octokit.pulls.list({
      owner,
      repo,
      head: `${owner}:${branch}`,
      state: 'open'
    });

    if (existingPrs.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'PR already exists',
        pr: {
          number: existingPrs[0].number,
          url: existingPrs[0].html_url
        }
      });
    }

    // Generate PR title and body if not provided
    let prTitle = title;
    let prBody = body;

    if (!prTitle || !prBody) {
      // Get commits for auto-generated description
      const { data: comparison } = await octokit.repos.compareCommits({
        owner,
        repo,
        base: 'main',
        head: branch
      });

      if (!prTitle) {
        prTitle = `CMS Updates: ${branch}`;
      }

      if (!prBody) {
        const commits = comparison.commits.map(c => `- ${c.commit.message}`).join('\n');
        prBody = `## Summary\n\nContent updates made through AI Square CMS.\n\n## Changes\n\n${commits}\n\n## Branch\n\n\`${branch}\``;
      }
    }

    // Create PR
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle,
      body: prBody,
      head: branch,
      base: 'main'
    });

    return NextResponse.json({
      success: true,
      pr: {
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        body: pr.body
      }
    });
  } catch (error) {
    console.error('Create PR error:', error);
    const octokitError = error as OctokitError;
    
    if (octokitError.status === 422) {
      return NextResponse.json(
        { error: 'Cannot create PR - no changes or branch issues' },
        { status: 422 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create PR' },
      { status: 500 }
    );
  }
}