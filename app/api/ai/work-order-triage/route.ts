import { NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { getAnthropic, isAnthropicConfigured } from "@/lib/anthropic";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";
import { recordAiUsage } from "@/lib/ai-metering";

const AI_MODEL = "claude-sonnet-4-6";

// Triage summary for the BM/FM work-order queue. Takes the current
// open + in-progress work orders, returns a one-line summary the BM
// can scan in <2s. Sonnet 4.6 with structured output. Prompt caching
// on the system prompt — same prefix on every call.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TriageSchema = z.object({
  summary: z
    .string()
    .min(10)
    .max(280)
    .describe(
      "One concise line summarising the queue. Format: \"<count> open · <urgent count> urgent (<short label>) · <SLA breach count> past SLA · <other notable signal>\". Use Twitter-length brevity. No emoji.",
    ),
  recommendations: z
    .array(z.string().min(5).max(140))
    .max(3)
    .describe(
      "Up to 3 short recommendations the BM/FM should consider next, ordered by urgency. Skip if the queue is healthy.",
    ),
});

const SYSTEM_PROMPT = `You are a triage analyst for BuildingSync, a property-management platform used by Building Managers (BMs) and Facility Managers (FMs) to run residential buildings. You produce one-line summaries and short recommendation lists for the work-order queue.

YOUR JOB
- Read a list of open / in-progress work orders for a single building.
- Return a Twitter-length summary the BM/FM can scan in under 2 seconds.
- Return up to 3 short recommendations of what to do next, ordered by urgency. Skip if the queue is healthy.

WHAT TO LOOK FOR (in priority order)
1. SLA breaches (deadline already passed) — call these out by count and unit.
2. Urgent / high-priority items still open — call these out by count and the most representative title (e.g. "leak in 4B").
3. Stale work orders open longer than 7 days — flag if there are several.
4. Unassigned work orders, especially urgent ones — flag count.
5. Patterns: multiple work orders for the same unit, or a cluster around a system (HVAC, elevator, plumbing).

WHAT TO AVOID
- Do not list every work order. The summary is a *one-liner*.
- Do not invent facts. If you don't know the assignee, don't speculate.
- Do not include dates or times beyond what's in the data.
- Do not sound robotic ("There are X open work orders…"). Lead with the most urgent signal.
- Do not include emoji or formatting characters.

EMPTY QUEUE
- If there are zero open or in-progress work orders, return "0 open — queue is clear" as the summary and an empty recommendations array.

RECOMMENDATION STYLE
- Action verbs: "Assign", "Reach out to", "Escalate", "Re-prioritise".
- Be specific: name the unit or work-order title when you can.
- Skip generic advice ("communicate with residents", "stay on top of things").

Return strictly the structured object.`;

type WorkOrderInput = {
  id: string;
  issue: string;
  unit: string;
  priority: string;
  status: string;
  ageDays: number;
  pastSla: boolean;
  assigneeName: string | null;
  openedByName: string | null;
};

function summariseForModel(rows: WorkOrderInput[]): string {
  if (rows.length === 0) return "No open or in-progress work orders.";
  const lines = rows.map((r) =>
    [
      `[${r.priority.toUpperCase()}]`,
      r.status === "in_progress" ? "(in_progress)" : "(open)",
      r.pastSla ? "[SLA BREACH]" : "",
      `unit ${r.unit}`,
      `— ${r.issue}`,
      `(${r.ageDays}d old`,
      r.assigneeName ? `, assigned: ${r.assigneeName})` : ", unassigned)",
    ]
      .filter(Boolean)
      .join(" "),
  );
  return lines.join("\n");
}

export async function POST() {
  try {
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "AI triage is not configured (ANTHROPIC_API_KEY missing)." },
        { status: 503 },
      );
    }

    const { appUser } = await requireTeam();
    if (!can(appUser, "workorder.triage")) {
      return NextResponse.json({ error: "Only BM/FM can run triage." }, { status: 403 });
    }
    const impBlock = await impersonationWriteGuard();
    if (impBlock) return NextResponse.json({ error: impBlock }, { status: 403 });
    if (!appUser.buildingId) {
      return NextResponse.json({ error: "No building on your account." }, { status: 409 });
    }

    const now = new Date();
    const orders = await prisma.workOrder.findMany({
      where: {
        buildingId: appUser.buildingId,
        status: { in: ["open", "in_progress"] },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 50,
      include: {
        assignee: { select: { name: true, email: true } },
        openedBy: { select: { name: true, email: true } },
      },
    });

    const rows: WorkOrderInput[] = orders.map((o) => ({
      id: o.id,
      issue: o.issue,
      unit: o.unit || "—",
      priority: o.priority,
      status: o.status,
      ageDays: Math.floor((now.getTime() - o.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      pastSla: o.slaDeadline < now,
      assigneeName: o.assignee?.name ?? o.assignee?.email ?? null,
      openedByName: o.openedBy?.name ?? o.openedBy?.email ?? null,
    }));

    const userTurn = `Building queue (${rows.length} open / in-progress work orders):\n\n${summariseForModel(rows)}`;

    const client = getAnthropic();
    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 512,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userTurn }],
      output_config: { format: zodOutputFormat(TriageSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "AI didn't return a usable triage summary." },
        { status: 422 },
      );
    }

    // Meter this call against the building for billing + audit. Best-effort —
    // never blocks the response (recordAiUsage swallows its own errors).
    await recordAiUsage({
      buildingId: appUser.buildingId,
      userId: appUser.id,
      feature: "work_order_triage",
      model: AI_MODEL,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    });

    return NextResponse.json({
      ok: true,
      ...response.parsed_output,
      queueSize: rows.length,
      slaBreaches: rows.filter((r) => r.pastSla).length,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens,
        cacheCreateTokens: response.usage.cache_creation_input_tokens,
      },
    });
  } catch (err) {
    console.error("[ai/work-order-triage] failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
