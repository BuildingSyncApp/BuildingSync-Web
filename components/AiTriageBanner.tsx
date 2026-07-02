"use client";

import { useEffect, useState } from "react";

type TriageState =
  | { status: "loading" }
  | { status: "ok"; summary: string; recommendations: string[]; queueSize: number; slaBreaches: number }
  | { status: "empty" }
  | { status: "disabled" }
  | { status: "error"; message: string };

// Lazy-loaded AI summary above the work-order queue. Fires a single
// /api/ai/work-order-triage call on mount; gracefully degrades to a
// silent empty/error state so the queue page still works without AI.

export function AiTriageBanner() {
  const [state, setState] = useState<TriageState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/work-order-triage", { method: "POST" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 503) {
          setState({ status: "disabled" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error", message: data.error || "Triage failed" });
          return;
        }
        if (data.queueSize === 0) {
          setState({ status: "empty" });
          return;
        }
        setState({
          status: "ok",
          summary: data.summary,
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          queueSize: data.queueSize,
          slaBreaches: data.slaBreaches,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "disabled") return null;
  if (state.status === "empty") return null;

  return (
    <div className="bg-violet-500/5 border border-violet-500/30 rounded-md p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-md bg-violet-500/15 text-violet-700 dark:text-violet-400 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
            <path d="M19 14l.7 1.7L21.5 16.5l-1.7.7L19 19l-.7-1.7L16.5 16.5l1.7-.7L19 14z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-widest text-violet-700 dark:text-violet-400">
              AI triage
            </span>
            {state.status === "ok" && state.slaBreaches > 0 && (
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10">
                {state.slaBreaches} overdue
              </span>
            )}
          </div>
          {state.status === "loading" && (
            <p className="mt-2 text-sm text-muted-foreground italic">Reading the queue…</p>
          )}
          {state.status === "error" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Couldn&apos;t generate triage summary right now.
            </p>
          )}
          {state.status === "ok" && (
            <>
              <p className="mt-2 text-sm leading-relaxed">{state.summary}</p>
              {state.recommendations.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc list-inside marker:text-violet-500">
                  {state.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
