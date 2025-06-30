import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

async function scanDirectory(dirPath: string, basePath: string, relativePath: string = ''): Promise<FileNode[]> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const item of items) {
      // Skip node_modules, .git, etc.
      if (item.name.startsWith('.') || item.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      const itemRelativePath = path.join(relativePath, item.name);

      if (item.isDirectory()) {
        const children = await scanDirectory(fullPath, basePath, itemRelativePath);
        if (children.length > 0) {
          nodes.push({
            name: item.name,
            path: itemRelativePath,
            type: 'directory',
            children,
          });
        }
      } else if (item.name.endsWith('.yaml') || item.name.endsWith('.yml')) {
        nodes.push({
          name: item.name,
          path: itemRelativePath,
          type: 'file',
        });
      }
    }

    return nodes.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Failed to scan directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    // Use local content directory
    const contentPath = path.join(process.cwd(), 'content');
    
    const contentDirs = [
      { path: path.join(contentPath, 'rubrics_data'), name: 'rubrics_data' },
      { path: path.join(contentPath, 'pbl_data'), name: 'pbl_data' },
      { path: path.join(contentPath, 'assessment_data'), name: 'assessment_data' },
    ];

    const allFiles: FileNode[] = [];

    for (const dir of contentDirs) {
      try {
        const files = await scanDirectory(dir.path, dir.path, dir.name);
        if (files.length > 0) {
          allFiles.push({
            name: dir.name,
            path: dir.name,
            type: 'directory',
            children: files,
          });
        }
      } catch (error) {
        console.error(`Failed to scan directory ${dir.path}:`, error);
      }
    }

    return NextResponse.json({ files: allFiles });
  } catch (error) {
    console.error('Failed to scan files:', error);
    return NextResponse.json(
      { error: 'Failed to scan files' },
      { status: 500 }
    );
  }
}