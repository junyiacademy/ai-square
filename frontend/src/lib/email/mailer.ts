import nodemailer from 'nodemailer'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function getFrom(): string {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER
  if (!from) throw new Error('SMTP_FROM or SMTP_USER/GMAIL_USER must be set')
  return from
}

export function createTransport() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const passRaw = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD

  const pass = passRaw ? passRaw.replace(/\s+/g, '') : undefined
  if (!user || !pass) {
    throw new Error('SMTP_USER/SMTP_PASS not configured')
  }

  // Use Gmail service for better compatibility
  // This handles all the connection details automatically
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export async function sendEmail(opts: SendEmailOptions) {
  const transporter = createTransport()
  const from = getFrom()

  console.log('📧 Sending email:', {
    from,
    to: opts.to,
    subject: opts.subject,
  })

  try {
    const result = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    })
    console.log('✅ Email sent successfully:', result.messageId)
    return result
  } catch (error) {
    console.error('❌ Email send failed:', error)
    throw error
  }
}

export function appBaseUrl(requestOrigin?: string): string {
  const base = process.env.APP_BASE_URL || requestOrigin
  if (!base) throw new Error('APP_BASE_URL not configured and request origin missing')
  return base.replace(/\/$/, '')
}
