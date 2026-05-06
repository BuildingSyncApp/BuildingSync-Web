"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  workOrder: {
    id: string;
    title: string;
    description: string;
    status: "open" | "assigned" | "in_progress" | "closed";
    createdAt: string;
    openedByLabel: string;
    unitLabel: string | null;
    assignedToLabel: string | null;
  };
  canAct: boolean;
};

const NEXT_STATUS: Record<Props["workOrder"]["status"], Props["workOrder"]["status"] | null> = {
  open: "assigned",
  assigned: "in_progress",
  in_progress: "closed",
  closed: null,
};

const NEXT_LABEL: Record<string, string> = {
  open: "Assign to me",
  assigned: "Start work",
  in_progress: "Mark closed",
};

export function WorkOrderRow({ workOrder, canAct }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATUS[workOrder.status];

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
      setError(body.error || "Failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <li className="p-3 rounded-md border" style={{ borderColor: "currentColor" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{workOrder.title}</span>
            <span className="text-xs uppercase tracking-wide px-2 py-0.5 rounded border" style={{ borderColor: "currentColor" }}>
              {workOrder.status.replace("_", " ")}
            </span>
            {workOrder.unitLabel && (
              <span className="text-xs opacity-60">Unit {workOrder.unitLabel}</span>
            )}
          </div>
          <p className="mt-1 text-sm opacity-80">{workOrder.description}</p>
          <p className="mt-2 text-xs opacity-50">
            Opened {new Date(workOrder.createdAt).toLocaleString()} by {workOrder.openedByLabel}
            {workOrder.assignedToLabel ? ` · Assigned to ${workOrder.assignedToLabel}` : ""}
          </p>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
        {canAct && next && (
          <button
            onClick={advance}
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-md font-medium disabled:opacity-50 shrink-0"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            {pending ? "…" : NEXT_LABEL[workOrder.status]}
          </button>
        )}
      </div>
    </li>
  );
}
