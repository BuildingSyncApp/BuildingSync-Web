"use client";

import { useActionState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { reportIncident } from "./actions";

type Result = { ok: true; incidentId: string } | { ok: false; error: string } | null;

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

export function ReportIncidentForm() {
  const [state, formAction, pending] = useActionState<Result, FormData>(reportIncident, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Incident logged");
      formRef.current?.reset();
    }
    if (state && !state.ok) toast.error("Couldn't log incident", { description: state.error });
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2">
          <span className="block text-sm font-medium text-foreground mb-1.5">Title</span>
          <input
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="Short summary (e.g. 'Front door propped open')"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Type</span>
          <select name="type" defaultValue="security" className={inputClass}>
            <option value="security">Security</option>
            <option value="safety">Safety</option>
            <option value="noise">Noise</option>
            <option value="damage">Damage</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Severity</span>
          <select name="severity" defaultValue="medium" className={inputClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Location (optional)</span>
          <input
            name="location"
            type="text"
            maxLength={120}
            placeholder="Lobby, Garage P1, Unit 401, etc."
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-1.5">Details (optional)</span>
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="What happened, who was involved, what was done?"
          className={`${inputClass} resize-none`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Logging…" : "Log incident"}
      </button>

      <AnimatePresence>
        {state && !state.ok && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
