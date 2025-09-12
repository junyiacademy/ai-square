import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/auth/simple-auth'
import bcrypt from 'bcryptjs'
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
    const password: string = String(body.password || '')
    const name: string = String(body.name || '').trim()
    const acceptTerms: boolean = body.acceptTerms === true

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 })
    }

    // Validate password requirements (min 8 characters)
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Validate name length if provided
    if (name && name.length < 2) {
      return NextResponse.json({ success: false, error: 'Name must be at least 2 characters' }, { status: 400 })
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      return NextResponse.json({ success: false, error: 'You must accept the terms and conditions' }, { status: 400 })
    }

    const db = getPool()

    // Check existing user
    const existing = await db.query('SELECT id, email_verified, name FROM users WHERE LOWER(email) = LOWER($1)', [email])

    // Generate verification token (raw + hash)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)
    const now = new Date()

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      if (user.email_verified) {
        return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 })
      }

      // Update unverified user: reset password and token
      const passwordHash = await bcrypt.hash(password, 10)
      await db.query(
        `UPDATE users
         SET password_hash=$1, email_verification_token=$2, updated_at=$3
         WHERE LOWER(email)=LOWER($4)`,
        [passwordHash, tokenHash, now, email]
      )
    } else {
      // Create new user
      const id = crypto.randomUUID()
      const passwordHash = await bcrypt.hash(password, 10)
      await db.query(
        `INSERT INTO users (id, email, password_hash, role, name, email_verified, email_verification_token, created_at, updated_at)
         VALUES ($1, $2, $3, 'student', $4, false, $5, $6, $6)`,
        [id, email, passwordHash, name || null, tokenHash, now]
      )
    }

    // Send verification email (but don't fail registration if email fails)
    try {
      const base = appBaseUrl(request.headers.get('origin') || undefined)
      const verifyUrl = `${base}/api/auth/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`
      const recipientName = existing.rows[0]?.name || name || email
      const { html, text } = renderVerifyEmail(recipientName, verifyUrl)
      await sendEmail({ to: email, subject: 'Verify your email', html, text })
    } catch (emailError) {
      console.error('[register] email sending failed:', emailError)
      // Continue registration even if email fails
    }

    // Return success with user data
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        email,
        emailVerified: false,
        name: name || null
      }
    })
  } catch (err: any) {
    console.error('[register] error', err)

    // Handle duplicate key error
    if (err.code === '23505' || err.message?.includes('duplicate key')) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 })
    }

    // Generic database error
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again later.' }, { status: 500 })
  }
}
