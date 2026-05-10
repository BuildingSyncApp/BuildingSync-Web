"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/Avatar";
import { roleLabel } from "@/components/RoleBadge";
import { formatRelative } from "@/lib/format";

type Note = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
  authorRole: string | null;
};

// Read-only update thread for residents. Same data the team sees on
// /team/work-orders, just without the composer — so a tenant can tell
// whether the building has actually picked up their request.
export function ResidentWorkOrderUpdates({ notes }: { notes: Note[] }) {
  const [open, setOpen] = useState(false);
  const count = notes.length;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        aria-expanded={open}
        disabled={count === 0}
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""} ${count === 0 ? "opacity-40" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {count === 0 ? "No updates yet" : `Updates · ${count}`}
      </button>

      <AnimatePresence initial={false}>
        {open && count > 0 && (
          <motion.ul
            key="updates"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {notes.map((n) => (
              <li
                key={n.id}
                className="bg-background/60 border border-border/70 rounded-md px-3 py-2.5 flex items-start gap-2.5"
              >
                <Avatar name={n.authorName} email={n.authorEmail} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs">
                    <span className="font-medium">{n.authorName || n.authorEmail}</span>
                    {n.authorRole && (
                      <span className="text-muted-foreground"> · {roleLabel(n.authorRole)}</span>
                    )}
                    <span className="text-muted-foreground"> · {formatRelative(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
