import { NextRequest, NextResponse } from 'next/server';
import { contentService } from '@/lib/cms/content-service';
import { ContentType } from '@/types/cms';

// GET /api/admin/content/[id] - Get single content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin auth
  const authHeader = request.headers.get('cookie');
  if (!authHeader?.includes('isLoggedIn=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  
  // Extract type and filename from id (format: "domain/filename.yaml")
  const [type, ...fileNameParts] = decodedId.split('/');
  const fileName = fileNameParts.join('/');

  try {
    const content = await contentService.getContent(type as ContentType, fileName);
    const items = await contentService.listContent(type as ContentType);
    const metadata = items.find(item => item.id === decodedId);

    return NextResponse.json({
      content,
      ...metadata
    });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Failed to get content' }, { status: 500 });
  }
}

// DELETE /api/admin/content/[id] - Delete override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin auth
  const authHeader = request.headers.get('cookie');
  if (!authHeader?.includes('isLoggedIn=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  
  // Extract type and filename from id
  const [type, ...fileNameParts] = decodedId.split('/');
  const fileName = fileNameParts.join('/');

  try {
    await contentService.deleteOverride(type as ContentType, fileName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete content error:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}