"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { decideVerification } from "./actions";

type Result = { ok: true; decision: "approve" | "reject" } | { ok: false; error: string } | null;

// Two-button row inside the pending-BM list: Approve / Reject. Reject is
// gated by a confirm dialog because it archives the account and is hard
// to reverse from the UI today.
export function VerificationActions({ userId, email }: { userId: string; email: string }) {
  const [approveState, approveAction, approvePending] = useActionState<Result, FormData>(decideVerification, null);
  const [rejectState, rejectAction, rejectPending] = useActionState<Result, FormData>(decideVerification, null);
  const rejectFormRef = useRef<HTMLFormElement>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (approveState?.ok) toast.success("Approved", { description: email });
    if (approveState && !approveState.ok) toast.error("Couldn't approve", { description: approveState.error });
  }, [approveState, email]);

  useEffect(() => {
    if (rejectState?.ok) toast.success("Rejected", { description: email });
    if (rejectState && !rejectState.ok) toast.error("Couldn't reject", { description: rejectState.error });
  }, [rejectState, email]);

  const pending = approvePending || rejectPending;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <form action={approveAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="decision" value="approve" />
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {approvePending ? "Saving…" : "Approve"}
        </button>
      </form>
      <form ref={rejectFormRef} action={rejectAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="decision" value="reject" />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirm({
              title: "Reject this Building Manager?",
              description: `${email} will be archived and won't be able to access /team. This is hard to reverse from the UI.`,
              confirmLabel: "Reject",
              destructive: true,
              onConfirm: () => rejectFormRef.current?.requestSubmit(),
            })
          }
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-60"
        >
          {rejectPending ? "Saving…" : "Reject"}
        </button>
      </form>
      {dialog}
    </div>
  );
}
