import { NextRequest, NextResponse } from 'next/server';
import { contentService } from '@/lib/cms/content-service';
import { ContentType } from '@/types/cms';
import { withAdminAuth } from '@/middleware/auth';

// GET /api/admin/content - List content
export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as ContentType) || 'domain';

  try {
    const items = await contentService.listContent(type);
    return NextResponse.json(items);
  } catch (error) {
    console.error('List content error:', error);
    return NextResponse.json({ error: 'Failed to list content' }, { status: 500 });
  }
});

// POST /api/admin/content - Save content
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { type, id, content, status } = body;

    // Get user from request
    const user = (request as NextRequest & { user: { email: string } }).user.email;

    // Extract filename from id
    const fileName = id.split('/').pop();
    
    await contentService.saveContent(
      type as ContentType,
      fileName,
      content,
      status,
      user
    );

    // If publishing, also run the publish method
    if (status === 'published') {
      await contentService.publish(type as ContentType, fileName, user);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save content error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save content' 
    }, { status: 500 });
  }
});