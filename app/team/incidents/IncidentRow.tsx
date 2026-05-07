"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusPill, type Tone } from "@/components/StatusPill";
import { formatRelative } from "@/lib/format";
import { updateIncidentStatus } from "./actions";

type IncidentStatus = "open" | "in_progress" | "resolved";

const STATUS_TONES: Record<IncidentStatus, Tone> = {
  open: "accent",
  in_progress: "amber",
  resolved: "green",
};
const SEVERITY_TONES: Record<string, Tone> = {
  low: "neutral",
  medium: "blue",
  high: "amber",
  urgent: "red",
};

type Props = {
  incident: {
    id: string;
    type: string;
    severity: string;
    status: IncidentStatus;
    title: string;
    description: string | null;
    location: string | null;
    createdAt: string;
    reporterLabel: string;
  };
  canResolve: boolean;
};

export function IncidentRow({ incident, canResolve }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus(next: IncidentStatus) {
    const fd = new FormData();
    fd.set("incidentId", incident.id);
    fd.set("status", next);
    startTransition(async () => {
      const res = await updateIncidentStatus(null, fd);
      if (res.ok) {
        toast.success(next === "resolved" ? "Resolved" : `Marked ${next.replace("_", " ")}`);
        router.refresh();
      } else {
        toast.error("Couldn't update", { description: res.error });
      }
    });
  }

  const nextActions: Array<{ label: string; status: IncidentStatus; tone?: "primary" | "secondary" }> =
    incident.status === "open"
      ? [{ label: "Start work", status: "in_progress", tone: "secondary" }, { label: "Resolve", status: "resolved", tone: "primary" }]
      : incident.status === "in_progress"
        ? [{ label: "Resolve", status: "resolved", tone: "primary" }]
        : [{ label: "Reopen", status: "open", tone: "secondary" }];

  return (
    <li className="bg-card border border-border rounded-md p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{incident.title}</span>
            <StatusPill label={incident.type} tone="violet" />
            <StatusPill label={incident.severity} tone={SEVERITY_TONES[incident.severity] ?? "neutral"} />
            <StatusPill label={incident.status.replace("_", " ")} tone={STATUS_TONES[incident.status]} />
          </div>
          <div className="text-xs text-muted-foreground/85 mt-1">
            Reported by {incident.reporterLabel}
            {incident.location && <span> · {incident.location}</span>}
            <span> · {formatRelative(incident.createdAt)}</span>
          </div>
          {incident.description && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {incident.description}
            </p>
          )}
        </div>

        {canResolve && (
          <div className="flex items-center gap-2 shrink-0">
            {nextActions.map((a) => (
              <button
                key={a.status}
                type="button"
                disabled={pending}
                onClick={() => changeStatus(a.status)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-60 ${
                  a.tone === "primary"
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "border border-border hover:border-accent hover:text-accent"
                }`}
              >
                {pending ? "…" : a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
