export function renderVerifyEmail(nameOrEmail: string, verifyUrl: string) {
  const text = `Hi ${nameOrEmail},\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`;
  const html = `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.6; color:#111">
    <h2>Verify your email</h2>
    <p>Hi ${escapeHtml(nameOrEmail)},</p>
    <p>Please verify your email by clicking the button below.</p>
    <p>
      <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Verify Email</a>
    </p>
    <p>Or copy this link into your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p style="color:#666;font-size:12px">If you did not create an account, you can ignore this email.</p>
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
