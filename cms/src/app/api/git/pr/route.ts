import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { title, body } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'PR title is required' },
        { status: 400 }
      );
    }

    const projectRoot = process.cwd().replace('/cms', '');
    
    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current', { cwd: projectRoot });
    const branch = currentBranch.trim();
    
    // If we're on main, create a new branch
    if (branch === 'main') {
      const newBranch = `cms-edit-${Date.now()}`;
      await execAsync(`git checkout -b ${newBranch}`, { cwd: projectRoot });
      
      return NextResponse.json({
        success: false,
        message: `Created new branch ${newBranch}. Please make some changes and save first.`
      });
    }
    
    // Push current branch to remote
    await execAsync(`git push -u origin ${branch}`, { cwd: projectRoot });
    
    // Create PR using GitHub CLI (if available)
    const prBody = body || `Content updates made via AI Square CMS

🤖 Generated with [Claude Code](https://claude.ai/code)`;

    let prUrl = '';
    try {
      const ghCommand = `gh pr create --title "${title}" --body "${prBody}" --base main --head ${branch}`;
      const { stdout } = await execAsync(ghCommand, { cwd: projectRoot });
      prUrl = stdout.trim();
    } catch (ghError) {
      // If gh CLI fails, create manual PR URL
      prUrl = `https://github.com/${process.env.GITHUB_OWNER || 'junyiacademy'}/${process.env.GITHUB_REPO || 'ai-square'}/pull/new/${branch}`;
    }
    
    // Switch back to main branch
    await execAsync('git checkout main', { cwd: projectRoot });
    
    return NextResponse.json({ 
      success: true,
      prUrl,
      branch,
      message: 'Pull request created and switched back to main branch'
    });
  } catch (error) {
    console.error('Create PR error:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request' },
      { status: 500 }
    );
  }
}