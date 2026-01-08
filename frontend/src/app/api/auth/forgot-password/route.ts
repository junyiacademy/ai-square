import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/auth/simple-auth";
import crypto from "crypto";
import { appBaseUrl, sendEmail } from "@/lib/email/mailer";
import { renderResetPassword } from "@/lib/email/templates/resetPassword";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * GET - Validate reset token
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { success: false, error: "Token and email required" },
        { status: 400 }
      );
    }

    const db = getPool();
    const hash = hashToken(token);

    const check = await db.query(
      `SELECT id FROM users
       WHERE LOWER(email)=LOWER($1)
       AND reset_password_token=$2
       AND reset_password_expires > NOW()`,
      [email, hash]
    );

    if (check.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password GET] error", err);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email: string = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    const db = getPool();
    const userRes = await db.query(
      "SELECT id, name FROM users WHERE LOWER(email)=LOWER($1)",
      [email],
    );
    if (userRes.rows.length === 0) {
      // Always return success to avoid enumeration
      return NextResponse.json({ success: true });
    }

    const raw = crypto.randomBytes(32).toString("hex");
    const hash = hashToken(raw);
    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1h

    await db.query(
      `UPDATE users
       SET reset_password_token=$1, reset_password_expires=$2, updated_at=$3
       WHERE LOWER(email)=LOWER($4)`,
      [hash, expires, now, email],
    );

    const base = appBaseUrl(request.headers.get("origin") || undefined);
    // Assume a UI page at /reset-password that posts to /api/auth/reset-password
    const resetUrl = `${base}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
    const display = userRes.rows[0].name || email;
    const { html, text } = renderResetPassword(display, resetUrl);
    await sendEmail({ to: email, subject: "Reset your password", html, text });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password] error", err);
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 },
    );
  }
}
