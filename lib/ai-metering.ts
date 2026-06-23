import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// AI metering + capability gating. Central place that:
//   1. knows what each AI capability tier costs and which buildings have it,
//   2. computes the USD cost of a Claude call from its token usage,
//   3. records every call to the AiUsage ledger (billing source + audit).
//
// "AI-native, variable pricing": the base per-unit price stays simple; AI is a
// separate metered add-on. A building only pays for the AI it actually uses,
// and only the capabilities it has enabled can run. See docs/INTEGRATIONS.md
// §6a. server-only — never bundle into client code.

// ─── Models & pricing ────────────────────────────────────────────────────
// Per-million-token USD rates. Snapshot at call time into AiUsage.costMicros
// so historical billing isn't retroactively changed when rates move. Keep in
// sync with Anthropic's published pricing. Cache reads are far cheaper than
// fresh input; cache writes cost slightly more than input.

export type AiModel = "claude-opus-4-8" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";

interface ModelRate {
  input: number; // $ / 1M input tokens
  output: number; // $ / 1M output tokens
  cacheRead: number;
  cacheWrite: number;
}

const MODEL_RATES: Record<AiModel, ModelRate> = {
  // Most capable — use for "Agentic" tier work.
  "claude-opus-4-8": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  // Balanced — current default for Assist/Insight features.
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  // Cheapest/fastest — high-volume, low-stakes assists.
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

// Compute cost in integer micro-dollars (USD ×1e6) to avoid float drift.
export function computeCostMicros(model: string, usage: TokenUsage): number {
  const rate = MODEL_RATES[model as AiModel];
  if (!rate) return 0; // unknown model → record usage but don't guess a price
  const dollars =
    (usage.inputTokens / 1_000_000) * rate.input +
    (usage.outputTokens / 1_000_000) * rate.output +
    ((usage.cacheReadTokens ?? 0) / 1_000_000) * rate.cacheRead +
    ((usage.cacheWriteTokens ?? 0) / 1_000_000) * rate.cacheWrite;
  return Math.round(dollars * 1_000_000);
}

// ─── Capabilities ──────────────────────────────────────────────────────────
// A stable feature key per AI capability, grouped into billing tiers. A
// building enables tiers via Building.enabledModules.ai (a string[] of tier
// names); if unset we fall back to DEFAULT_ENABLED_TIERS so existing behaviour
// (the two shipped features) keeps working until billing is wired up.

export type AiTier = "assist" | "insight" | "agentic";

export const AI_FEATURES = {
  work_order_triage: "assist",
  draft_announcement: "assist",
  policy_assist: "insight",
  incident_summary: "insight",
  agentic_workflow: "agentic",
} as const satisfies Record<string, AiTier>;

export type AiFeature = keyof typeof AI_FEATURES;

// Until per-building billing is live, every building gets the shipped Assist
// features. Insight/Agentic are opt-in via enabledModules.ai.
const DEFAULT_ENABLED_TIERS: AiTier[] = ["assist"];

interface EnabledModules {
  ai?: AiTier[];
}

// Resolve which AI tiers a building has enabled from its enabledModules JSON.
export function enabledTiersFor(enabledModules: unknown): AiTier[] {
  const mods = (enabledModules ?? {}) as EnabledModules;
  if (Array.isArray(mods.ai) && mods.ai.length > 0) return mods.ai;
  return DEFAULT_ENABLED_TIERS;
}

// Is a given AI feature available to this building?
export function isFeatureEnabled(feature: AiFeature, enabledModules: unknown): boolean {
  const tier = AI_FEATURES[feature];
  return enabledTiersFor(enabledModules).includes(tier);
}

// ─── Recording ───────────────────────────────────────────────────────────
// Persist one usage row. Best-effort: a metering write must never break the
// user-facing AI response, so failures are logged and swallowed. Returns the
// computed cost so callers can surface it if they want.
export async function recordAiUsage(args: {
  buildingId: string;
  userId?: string | null;
  feature: AiFeature;
  model: string;
  usage: TokenUsage;
}): Promise<number> {
  const costMicros = computeCostMicros(args.model, args.usage);
  try {
    await prisma.aiUsage.create({
      data: {
        id: randomUUID(),
        buildingId: args.buildingId,
        userId: args.userId ?? null,
        feature: args.feature,
        model: args.model,
        inputTokens: args.usage.inputTokens,
        outputTokens: args.usage.outputTokens,
        cacheReadTokens: args.usage.cacheReadTokens ?? 0,
        cacheWriteTokens: args.usage.cacheWriteTokens ?? 0,
        costMicros,
      },
    });
  } catch (err) {
    console.error("[ai-metering] failed to record usage", { feature: args.feature, err });
  }
  return costMicros;
}
