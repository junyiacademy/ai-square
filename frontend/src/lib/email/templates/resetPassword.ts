export function renderResetPassword(nameOrEmail: string, resetUrl: string) {
  const text = `Hi ${nameOrEmail},\n\nYou requested to reset your password. Click the link below to set a new password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;
  const html = `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.6; color:#111">
    <h2>Reset your password</h2>
    <p>Hi ${escapeHtml(nameOrEmail)},</p>
    <p>Click the button below to set a new password.</p>
    <p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Reset Password</a>
    </p>
    <p>Or copy this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p style="color:#666;font-size:12px">If you did not request this, please ignore this email.</p>
  </div>`;
  return { text, html };
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
