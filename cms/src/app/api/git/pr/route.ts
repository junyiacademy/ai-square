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
    
    // Create PR using GitHub CLI
    const prBody = body || `Content updates made via AI Square CMS

🤖 Generated with [Claude Code](https://claude.ai/code)`;

    const ghCommand = `gh pr create --title "${title}" --body "${prBody}" --base main --head ${branch}`;
    const { stdout: prUrl } = await execAsync(ghCommand, { cwd: projectRoot });
    
    return NextResponse.json({ 
      success: true,
      prUrl: prUrl.trim(),
      branch,
      message: 'Pull request created successfully'
    });
  } catch (error) {
    console.error('Create PR error:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request' },
      { status: 500 }
    );
  }
}