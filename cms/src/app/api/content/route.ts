import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Use local content directory
    const contentPath = path.join(process.cwd(), 'content');
    const fullPath = path.join(contentPath, filePath);
    const allowedDir = contentPath;

    // Security check: ensure the path is within allowed directory
    if (!fullPath.startsWith(allowedDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    
    return NextResponse.json({ 
      content,
      path: filePath,
    });
  } catch (error) {
    console.error('Failed to read file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content } = await request.json();

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'File path and content are required' },
        { status: 400 }
      );
    }

    const projectRoot = path.join(process.cwd(), '..');
    const fullPath = path.join(projectRoot, 'frontend', 'public', filePath);
    const allowedDir = path.join(projectRoot, 'frontend', 'public');

    // Security check
    if (!fullPath.startsWith(allowedDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
    
    return NextResponse.json({ 
      success: true,
      path: filePath,
    });
  } catch (error) {
    console.error('Failed to save file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}