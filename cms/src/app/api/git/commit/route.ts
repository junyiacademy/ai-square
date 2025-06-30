import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { filePath, message } = await request.json();

    if (!filePath || !message) {
      return NextResponse.json(
        { error: 'File path and commit message are required' },
        { status: 400 }
      );
    }

    // Change to project root directory (parent of cms)
    const projectRoot = process.cwd().replace('/cms', '');
    
    // Add the specific file to git
    await execAsync(`git add cms/content/${filePath}`, { cwd: projectRoot });
    
    // Use provided message or create default format
    const commitMessage = message.includes('\n') 
      ? message  // Already formatted by AI
      : `feat(cms): ${message}

更新檔案: ${filePath}

🤖 Generated with AI Square CMS
Co-Authored-By: Vertex AI <noreply@google.com>`;

    // Use heredoc to handle multi-line commit messages properly
    const { stdout: commitResult } = await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: projectRoot });
    
    // Get the commit hash
    const { stdout: commitHash } = await execAsync('git rev-parse HEAD', { cwd: projectRoot });
    
    return NextResponse.json({ 
      success: true,
      commitHash: commitHash.trim(),
      message: 'File saved and committed successfully'
    });
  } catch (error) {
    console.error('Git commit error:', error);
    
    // Check if it's a "nothing to commit" error
    if (error instanceof Error && error.message.includes('nothing to commit')) {
      return NextResponse.json({ 
        success: true,
        message: 'No changes to commit'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to commit changes' },
      { status: 500 }
    );
  }
}