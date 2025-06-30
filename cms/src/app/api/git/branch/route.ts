import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const projectRoot = process.cwd().replace('/cms', '');
    
    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current', { cwd: projectRoot });
    const branch = currentBranch.trim();
    
    // If already on a feature branch, return current branch
    if (branch !== 'main') {
      return NextResponse.json({ 
        success: true,
        branch,
        isNew: false,
        message: `Already on feature branch: ${branch}`
      });
    }
    
    // Create new feature branch
    const newBranch = `cms-edit-${Date.now()}`;
    await execAsync(`git checkout -b ${newBranch}`, { cwd: projectRoot });
    
    return NextResponse.json({ 
      success: true,
      branch: newBranch,
      isNew: true,
      message: `Created new branch: ${newBranch}`
    });
  } catch (error) {
    console.error('Branch creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projectRoot = process.cwd().replace('/cms', '');
    
    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current', { cwd: projectRoot });
    const branch = currentBranch.trim();
    
    // Check if there are uncommitted changes
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: projectRoot });
    const hasChanges = status.trim().length > 0;
    
    return NextResponse.json({ 
      currentBranch: branch,
      isOnMain: branch === 'main',
      hasUncommittedChanges: hasChanges
    });
  } catch (error) {
    console.error('Branch status error:', error);
    return NextResponse.json(
      { error: 'Failed to get branch status' },
      { status: 500 }
    );
  }
}