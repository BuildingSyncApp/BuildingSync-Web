import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const TO = process.env.CONTACT_INBOX || "info@buildingsync.app";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().toLowerCase(),
  topic: z.enum(["pilot", "enterprise", "support", "press", "other"]).default("other"),
  message: z.string().trim().min(10).max(4000),
  // Honeypot — real humans don't see/fill this. Bots will.
  company: z.string().optional(),
});

const TOPIC_LABEL: Record<string, string> = {
  pilot: "Pilot interest",
  enterprise: "Enterprise / Government",
  support: "Support",
  press: "Press",
  other: "General",
};

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  // Silently drop honeypot hits — looks the same as a successful POST so
  // bots don't learn the field is the trap.
  if (parsed.data.company && parsed.data.company.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { name, email, topic, message } = parsed.data;
  const subject = `[Contact · ${TOPIC_LABEL[topic]}] ${name}`;

  // Persist the lead FIRST, before attempting email. Previously the route
  // only emailed — and sendEmail() returns void even when RESEND_API_KEY is
  // missing or Resend errors, so a misconfiguration silently dropped real
  // inquiries while still telling the visitor "thanks". Writing to Postgres
  // first guarantees the lead is recoverable from /platform regardless of
  // email outcome. If the DB write itself fails we surface a 500 so the
  // visitor can retry rather than think they got through.
  const submissionId = randomUUID();
  try {
    await prisma.contactSubmission.create({
      data: {
        id: submissionId,
        name,
        email,
        topic,
        message,
        country: request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || null,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
      },
    });
  } catch (err) {
    console.error("[contact] failed to persist submission", err);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,sans-serif;color:#141414;">
<h2 style="margin:0 0 8px;">${escape(TOPIC_LABEL[topic])}</h2>
<p style="margin:0 0 16px;color:#666;">From <strong>${escape(name)}</strong> &lt;<a href="mailto:${escape(email)}">${escape(email)}</a>&gt;</p>
<div style="white-space:pre-wrap;border-left:3px solid #d35a3f;padding:8px 12px;background:#faf7f1;">${escape(message)}</div>
</body></html>`;

  const text = `${TOPIC_LABEL[topic]}
From: ${name} <${email}>

${message}`;

  // Now attempt the notification email. The lead is already saved, so an
  // email failure must NOT fail the request — we record the outcome on the
  // row instead, leaving emailedAt null + an emailError for ops follow-up.
  try {
    await sendEmail({ to: TO, subject, html, text });
    await prisma.contactSubmission
      .update({ where: { id: submissionId }, data: { emailedAt: new Date() } })
      .catch((err) => console.error("[contact] failed to mark emailedAt", err));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[contact] sendEmail failed", err);
    await prisma.contactSubmission
      .update({ where: { id: submissionId }, data: { emailError: errorMessage.slice(0, 500) } })
      .catch((e) => console.error("[contact] failed to record emailError", e));
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
