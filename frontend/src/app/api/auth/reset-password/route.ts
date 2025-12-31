import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/auth/simple-auth";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email: string = String(body.email || "")
      .trim()
      .toLowerCase();
    const token: string = String(body.token || "");
    const newPassword: string = String(body.newPassword || "");

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 },
      );
    }

    const db = getPool();
    const hash = hashToken(token);

    // Verify token and expiry
    const check = await db.query(
      `SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND reset_password_token=$2 AND reset_password_expires > NOW()`,
      [email, hash],
    );

    if (check.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();
    await db.query(
      `UPDATE users
       SET password_hash=$1, reset_password_token=NULL, reset_password_expires=NULL, updated_at=$2
       WHERE LOWER(email)=LOWER($3)`,
      [passwordHash, now, email],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password] error", err);
    return NextResponse.json(
      { success: false, error: "Reset failed" },
      { status: 500 },
    );
  }
}
