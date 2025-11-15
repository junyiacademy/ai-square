import { NextRequest, NextResponse } from 'next/server';
import { getGitHubStorage } from '@/services/github-storage';
import { Octokit } from '@octokit/rest';

interface BranchDetails {
  name: string;
  creatorEmail: string;
  creationTime: string;
  commitsAhead: number;
  lastCommitMessage: string;
  prNumber?: number;
  prStatus?: 'open' | 'closed' | 'merged';
  prUrl?: string;
}

export async function GET(request: NextRequest) {
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER || 'junyiacademy';
    const repo = process.env.GITHUB_REPO || 'ai-square';

    // Get all PRs with cms-content-change label (including recently closed)
    const { data: allPRs } = await octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      labels: 'cms-content-change',
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });

    // Filter only truly open PRs (not merged)
    const prs = allPRs.filter(pr => pr.state === 'open' && !pr.merged_at);

    // Remove duplicates and filter valid PRs
    const uniquePRs = prs.filter((pr, index, self) => {
      // Remove duplicates by PR number
      const isUnique = index === self.findIndex(p => p.number === pr.number);
      // Only include PRs that have a valid branch reference
      const hasValidBranch = pr.head && pr.head.ref;
      return isUnique && hasValidBranch;
    });

    console.log(`Found ${allPRs.length} total PRs, ${prs.length} open PRs, ${uniquePRs.length} unique open PRs`);
    uniquePRs.forEach(pr => {
      console.log(`PR #${pr.number}: ${pr.title} (state: ${pr.state}, merged: ${pr.merged_at ? 'YES' : 'NO'}, branch: ${pr.head?.ref || 'unknown'})`);
    });

    // Get detailed info for each PR's branch
    const branchDetails: BranchDetails[] = await Promise.all(
      uniquePRs.map(async (pr) => {
        try {
          const branchName = pr.head.ref;

          // Get commits ahead of main
          const { data: comparison } = await octokit.repos.compareCommits({
            owner,
            repo,
            base: 'main',
            head: branchName
          });

          // Get first commit to determine creator
          const firstCommit = comparison.commits[0];
          const lastCommit = comparison.commits[comparison.commits.length - 1];

          return {
            name: branchName,
            creatorEmail: pr.user?.login ? `${pr.user.login}@github` : 'unknown',
            creationTime: pr.created_at,
            commitsAhead: comparison.ahead_by,
            lastCommitMessage: lastCommit?.commit.message || pr.title,
            prNumber: pr.number,
            prStatus: 'open' as const,
            prUrl: pr.html_url
          };
        } catch (error) {
          console.error(`Error fetching details for PR #${pr.number}:`, error);
          return {
            name: pr.head.ref,
            creatorEmail: pr.user?.login ? `${pr.user.login}@github` : 'unknown',
            creationTime: pr.created_at,
            commitsAhead: 0,
            lastCommitMessage: pr.title,
            prNumber: pr.number,
            prStatus: 'open' as const,
            prUrl: pr.html_url
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      branches: branchDetails
    });
  } catch (error) {
    console.error('List branches error:', error);
    return NextResponse.json(
      { error: 'Failed to list branches' },
      { status: 500 }
    );
  }
}
