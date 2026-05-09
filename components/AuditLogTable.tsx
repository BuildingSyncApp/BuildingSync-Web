import { Avatar } from "@/components/Avatar";
import { formatRelative } from "@/lib/format";

// Append-only audit feed display. Used on both /team/audit-log
// (building-scoped) and /platform/audit-log (cross-building). Renders
// actor + action verb + resource pill + relative timestamp; expanded
// row shows changes JSON when present.

export type AuditRow = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  userEmail: string | null;
  ipAddress: string | null;
  changes: unknown;
  actor: { name: string | null; email: string } | null;
  building: { id: string; name: string } | null;
};

const ACTION_TONES: Record<string, string> = {
  create: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  delete: "border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10",
  archive: "border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10",
  update: "border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/10",
  status_change: "border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/10",
  role_change: "border-violet-500/30 text-violet-700 dark:text-violet-400 bg-violet-500/10",
  verify: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
  reject: "border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10",
  password_reset: "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
  default: "border-border text-muted-foreground bg-muted/40",
};

function actionTone(action: string): string {
  if (ACTION_TONES[action]) return ACTION_TONES[action];
  // Best-effort match on prefix: "user_create" → "create"
  for (const key of Object.keys(ACTION_TONES)) {
    if (action.includes(key)) return ACTION_TONES[key];
  }
  return ACTION_TONES.default;
}

export function AuditLogTable({
  rows,
  showBuilding = false,
}: {
  rows: AuditRow[];
  showBuilding?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-md p-8 text-center">
        <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Account changes, work-order edits, and verification decisions appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="bg-card border border-border rounded-md divide-y divide-border">
      {rows.map((r) => {
        const actorName = r.actor?.name || r.actor?.email || r.userEmail || "system";
        const actorEmail = r.actor?.email || r.userEmail || "";
        const failed = r.status === "error";
        return (
          <li key={r.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <Avatar name={r.actor?.name} email={actorEmail || actorName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{actorName}</span>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${actionTone(r.action)}`}
                  >
                    {r.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {r.resource}
                    {r.resourceId ? ` · ${r.resourceId.slice(0, 8)}` : ""}
                  </span>
                  {failed && (
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10">
                      failed
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatRelative(r.createdAt)}
                  {showBuilding && r.building?.name ? ` · ${r.building.name}` : ""}
                  {r.ipAddress ? ` · ${r.ipAddress}` : ""}
                </div>
                {failed && r.errorMessage && (
                  <p className="mt-2 text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                    {r.errorMessage}
                  </p>
                )}
                {r.changes !== null && r.changes !== undefined && (
                  <details className="mt-2">
                    <summary className="text-xs text-accent hover:underline cursor-pointer select-none">
                      View changes
                    </summary>
                    <pre className="mt-2 text-[11px] font-mono bg-muted/40 border border-border rounded-md p-3 overflow-x-auto">
                      {JSON.stringify(r.changes, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
