"use client";

import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bulkAddResidents } from "./actions";

type Result =
  | {
      ok: true;
      created: number;
      linked: number;
      rows: Array<{ row: number; email: string; status: "created" | "linked" }>;
      errors: Array<{ row: number; email: string; error: string }>;
    }
  | { ok: false; error: string }
  | null;

const SAMPLE = `email,role,unit
alice@example.com,resident,201
bob@example.com,tenant,202
charlie@example.com,resident,`;

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

export function BulkAddForm() {
  const [state, formAction, pending] = useActionState<Result, FormData>(bulkAddResidents, null);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Paste CSV with columns: <code className="font-mono">email, role, unit</code>. Header row optional. Role
        defaults to <code className="font-mono">resident</code>; unit can be blank. Existing users are re-linked.
      </p>
      <textarea
        name="csv"
        rows={6}
        placeholder={SAMPLE}
        className={`${inputClass} font-mono text-xs`}
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
        <span className="text-muted-foreground">or upload a .csv file:</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-card file:hover:bg-muted file:transition-colors file:cursor-pointer file:text-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Onboarding…" : "Onboard batch"}
      </button>

      <AnimatePresence mode="wait">
        {state && state.ok === false && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </motion.div>
        )}
        {state && state.ok === true && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="bg-card border border-border rounded-md p-4 text-sm space-y-3"
          >
            <p className="font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-accent">{state.created} created</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{state.linked} re-linked</span>
              {state.errors.length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-red-600 dark:text-red-400">{state.errors.length} errors</span>
                </>
              )}
            </p>

            {state.rows.filter((r) => r.status === "created").length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Invites sent
                </p>
                <div className="font-mono text-xs space-y-1 bg-background/40 border border-border rounded p-3 max-h-48 overflow-y-auto">
                  {state.rows
                    .filter((r) => r.status === "created")
                    .map((r) => (
                      <div key={r.row} className="flex justify-between gap-3">
                        <span className="select-all truncate min-w-0">{r.email}</span>
                        <span className="text-accent shrink-0">set-password invite emailed</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {state.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">Errors</p>
                <ul className="space-y-1 text-xs">
                  {state.errors.map((e) => (
                    <li key={e.row}>
                      <span className="text-muted-foreground">Row {e.row}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span>{e.email || "—"}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="text-red-600 dark:text-red-400">{e.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
