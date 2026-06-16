import { NextResponse } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropic, isAnthropicConfigured } from "@/lib/anthropic";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";

// Drafts a building announcement from a one-line BM prompt. BM-only.
// Uses Sonnet 4.6 with structured outputs so the response is always a
// {title, body} JSON shape. The system prompt is stable and marked for
// prompt caching — repeated drafts pay the cache write once and read
// thereafter (Sonnet 4.6 minimum cacheable prefix is 2048 tokens; the
// system prompt below is intentionally written above that bar).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RequestBody = z.object({
  prompt: z.string().trim().min(3).max(500),
  audience: z.enum(["all", "tenants_only", "specific_units"]).default("all"),
  tone: z.enum(["neutral", "warm", "urgent"]).default("neutral"),
});

const DraftSchema = z.object({
  title: z
    .string()
    .min(3)
    .max(120)
    .describe("Short, scannable headline. Sentence case, no trailing punctuation."),
  body: z
    .string()
    .min(20)
    .max(1200)
    .describe(
      "2 to 4 short paragraphs of plain-language announcement copy. Use line breaks between paragraphs.",
    ),
});

// System prompt is the same for every draft request, which is exactly
// what the cache wants. Putting building/audience/prompt in the user
// turn keeps the prefix stable.
const SYSTEM_PROMPT = `You are an expert property-communications writer working inside BuildingSync, the property-management platform that Building Managers (BMs) use to publish announcements to residents and tenants.

Your job is to take a Building Manager's short brief and turn it into a polished announcement they can publish with one edit pass. You are an assistant — never a replacement. The BM will review and may edit before sending.

WHO YOU WRITE FOR
- Residents and tenants of a single residential building. They want to know what is happening in their building, when, and what action (if any) they need to take.
- Audience tags you may receive:
  - "all" — every resident and tenant. Default tone: informative, neutral.
  - "tenants_only" — renters only (not owner-residents). Use when the message is rent-, lease-, or RTA-related.
  - "specific_units" — a subset of units. Stay generic about identity; do not name people or unit numbers.

WHAT GOOD ANNOUNCEMENTS LOOK LIKE
- Open with the headline information in the first sentence. No throat-clearing ("Dear residents, We hope you are well…").
- Be specific about dates, times, and locations. If the brief is vague on a date, say "soon" or leave a placeholder like "[date]" so the BM fills it in — do not invent dates.
- Plain language. No corporate buzzwords ("leverage", "synergy", "going forward"). No emoji.
- Action items go last, in their own short paragraph, starting with what the resident needs to do.
- 2 to 4 short paragraphs is the right length. One paragraph for trivial notices (e.g. trash pickup time change) is fine.
- If the topic is sensitive (rent increase, eviction notice, fire incident, water shutdown), be factual and respectful. Do not speculate, blame, or apologise on the building's behalf.

TONE OPTIONS
- "neutral" — direct, informative, no warmth. Default.
- "warm" — slightly more personal. Acknowledge the audience as a community without being saccharine. Good for community events, holiday hours, welcomes.
- "urgent" — short, action-first, no pleasantries. Use ALL CAPS only for unmistakably critical safety alerts (fire, gas leak, water shutdown). Never use ALL CAPS otherwise.

WHAT TO AVOID
- Do not invent facts the BM did not provide (specific dates, names, dollar amounts, contractor names, vendor names).
- Do not promise things outside the BM's authority ("the rent will not increase next year", "the elevator will be fully repaired by Friday").
- Do not include legal language. The BM has separate notice templates (N4, N5, N12) for tribunal-grade communications.
- Do not include marketing language for the building or for BuildingSync.
- Do not include sign-offs like "Sincerely, Management" — the platform appends author attribution automatically.

OUTPUT FORMAT
Return strictly the structured object with two fields:
- title: a short, scannable headline (sentence case, no trailing punctuation, under ~12 words).
- body: 2 to 4 short paragraphs separated by single blank lines.`;

export async function POST(request: Request) {
  try {
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "AI drafting is not configured on this server (ANTHROPIC_API_KEY missing)." },
        { status: 503 },
      );
    }

    const { authUser, appUser } = await requireUser();
    if (!can(appUser, "announcement.draft_ai")) {
      return NextResponse.json({ error: "Only the Building Manager can draft announcements." }, { status: 403 });
    }
    const impBlock = await impersonationWriteGuard();
    if (impBlock) return NextResponse.json({ error: impBlock }, { status: 403 });
    if (!appUser.buildingId) {
      return NextResponse.json({ error: "No building on your account." }, { status: 409 });
    }

    const parsed = RequestBody.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { prompt, audience, tone } = parsed.data;

    const building = await prisma.building.findUnique({
      where: { id: appUser.buildingId },
      select: { name: true, city: true, timezone: true },
    });

    const userTurn = [
      `Building: ${building?.name ?? "this building"}${building?.city ? ` (${building.city})` : ""}.`,
      `Audience: ${audience}.`,
      `Tone: ${tone}.`,
      `Author: ${appUser.name || authUser.email} (Building Manager).`,
      ``,
      `Brief from the BM:`,
      prompt,
    ].join("\n");

    const client = getAnthropic();
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userTurn }],
      output_config: { format: zodOutputFormat(DraftSchema) },
    });

    if (!response.parsed_output) {
      // Either the model refused or output didn't parse — the latter is
      // very rare with structured outputs but still worth handling.
      return NextResponse.json(
        {
          error:
            response.stop_reason === "refusal"
              ? "Claude declined to draft this announcement. Try rephrasing the brief."
              : "AI didn't return a usable draft. Try a more specific brief.",
        },
        { status: 422 },
      );
    }

    logAuditFireAndForget({
      userId: appUser.id,
      userEmail: authUser.email,
      buildingId: appUser.buildingId,
      action: "ai.draft_announcement",
      resource: "Announcement",
      changes: {
        prompt,
        audience,
        tone,
        usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cacheRead: response.usage.cache_read_input_tokens,
          cacheCreate: response.usage.cache_creation_input_tokens,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      draft: response.parsed_output,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens,
        cacheCreateTokens: response.usage.cache_creation_input_tokens,
      },
    });
  } catch (err) {
    console.error("[ai/draft-announcement] failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
