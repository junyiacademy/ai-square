import { NextResponse } from 'next/server';

export async function GET() {
  // 只在 staging 環境返回非敏感的環境變數
  if (process.env.ENVIRONMENT !== 'staging') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
    ENVIRONMENT: process.env.ENVIRONMENT || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  });
}