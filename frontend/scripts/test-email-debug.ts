#!/usr/bin/env npx tsx

/**
 * Email Configuration Test & Debug Tool
 *
 * This script tests various email configurations to diagnose connection issues.
 * Use this when troubleshooting email sending problems.
 *
 * Usage: npx tsx scripts/test-email-debug.ts
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testEmailDebug() {
  console.log("🔍 Debugging Email Configuration");
  console.log("================================\n");

  // Check environment variables
  const user = process.env.GMAIL_USER;
  const passRaw = process.env.GMAIL_APP_PASSWORD;
  const passClean = passRaw?.replace(/\s+/g, "");

  console.log("📧 Email Account:", user);
  console.log(
    "🔑 Password (raw):",
    passRaw ? `"${passRaw}" (${passRaw.length} chars)` : "NOT SET",
  );
  console.log(
    "🔑 Password (clean):",
    passClean ? `${passClean.length} chars` : "NOT SET",
  );
  console.log("");

  if (!user || !passClean) {
    console.error("❌ Missing credentials!");
    return;
  }

  // Test with direct nodemailer
  console.log("📨 Testing with Nodemailer directly...\n");

  const nodemailer = await import("nodemailer");

  // Try different auth methods
  const configs = [
    {
      name: "Gmail Service",
      config: {
        service: "gmail",
        auth: { user, pass: passClean },
      },
    },
    {
      name: "Gmail SMTP",
      config: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user, pass: passClean },
      },
    },
    {
      name: "Gmail SMTP (SSL)",
      config: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass: passClean },
      },
    },
  ];

  for (const { name, config } of configs) {
    console.log(`\n🔧 Testing: ${name}`);
    console.log(
      "Config:",
      JSON.stringify(
        { ...config, auth: { ...config.auth, pass: "***" } },
        null,
        2,
      ),
    );

    try {
      const transporter = nodemailer.createTransport(config as any);

      // Verify connection
      console.log("  Verifying connection...");
      await transporter.verify();
      console.log("  ✅ Connection successful!");

      // Try sending
      console.log("  Sending test email...");
      const info = await transporter.sendMail({
        from: `"AI Square Test" <${user}>`,
        to: user,
        subject: `Test Email - ${name}`,
        text: `This is a test email sent via ${name}`,
        html: `<p>This is a test email sent via <b>${name}</b></p>`,
      });

      console.log("  ✅ Email sent! Message ID:", info.messageId);
      console.log("  Response:", info.response);

      // Success - no need to try other methods
      break;
    } catch (error: any) {
      console.log("  ❌ Failed:", error.message);
      if (error.response) {
        console.log("  Response:", error.response);
      }
      if (error.responseCode) {
        console.log("  Response Code:", error.responseCode);
      }
    }
  }

  console.log("\n================================");
  console.log("📝 Recommendations:");
  console.log("1. If all methods fail with 535-5.7.8:");
  console.log("   - The app password might be invalid or revoked");
  console.log(
    "   - Generate a new app password at: https://myaccount.google.com/apppasswords",
  );
  console.log("2. Make sure 2-factor authentication is enabled");
  console.log("3. The password should be 16 characters (4 groups of 4)");
  console.log(
    "4. Check if the account is a regular Gmail or Google Workspace account",
  );
}

testEmailDebug().catch(console.error);
