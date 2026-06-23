import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { getAnthropic, isAnthropicConfigured } from "@/lib/anthropic";
import { logAuditFireAndForget } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { impersonationWriteGuard } from "@/lib/impersonation-server";
import { recordAiUsage, isFeatureEnabled } from "@/lib/ai-metering";

// AI policy assist (Insight tier). Drafts or refines a building policy from a
// BM brief — the team owns the final text + the publish decision. Metered via
// AiUsage (feature "policy_assist") so the building is billed for what it uses,
// and gated on the building having the Insight AI tier enabled.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_MODEL = "claude-sonnet-4-6";
const AI_FEATURE = "policy_assist" as const;

const RequestBody = z.object({
  prompt: z.string().trim().min(3).max(800),
  category: z
    .enum(["pets", "noise", "amenities", "parking", "smoking", "short_term_rental", "safety", "general"])
    .default("general"),
  // Optional existing text to refine rather than draft from scratch.
  existing: z.string().trim().max(8000).optional(),
});

const PolicyDraftSchema = z.object({
  title: z.string().min(3).max(120).describe("A clear, specific policy title."),
  body: z
    .string()
    .min(40)
    .max(6000)
    .describe(
      "The policy text in plain, enforceable language. Use short numbered clauses where helpful. Neutral, respectful tone. No legal advice disclaimers — this is a building policy, not a contract.",
    ),
  notes: z
    .array(z.string().min(5).max(200))
    .max(4)
    .describe("Up to 4 short notes for the BM: gaps to confirm, fairness/accessibility flags, or local-law items to verify. Skip if none."),
});

const SYSTEM_PROMPT = `You are a policy-drafting assistant for BuildingSync, a property-management platform used by Building Managers (BMs) running residential buildings in Ontario / Canada. You help a BM draft or refine a building policy (e.g. pets, noise / quiet hours, amenity rules, parking, smoking, short-term rentals, safety).

YOUR JOB
- Turn the BM's brief into a clear, fair, enforceable building policy.
- If existing policy text is provided, refine it rather than rewrite from scratch — preserve intent, improve clarity and structure.
- Return a title, the policy body, and up to 4 short notes for the BM.

PRINCIPLES
- Plain language a resident can understand. Short numbered clauses where it helps.
- Fair and respectful. Avoid discriminatory criteria (protected grounds under the Ontario Human Rights Code). Accommodate accessibility / service animals where relevant.
- Stay within a building's authority — a policy is house rules, not law. Do NOT invent legal penalties or cite statutes you're unsure of. Where a rule may intersect with the RTA or condo bylaws, flag it in notes for the BM to confirm rather than asserting it.
- Don't fabricate specifics (fees, hours, contacts) the BM didn't provide — use a clearly-marked placeholder and add a note to confirm it.

WHAT TO AVOID
- No legalese, no boilerplate disclaimers, no "consult a lawyer" filler.
- Don't make the policy longer than it needs to be.

Return strictly the structured object.`;

export async function POST(request: NextRequest) {
  try {
    if (!isAnthropicConfigured()) {
      return NextResponse.json(
        { error: "AI policy assist is not configured (ANTHROPIC_API_KEY missing)." },
        { status: 503 },
      );
    }

    const { appUser, authUser } = await requireTeam();
    if (!can(appUser, "policy.manage")) {
      return NextResponse.json({ error: "Only the Building Manager can manage policies." }, { status: 403 });
    }
    const impBlock = await impersonationWriteGuard();
    if (impBlock) return NextResponse.json({ error: impBlock }, { status: 403 });
    if (!appUser.buildingId) {
      return NextResponse.json({ error: "No building on your account." }, { status: 409 });
    }

    const parsed = RequestBody.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const { prompt, category, existing } = parsed.data;

    const building = await prisma.building.findUnique({
      where: { id: appUser.buildingId },
      select: { name: true, city: true, enabledModules: true },
    });

    // Capability gating: this is an Insight-tier AI feature. A building must
    // have it enabled (drives metered billing — see lib/ai-metering.ts).
    if (!isFeatureEnabled(AI_FEATURE, building?.enabledModules)) {
      return NextResponse.json(
        { error: "AI policy assist isn't enabled for this building. Contact your account manager to add the Insight AI tier." },
        { status: 402 },
      );
    }

    const userTurn = [
      `Building: ${building?.name ?? "this building"}${building?.city ? ` (${building.city})` : ""}.`,
      `Policy category: ${category}.`,
      `Author: ${appUser.name || authUser.email} (Building Manager).`,
      existing ? `\nExisting policy text to refine:\n${existing}` : "",
      ``,
      `Brief from the BM:`,
      prompt,
    ].filter(Boolean).join("\n");

    const client = getAnthropic();
    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userTurn }],
      output_config: { format: zodOutputFormat(PolicyDraftSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        {
          error:
            response.stop_reason === "refusal"
              ? "Claude declined to draft this policy. Try rephrasing the brief."
              : "AI didn't return a usable policy draft. Try a more specific brief.",
        },
        { status: 422 },
      );
    }

    // Meter the call against the building (billing + audit). Best-effort.
    await recordAiUsage({
      buildingId: appUser.buildingId,
      userId: appUser.id,
      feature: AI_FEATURE,
      model: AI_MODEL,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    });

    logAuditFireAndForget({
      userId: appUser.id,
      userEmail: authUser.email,
      buildingId: appUser.buildingId,
      action: "ai.policy_assist",
      resource: "Policy",
      changes: { category, refined: Boolean(existing) },
    });

    return NextResponse.json({ ok: true, draft: response.parsed_output });
  } catch (err) {
    console.error("[ai/policy-assist] failed", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
