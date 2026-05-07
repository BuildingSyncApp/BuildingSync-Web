"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { StatusPill, workOrderTone } from "@/components/StatusPill";
import { WorkOrderNotes } from "./WorkOrderNotes";

type Status = "open" | "in_progress" | "scheduled" | "completed" | "closed";

type Note = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorEmail: string;
};

type Props = {
  workOrder: {
    id: string;
    title: string;
    description: string | null;
    status: Status;
    createdAt: string;
    openedByLabel: string;
    unitLabel: string | null;
    assignedToLabel: string | null;
  };
  notes: Note[];
  canAct: boolean;
};

// Linear lifecycle for R1: open → in_progress (= "I've taken it on") →
// closed. The DB enum has scheduled + completed too, but we don't expose
// those buttons; manual SQL or a future UI can drive them.
const NEXT_STATUS: Record<Status, Status | null> = {
  open: "in_progress",
  in_progress: "closed",
  scheduled: "in_progress",
  completed: "closed",
  closed: null,
};

const NEXT_LABEL: Record<string, string> = {
  open: "Take on",
  in_progress: "Mark closed",
  scheduled: "Start work",
  completed: "Close",
};

export function WorkOrderRow({ workOrder, notes, canAct }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const next = NEXT_STATUS[workOrder.status];
  const showAction = canAct && next;
  const description = workOrder.description ?? "";
  const isLong = description.length > 180;

  async function advance() {
    if (!next) return;
    setError(null);
    const res = await fetch(`/api/work-orders/${workOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, assignSelf: workOrder.status === "open" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || "Failed to update.";
      setError(msg);
      toast.error("Couldn't update", { description: msg });
      return;
    }
    toast.success(`Marked ${next.replace("_", " ")}`, { description: workOrder.title });
    startTransition(() => router.refresh());
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-md p-4"
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{workOrder.title}</span>
            <StatusPill label={workOrder.status.replace("_", " ")} tone={workOrderTone(workOrder.status)} />
            {workOrder.unitLabel && (
              <span className="text-xs text-muted-foreground">Unit {workOrder.unitLabel}</span>
            )}
          </div>
          {description && (
            <p
              className={`mt-2 text-sm text-muted-foreground whitespace-pre-wrap ${
                !expanded && isLong ? "line-clamp-3" : ""
              }`}
            >
              {description}
            </p>
          )}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-accent hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
          <p className="mt-3 text-xs text-muted-foreground/85">
            Opened {new Date(workOrder.createdAt).toLocaleString()} by {workOrder.openedByLabel}
            {workOrder.assignedToLabel ? ` · Assigned to ${workOrder.assignedToLabel}` : ""}
          </p>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </div>
        {showAction && (
          <button
            type="button"
            onClick={advance}
            disabled={pending}
            className="w-full sm:w-auto text-sm px-4 py-2 rounded-md font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-60 shrink-0"
          >
            {pending ? "…" : NEXT_LABEL[workOrder.status]}
          </button>
        )}
      </div>
      <WorkOrderNotes workOrderId={workOrder.id} notes={notes} />
    </motion.li>
  );
}
