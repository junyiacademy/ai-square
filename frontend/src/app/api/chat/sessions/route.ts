import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket('ai-square-db');

export async function GET(req: NextRequest) {
  try {
    // Get user info from request header
    const userStr = req.headers.get('x-user-info');

    if (!userStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userInfo = JSON.parse(userStr);
    const userEmail = userInfo.email;
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');

    // Load chat index
    const indexFile = bucket.file(`user/${sanitizedEmail}/chat/index.json`);
    const [exists] = await indexFile.exists();

    if (!exists) {
      return NextResponse.json({ sessions: [] });
    }

    const [data] = await indexFile.download();
    const index = JSON.parse(data.toString());

    // Return sessions sorted by most recent
    return NextResponse.json({
      sessions: index.sessions || []
    });
  } catch (error) {
    console.error('Error loading chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to load chat sessions' },
      { status: 500 }
    );
  }
}
