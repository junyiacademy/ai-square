import { NextRequest, NextResponse } from 'next/server';
import { completeYAMLContent, translateYAMLContent, improveYAMLContent } from '@/lib/vertex-ai';

export async function POST(request: NextRequest) {
  try {
    const { action, content, file } = await request.json();

    if (!action || !content) {
      return NextResponse.json(
        { error: 'Action and content are required' },
        { status: 400 }
      );
    }

    let result = '';

    switch (action) {
      case 'complete':
        result = await completeYAMLContent(content, file);
        break;
      
      case 'translate':
        result = await translateYAMLContent(content);
        break;
      
      case 'improve':
        result = await improveYAMLContent(content);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI assist error:', error);
    return NextResponse.json(
      { error: 'AI processing failed' },
      { status: 500 }
    );
  }
}