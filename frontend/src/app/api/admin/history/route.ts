import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { ContentHistory } from '@/types/cms';

export async function GET(request: NextRequest) {
  // Check admin auth
  const authHeader = request.headers.get('cookie');
  if (!authHeader?.includes('isLoggedIn=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!process.env.GCS_BUCKET_NAME) {
      return NextResponse.json([]);
    }

    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

    // List all history files
    const [files] = await bucket.getFiles({ 
      prefix: 'cms/history/',
      delimiter: undefined 
    });

    const history: ContentHistory[] = [];

    // Read each history file
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        try {
          const [content] = await file.download();
          const data = JSON.parse(content.toString());
          history.push(data);
        } catch (error) {
          console.error(`Error reading history file ${file.name}:`, error);
        }
      }
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return latest 100 entries
    return NextResponse.json(history.slice(0, 100));
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json([]);
  }
}