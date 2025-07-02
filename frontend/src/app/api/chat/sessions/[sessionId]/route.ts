import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket('ai-square-db');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Get user info from request header
    const userStr = req.headers.get('x-user-info');
    
    if (!userStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userInfo = JSON.parse(userStr);
    const userEmail = userInfo.email;
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
    
    // Load session data
    const sessionFile = bucket.file(`user/${sanitizedEmail}/chat/sessions/${sessionId}.json`);
    const [exists] = await sessionFile.exists();
    
    if (!exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const [data] = await sessionFile.download();
    const session = JSON.parse(data.toString());
    
    return NextResponse.json({
      id: session.id,
      title: session.title,
      messages: session.messages,
      created_at: session.created_at,
      updated_at: session.updated_at
    });
  } catch (error) {
    console.error('Error loading chat session:', error);
    return NextResponse.json(
      { error: 'Failed to load chat session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Get user info from request header
    const userStr = req.headers.get('x-user-info');
    
    if (!userStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userInfo = JSON.parse(userStr);
    const userEmail = userInfo.email;
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/\./g, '_');
    
    // Delete session file
    const sessionFile = bucket.file(`user/${sanitizedEmail}/chat/sessions/${sessionId}.json`);
    const [exists] = await sessionFile.exists();
    
    if (!exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    await sessionFile.delete();
    
    // Update sessions list
    const sessionsListFile = bucket.file(`user/${sanitizedEmail}/chat/sessions.json`);
    const [listExists] = await sessionsListFile.exists();
    
    if (listExists) {
      const [listData] = await sessionsListFile.download();
      const sessionsList = JSON.parse(listData.toString());
      
      // Remove the deleted session from the list
      const updatedList = sessionsList.filter((s: any) => s.id !== sessionId);
      
      await sessionsListFile.save(JSON.stringify(updatedList, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}