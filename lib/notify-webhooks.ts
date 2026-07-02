// Slack + Discord webhook notifications for operational events (new
// enquiries, urgent work orders, …). Both are free:
//   • Slack: create an app at api.slack.com/apps → "Incoming Webhooks"
//     → Add New Webhook to Workspace → set SLACK_WEBHOOK_URL. Free on
//     every Slack plan, including the free tier.
//   • Discord: Server Settings → Integrations → Webhooks → New Webhook
//     → Copy URL → set DISCORD_WEBHOOK_URL. Free, no app required.
//
// Fire-and-forget like lib/email — a slow or failed webhook must never
// block or fail the user-facing action. Missing env vars = silent no-op,
// so this is safe to ship before the workspace is wired up.

const SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_URL = process.env.DISCORD_WEBHOOK_URL;

export type WebhookEvent = {
  title: string;
  // Plain-text lines rendered under the title (label: value pairs read
  // best in both clients).
  lines: string[];
  // Optional deep link back into the app (e.g. /platform/leads).
  href?: string;
};

async function postJson(url: string, body: unknown, label: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Webhook endpoints occasionally hang; don't hold the lambda open.
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) console.error(`[webhooks] ${label} responded ${res.status}`);
}

export function notifyWebhooksFireAndForget(event: WebhookEvent): void {
  const text = [
    `*${event.title}*`,
    ...event.lines,
    ...(event.href ? [event.href] : []),
  ].join("\n");

  if (SLACK_URL) {
    postJson(SLACK_URL, { text }, "slack").catch((err) =>
      console.error("[webhooks] slack failed:", err),
    );
  }
  if (DISCORD_URL) {
    // Discord uses **bold** and a `content` field (2000-char limit).
    postJson(
      DISCORD_URL,
      { content: text.replace(/^\*(.+)\*$/m, "**$1**").slice(0, 2000) },
      "discord",
    ).catch((err) => console.error("[webhooks] discord failed:", err));
  }
}
