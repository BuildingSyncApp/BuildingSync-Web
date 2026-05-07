"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { formatRelative } from "@/lib/format";
import { addWorkOrderNote } from "./actions";

type Note = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
};

type Result = { ok: true; noteId: string } | { ok: false; error: string } | null;

// Threaded notes for a single work order. Collapsed by default to keep
// the row lightweight; expands on click and shows newest-first below the
// composer. Append-only — no edit/delete in R1.
export function WorkOrderNotes({ workOrderId, notes }: { workOrderId: string; notes: Note[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<Result, FormData>(addWorkOrderNote, null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
      toast.success("Note added");
    }
    if (state && !state.ok) toast.error("Couldn't add note", { description: state.error });
  }, [state, router]);

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        aria-expanded={open}
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
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
        Notes · {notes.length}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="notes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <form ref={formRef} action={formAction} className="mt-3 flex items-start gap-2">
              <input type="hidden" name="workOrderId" value={workOrderId} />
              <textarea
                name="body"
                rows={2}
                required
                maxLength={2000}
                placeholder="Add a note for the team…"
                className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={pending}
                className="text-sm px-3 py-2 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-60 shrink-0"
              >
                {pending ? "…" : "Post"}
              </button>
            </form>

            {notes.length > 0 && (
              <ul className="mt-3 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="bg-background/60 border border-border/70 rounded-md px-3 py-2.5 flex items-start gap-2.5">
                    <Avatar name={n.authorName} email={n.authorEmail} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs">
                        <span className="font-medium">{n.authorName || n.authorEmail}</span>
                        <span className="text-muted-foreground"> · {formatRelative(n.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
