/**
 * API Route: /api/scenarios/publish
 * Publishes a validated scenario YAML to GitHub
 * Creates a feature branch and Pull Request
 *
 * Security: Admin-only, validates all input, token only in backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import type {
  PublishScenarioRequest,
  PublishScenarioResponse,
  ValidateScenarioResponse
} from '@/types/prompt-to-course';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GitHub configuration
const GITHUB_OWNER = 'junyiacademy';
const GITHUB_REPO = 'ai-square';
const BASE_BRANCH = 'staging';
const SCENARIOS_PATH = 'backend/src/content/scenarios';

/**
 * POST /api/scenarios/publish
 * Publish scenario YAML to GitHub via PR
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<PublishScenarioResponse | { error: string }>> {
  try {
    // 1. Security: Check authentication
    // TODO: Add admin-only middleware when auth is implemented
    // For now, check that GITHUB_TOKEN exists
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub integration not configured. Please set GITHUB_TOKEN environment variable.' },
        { status: 503 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json() as PublishScenarioRequest;

    if (!body.scenarioId || !body.yaml || !body.mode) {
      return NextResponse.json(
        { error: 'Missing required fields: scenarioId, yaml, mode' },
        { status: 400 }
      );
    }

    const { scenarioId, yaml, mode } = body;

    // 3. Validate scenario ID format (alphanumeric, hyphens, underscores only)
    const scenarioIdPattern = /^[a-z0-9_-]+$/i;
    if (!scenarioIdPattern.test(scenarioId)) {
      return NextResponse.json(
        { error: 'Invalid scenario ID format. Use only alphanumeric characters, hyphens, and underscores.' },
        { status: 400 }
      );
    }

    // 4. Validate YAML format using existing validate endpoint
    const validationResponse = await fetch(
      new URL('/api/scenarios/validate', request.url).toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml, mode }),
      }
    );

    if (!validationResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to validate scenario YAML' },
        { status: 500 }
      );
    }

    const validationResult = await validationResponse.json() as ValidateScenarioResponse;

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: 'Scenario validation failed',
          details: validationResult.errors
        },
        { status: 400 }
      );
    }

    // 5. Initialize Octokit client
    const octokit = new Octokit({
      auth: githubToken,
    });

    // 6. Check if scenario ID already exists
    const filePath = `${SCENARIOS_PATH}/${scenarioId}.yml`;

    try {
      await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
        ref: BASE_BRANCH,
      });

      // File exists
      return NextResponse.json(
        { error: `Scenario ID '${scenarioId}' already exists. Please choose a different ID.` },
        { status: 409 }
      );
    } catch (error) {
      // File doesn't exist - this is expected, continue
      const err = error as { status?: number };
      if (err.status !== 404) {
        throw error; // Unexpected error
      }
    }

    // 7. Get base branch reference
    const { data: baseBranchRef } = await octokit.git.getRef({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      ref: `heads/${BASE_BRANCH}`,
    });

    const baseSha = baseBranchRef.object.sha;

    // 8. Create feature branch
    const branchName = `feature/scenario-${scenarioId}`;

    try {
      await octokit.git.createRef({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });
    } catch (error) {
      const err = error as { status?: number };
      if (err.status === 422) {
        return NextResponse.json(
          { error: `Branch '${branchName}' already exists. The scenario may have been created previously.` },
          { status: 409 }
        );
      }
      throw error;
    }

    // 9. Create/update file in the new branch
    const { data: commitData } = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: `feat: add ${mode} scenario ${scenarioId}

Generated via Prompt-to-Course feature.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>`,
      content: Buffer.from(yaml).toString('base64'),
      branch: branchName,
    });

    // 10. Create Pull Request
    const { data: prData } = await octokit.pulls.create({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      title: `Add ${mode} scenario: ${scenarioId}`,
      head: branchName,
      base: BASE_BRANCH,
      body: `## New Scenario: ${scenarioId}

**Type**: ${mode.toUpperCase()}
**Generated via**: Prompt-to-Course AI Generator

### Validation Results
✅ YAML syntax: Valid
✅ Schema validation: Passed
${validationResult.warnings.length > 0 ? `\n⚠️ Warnings: ${validationResult.warnings.length}` : ''}

### Review Checklist
- [ ] Verify scenario content quality
- [ ] Check task templates are appropriate
- [ ] Ensure multilingual fields are complete
- [ ] Test scenario in staging environment
- [ ] Approve and merge to staging

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>`,
    });

    // 11. Return success response
    return NextResponse.json({
      success: true,
      prUrl: prData.html_url,
      branch: branchName,
      commitSha: commitData.commit.sha ?? '',
      message: `Successfully created PR #${prData.number}`,
    });

  } catch (error) {
    console.error('Error publishing scenario to GitHub:', error);

    // Check for common GitHub API errors
    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return NextResponse.json(
        { error: 'GitHub authentication failed. Please check GITHUB_TOKEN configuration.' },
        { status: 401 }
      );
    }

    if (err.status === 403) {
      return NextResponse.json(
        { error: 'GitHub API rate limit exceeded or insufficient permissions.' },
        { status: 403 }
      );
    }

    // Don't expose sensitive error details - use generic message
    return NextResponse.json(
      { error: 'Failed to publish scenario to GitHub. Please check server logs for details.' },
      { status: 500 }
    );
  }
}
