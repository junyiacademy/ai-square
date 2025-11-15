import { NextRequest, NextResponse } from 'next/server';
import { getGitHubStorage } from '@/services/github-storage';
import { OctokitError } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { branch } = await request.json();

    if (!branch || branch === 'main') {
      return NextResponse.json(
        { error: 'Invalid branch name' },
        { status: 400 }
      );
    }

    const storage = getGitHubStorage();

    try {
      await storage.deleteBranch(branch);

      return NextResponse.json({
        success: true,
        message: `Branch ${branch} deleted successfully`
      });
    } catch (error) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 403) {
        return NextResponse.json({
          success: false,
          message: 'Branch is protected or you lack permissions'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Delete branch error:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}

// List merged branches that can be deleted
export async function GET() {
  try {
    const storage = getGitHubStorage();
    const branches = await storage.listBranches();

    // Filter CMS branches (starting with 'cms-')
    const cmsBranches = branches
      .filter(branch => branch.startsWith('cms-') && branch !== 'main')
      .sort((a, b) => b.localeCompare(a)); // Newest first

    return NextResponse.json({
      branches: cmsBranches,
      total: cmsBranches.length
    });
  } catch (error) {
    console.error('List branches error:', error);
    return NextResponse.json(
      { error: 'Failed to list branches' },
      { status: 500 }
    );
  }
}
