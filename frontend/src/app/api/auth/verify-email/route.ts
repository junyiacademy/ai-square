import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/auth/simple-auth'
import crypto from 'crypto'

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = String(searchParams.get('email') || '').trim().toLowerCase()
    const token = String(searchParams.get('token') || '')

    if (!email || !token) {
      return NextResponse.json({ success: false, error: 'Invalid verification link' }, { status: 400 })
    }

    const tokenHash = hashToken(token)
    const db = getPool()
    const now = new Date()

    const result = await db.query(
      `UPDATE users
       SET email_verified=true, email_verified_at=$1, email_verification_token=NULL, updated_at=$1
       WHERE LOWER(email)=LOWER($2) AND email_verification_token=$3 AND email_verified=false
       RETURNING id`,
      [now, email, tokenHash]
    )

    if (result.rowCount === 0) {
      // Invalid or already verified
      return NextResponse.redirect(new URL('/login?verified=0', request.url))
    }

    return NextResponse.redirect(new URL('/login?verified=1', request.url))
  } catch (err) {
    console.error('[verify-email] error', err)
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
  }
}
