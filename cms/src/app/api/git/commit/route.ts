import { NextRequest, NextResponse } from 'next/server';
import { getGitHubStorage } from '@/services/github-storage';

// This API is now deprecated since commits happen automatically with GitHub API
// We keep it for backward compatibility but it just returns success
export async function POST(request: NextRequest) {
  try {
    const { filePath, message } = await request.json();

    if (!filePath || !message) {
      return NextResponse.json(
        { error: 'File path and commit message are required' },
        { status: 400 }
      );
    }

    // With GitHub API, commits happen automatically when updating files
    // So we just return success here
    return NextResponse.json({ 
      success: true,
      message: 'Changes are automatically committed with GitHub API'
    });
  } catch (error) {
    console.error('Commit API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process commit request' },
      { status: 500 }
    );
  }
}