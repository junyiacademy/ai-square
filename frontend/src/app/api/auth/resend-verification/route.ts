import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/auth/simple-auth'
import crypto from 'crypto'
import { appBaseUrl, sendEmail } from '@/lib/email/mailer'
import { renderVerifyEmail } from '@/lib/email/templates/verifyEmail'

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email: string = String(body.email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const db = getPool()
    const userRes = await db.query('SELECT id, name, email_verified FROM users WHERE LOWER(email)=LOWER($1)', [email])

    // Always return success (anti-enumeration)
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: true })
    }

    const user = userRes.rows[0]
    // If already verified, also return success
    if (user.email_verified) {
      return NextResponse.json({ success: true })
    }

    // Generate a new token and update
    const raw = crypto.randomBytes(32).toString('hex')
    const hash = hashToken(raw)
    const now = new Date()
    await db.query(
      `UPDATE users SET email_verification_token=$1, updated_at=$2 WHERE LOWER(email)=LOWER($3)`,
      [hash, now, email]
    )

    const base = appBaseUrl(request.headers.get('origin') || undefined)
    const verifyUrl = `${base}/api/auth/verify-email?token=${raw}&email=${encodeURIComponent(email)}`
    const display = user.name || email
    const { html, text } = renderVerifyEmail(display, verifyUrl)
    await sendEmail({ to: email, subject: 'Verify your email', html, text })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[resend-verification] error', err)
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 })
  }
}
