// One-shot script — sends a welcome / sign-in invite to the three admin
// users who were provisioned via direct SQL during initial setup and
// never received any email notification.
//
// Run with:  RESEND_API_KEY=… npx tsx scripts/send-admin-invites.ts
// or with the key already in .env.local:
//   npx tsx -r dotenv/config scripts/send-admin-invites.ts dotenv_config_path=.env.local
//
// Idempotent: re-running just sends another invite. Delete or archive
// once the admins have rotated their passwords.

import { config } from "dotenv";
config({ path: ".env.local" });

// Dynamic-imported below so dotenv has run before lib/email reads
// process.env.RESEND_API_KEY at module load.

const ADMIN_URL = "https://admin.buildingsync.app";
// Required env var; never hardcode the value — it ends up in the recipient
// emails verbatim and any leak in git history triggers secret scanners.
const TEMP_PASSWORD = process.env.ADMIN_TEMP_PASSWORD;

const ADMINS = [
  { email: "tejaswirajmgr@gmail.com", name: "Tejaswi" },
  { email: "apoorvrajmgr@gmail.com", name: "Apoorv" },
  { email: "nodeinc2@gmail.com",     name: "Node2 Ops" },
] as const;

function buildInvite(name: string, email: string) {
  const subject = "Welcome to BuildingSync — Platform admin access";
  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#141414;background:#f8f8f8;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:32px;">
<h1 style="font-size:22px;margin:0 0 8px;">Welcome to BuildingSync</h1>
<p style="margin:0 0 16px;">Hi ${name},</p>
<p>You've been provisioned a <strong>Platform admin</strong> account on BuildingSync. This role is reserved for BuildingSync staff — you'll use it to onboard new buildings and verify Building Manager accounts.</p>
<table style="margin:16px 0;border-collapse:collapse;font-size:14px;">
<tr><td style="padding:6px 12px 6px 0;color:#666;">Email</td><td style="padding:6px 0;font-family:monospace;">${email}</td></tr>
<tr><td style="padding:6px 12px 6px 0;color:#666;">Temp password</td><td style="padding:6px 0;font-family:monospace;">${TEMP_PASSWORD}</td></tr>
<tr><td style="padding:6px 12px 6px 0;color:#666;">Admin URL</td><td style="padding:6px 0;"><a href="${ADMIN_URL}/signin" style="color:#d35a3f;">${ADMIN_URL}/signin</a></td></tr>
</table>
<p><a href="${ADMIN_URL}/signin" style="display:inline-block;background:#141414;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Sign in</a></p>
<p style="font-size:13px;color:#666;margin-top:24px;"><strong>Important:</strong> change your password under <em>Account &amp; settings</em> right after signing in. The temp password above is shared verbatim with the team that set up your account.</p>
<p style="font-size:13px;color:#666;margin-top:8px;">Questions? Reply to this email or reach <a href="mailto:info@buildingsync.app" style="color:#d35a3f;">info@buildingsync.app</a>.</p>
</div></body></html>`;
  const text = `Welcome to BuildingSync\n\nHi ${name},\n\nYou've been provisioned a Platform admin account.\n\nEmail: ${email}\nTemp password: ${TEMP_PASSWORD}\nAdmin URL: ${ADMIN_URL}/signin\n\nChange your password under Account & settings right after signing in.\n\nQuestions? info@buildingsync.app`;
  return { subject, html, text };
}

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing. Set it in .env.local or pass it via env.");
    process.exit(1);
  }
  if (!TEMP_PASSWORD) {
    console.error("ADMIN_TEMP_PASSWORD missing. Set it in .env.local (don't commit) or pass it via env.");
    process.exit(1);
  }

  // Dynamic import after dotenv config so lib/email captures RESEND_API_KEY.
  const { sendEmail } = await import("../lib/email");

  for (const admin of ADMINS) {
    const { subject, html, text } = buildInvite(admin.name, admin.email);
    try {
      await sendEmail({ to: admin.email, subject, html, text });
      console.log(`✓ ${admin.email}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${admin.email} — ${msg}`);
    }
  }

  console.log("\nDone. Recipients should rotate their password under Account → Update password right after signing in.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
