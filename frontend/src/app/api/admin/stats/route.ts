import { NextRequest, NextResponse } from 'next/server';
import { contentService } from '@/lib/cms/content-service';

export async function GET(request: NextRequest) {
  // Check admin auth
  const authHeader = request.headers.get('cookie');
  if (!authHeader?.includes('isLoggedIn=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get counts for each content type
    const domains = await contentService.listContent('domain');
    const questions = await contentService.listContent('question');
    
    // Count overrides and drafts
    let overrides = 0;
    let drafts = 0;
    
    [...domains, ...questions].forEach(item => {
      if (item.status === 'draft') drafts++;
      if (item.gcs_path && item.status === 'published') overrides++;
    });

    return NextResponse.json({
      domains: domains.filter(d => d.status === 'published').length,
      questions: questions.filter(q => q.status === 'published').length,
      overrides,
      drafts
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ 
      domains: 0,
      questions: 0,
      overrides: 0,
      drafts: 0
    });
  }
}