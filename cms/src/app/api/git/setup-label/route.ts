import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER || 'junyiacademy';
    const repo = process.env.GITHUB_REPO || 'ai-square';
    const labelName = 'cms-content-change';
    
    // Check if label exists
    try {
      await octokit.issues.getLabel({
        owner,
        repo,
        name: labelName
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Label already exists',
        exists: true 
      });
    } catch (error: any) {
      if (error.status === 404) {
        // Label doesn't exist, create it
        const { data } = await octokit.issues.createLabel({
          owner,
          repo,
          name: labelName,
          color: '7057ff', // Purple color
          description: 'Content changes made via AI Square CMS'
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Label created successfully',
          label: data,
          exists: false 
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Setup label error:', error);
    return NextResponse.json(
      { error: 'Failed to setup label' },
      { status: 500 }
    );
  }
}