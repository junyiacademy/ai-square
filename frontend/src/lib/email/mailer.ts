import nodemailer from 'nodemailer'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function getFrom(): string {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  if (!from) throw new Error('SMTP_FROM or SMTP_USER must be set')
  return from
}

export function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('SMTP_USER/SMTP_PASS not configured')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
  })
}

export async function sendEmail(opts: SendEmailOptions) {
  const transporter = createTransport()
  const from = getFrom()
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
}

export function appBaseUrl(requestOrigin?: string): string {
  const base = process.env.APP_BASE_URL || requestOrigin
  if (!base) throw new Error('APP_BASE_URL not configured and request origin missing')
  return base.replace(/\/$/, '')
}
