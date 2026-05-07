import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "BuildingSync <noreply@buildingsync.app>";
const APP_URL = process.env.APP_BASE_URL || "https://buildingsync.app";

const resend = apiKey ? new Resend(apiKey) : null;

type SendArgs = { to: string | string[]; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — skipping send:", subject);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) console.error("[email] send failed:", subject, error);
}

// Fire-and-forget for in-request side effects. We never want a slow/failed
// email to block the user-facing action; log and move on.
export function sendEmailFireAndForget(args: SendArgs): void {
  sendEmail(args).catch((err) => console.error("[email] fire-and-forget rejected:", args.subject, err));
}

// ─── Templates ──────────────────────────────────────────────────────────

// Sender identification + Privacy / Terms links satisfy CASL §6 (Canada
// Anti-Spam Law) requirements for any commercial electronic message.
// Operational service emails (work-order updates) arguably aren't CECMs,
// but adding the footer to all transactional mail is cheap and keeps us
// inside the safe lane regardless.
const wrap = (inner: string) => `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f4ee;color:#141414;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fffdf7;border:1px solid #e6dfce;border-radius:8px;padding:28px;">
${inner}
<hr style="margin-top:32px;border:0;border-top:1px solid #e6dfce;" />
<p style="margin-top:18px;font-size:11px;color:#999;line-height:1.55;">
  Sent by <strong style="color:#666;">BuildingSync</strong>, a Node2.io service.<br />
  You're receiving this because your building uses BuildingSync. Manage notification preferences in your account, or reply to this email if you'd prefer to stop receiving them.
</p>
<p style="margin-top:10px;font-size:11px;color:#999;">
  <a href="${APP_URL}/privacy" style="color:#999;">Privacy Policy</a> &nbsp;·&nbsp;
  <a href="${APP_URL}/terms" style="color:#999;">Terms</a> &nbsp;·&nbsp;
  <a href="mailto:info@buildingsync.app" style="color:#999;">info@buildingsync.app</a>
</p>
</div></body></html>`;

export function welcomeEmail(args: {
  email: string;
  password: string;
  buildingName: string | null;
  role: "resident" | "tenant";
}) {
  const { email, password, buildingName, role } = args;
  const signInUrl = `${APP_URL}/signin`;
  const html = wrap(`
<h1 style="font-size:22px;margin:0 0 8px;">Welcome to BuildingSync</h1>
<p>Your ${role} account at <strong>${escapeHtml(buildingName || "your building")}</strong> has been created.</p>
<table style="margin:16px 0;border-collapse:collapse;">
  <tr><td style="padding:6px 12px 6px 0;color:#666;">Email</td><td style="padding:6px 0;font-family:monospace;">${escapeHtml(email)}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666;">Temporary password</td><td style="padding:6px 0;font-family:monospace;">${escapeHtml(password)}</td></tr>
</table>
<p><a href="${signInUrl}" style="display:inline-block;background:#141414;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Sign in</a></p>
<p style="font-size:13px;color:#666;margin-top:16px;">After signing in, please change your password under <em>Account</em>.</p>`);
  return {
    subject: `Welcome to BuildingSync${buildingName ? ` — ${buildingName}` : ""}`,
    html,
    text: `Welcome to BuildingSync.\n\nEmail: ${email}\nTemporary password: ${password}\n\nSign in at ${signInUrl} and change your password under Account.`,
  };
}

export function workOrderCreatedEmail(args: {
  title: string;
  description: string;
  openedByLabel: string;
  unitLabel: string | null;
  buildingName: string | null;
  workOrderId: string;
}) {
  const { title, description, openedByLabel, unitLabel, buildingName, workOrderId } = args;
  const url = `${APP_URL}/team/work-orders`;
  const html = wrap(`
<h1 style="font-size:20px;margin:0 0 8px;">New maintenance request</h1>
<p style="color:#666;margin:0 0 16px;">${escapeHtml(buildingName || "")}${unitLabel ? ` · Unit ${escapeHtml(unitLabel)}` : ""}</p>
<h2 style="font-size:16px;margin:16px 0 4px;">${escapeHtml(title)}</h2>
<p style="white-space:pre-wrap;">${escapeHtml(description)}</p>
<p style="font-size:13px;color:#666;margin-top:16px;">Opened by ${escapeHtml(openedByLabel)}</p>
<p style="margin-top:20px;"><a href="${url}" style="display:inline-block;background:#141414;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View in BuildingSync</a></p>`);
  return {
    subject: `[Maintenance] ${title}${unitLabel ? ` · Unit ${unitLabel}` : ""}`,
    html,
    text: `New maintenance request\n\n${title}\n\n${description}\n\nOpened by ${openedByLabel}${unitLabel ? `, Unit ${unitLabel}` : ""}.\n\n${url}#${workOrderId}`,
  };
}

export function workOrderStatusChangedEmail(args: {
  title: string;
  oldStatus: string;
  newStatus: string;
  buildingName: string | null;
}) {
  const { title, oldStatus, newStatus, buildingName } = args;
  const url = `${APP_URL}/dashboard/maintenance`;
  const html = wrap(`
<h1 style="font-size:20px;margin:0 0 8px;">Your request was updated</h1>
<p style="color:#666;margin:0 0 16px;">${escapeHtml(buildingName || "")}</p>
<h2 style="font-size:16px;margin:16px 0 4px;">${escapeHtml(title)}</h2>
<p>Status changed from <strong>${escapeHtml(formatStatus(oldStatus))}</strong> to <strong>${escapeHtml(formatStatus(newStatus))}</strong>.</p>
<p style="margin-top:20px;"><a href="${url}" style="display:inline-block;background:#141414;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View request</a></p>`);
  return {
    subject: `[Maintenance] ${title} — ${formatStatus(newStatus)}`,
    html,
    text: `Your maintenance request "${title}" is now ${formatStatus(newStatus)}.\n\n${url}`,
  };
}

export function announcementBroadcastEmail(args: {
  title: string;
  body: string;
  buildingName: string | null;
  authorLabel: string;
}) {
  const { title, body, buildingName, authorLabel } = args;
  const url = `${APP_URL}/dashboard/announcements`;
  const excerpt = body.length > 800 ? body.slice(0, 800) + "…" : body;
  const html = wrap(`
<h1 style="font-size:22px;margin:0 0 4px;">${escapeHtml(title)}</h1>
<p style="color:#666;margin:0 0 16px;font-size:13px;">${escapeHtml(buildingName || "")} · from ${escapeHtml(authorLabel)}</p>
<div style="white-space:pre-wrap;line-height:1.55;">${escapeHtml(excerpt)}</div>
<p style="margin-top:20px;"><a href="${url}" style="display:inline-block;background:#141414;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View all announcements</a></p>`);
  return {
    subject: `[${buildingName || "Announcement"}] ${title}`,
    html,
    text: `${title}\n\n${excerpt}\n\nFrom ${authorLabel}${buildingName ? ` at ${buildingName}` : ""}.\n\n${url}`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function formatStatus(s: string): string {
  return s.replace(/_/g, " ");
}
