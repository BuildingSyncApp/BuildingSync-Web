"use client";

import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addUnit } from "./actions";

type Result =
  | { ok: true; unitNumber: string }
  | { ok: false; error: string }
  | null;

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

export function AddUnitForm() {
  const [state, formAction, pending] = useActionState<Result, FormData>(addUnit, null);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Unit number</span>
          <input name="unitNumber" required maxLength={20} placeholder="201" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Floor</span>
          <input name="floor" type="number" min={0} max={200} placeholder="2" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1.5">Rent (USD/mo)</span>
          <input name="rentAmount" type="number" step="0.01" min={0} placeholder="1500" className={inputClass} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Adding…" : "Add unit"}
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
          <motion.p
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent flex items-center gap-2"
          >
            <span aria-hidden="true">✓</span>
            <span>Unit {state.unitNumber} created.</span>
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}
