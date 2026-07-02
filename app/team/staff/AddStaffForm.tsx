"use client";

import { useActionState, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { addStaff } from "./actions";
import { roleLabel } from "@/components/RoleBadge";

type Result =
  | { ok: true; email: string; role: "facility_manager" | "concierge"; message: string }
  | { ok: false; error: string }
  | null;

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState<Result, FormData>(addStaff, null);
  const [copied, setCopied] = useState<"email" | null>(null);

  useEffect(() => {
    if (state?.ok) toast.success(`${roleLabel(state.role)} added`, { description: state.email });
    if (state && !state.ok) toast.error("Couldn't add staff", { description: state.error });
  }, [state]);

  function copy(text: string, kind: "email") {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium text-foreground mb-1.5">Email</span>
          <input name="email" type="email" required placeholder="staff@example.com" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Role</span>
          <select name="role" defaultValue="facility_manager" className={inputClass}>
            <option value="facility_manager">Facility manager</option>
            <option value="concierge">Concierge</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-1.5">Name (optional)</span>
        <input name="name" type="text" placeholder="Jane Doe" className={inputClass} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Adding…" : "Add staff member"}
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
            className="rounded-md border border-accent/40 bg-accent/5 p-4 text-sm space-y-3"
          >
            <p className="font-medium text-accent flex items-center gap-2">
              <span aria-hidden="true">✓</span> {state.message}
            </p>
            <div className="bg-card/60 border border-border rounded p-3">
              <CredentialRow
                label="Email"
                value={state.email}
                copied={copied === "email"}
                onCopy={() => copy(state.email, "email")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We emailed a set-password invite to {state.email}. They choose their own password via the link, then sign in at /signin. The link expires in 7 days.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  highlight = false,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-xs">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className={`select-all truncate ${highlight ? "text-accent" : "text-foreground"}`}>{value}</span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 px-2 py-1 rounded text-[10px] uppercase tracking-wider border border-border hover:border-accent hover:text-accent transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
