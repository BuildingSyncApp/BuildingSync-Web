"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { decideVerification } from "./actions";

type Result = { ok: true; decision: "approve" | "reject" } | { ok: false; error: string } | null;

// Two-button row inside the pending-BM list: Approve / Reject. Reject is
// gated by a confirm dialog because it archives the account and is hard
// to reverse from the UI today. The approve flow forwards the company
// snapshot the BM provided at signup so the server action can create a
// complete ManagerVerification history row. A future iteration will
// open a richer modal here to capture financial-management facts
// (trust account, insurance, fidelity bond) at review time.
export function VerificationActions({
  userId,
  email,
  company,
  managerType,
  businessNumber,
  licenseNumber,
}: {
  userId: string;
  email: string;
  company?: string | null;
  managerType?: string | null;
  businessNumber?: string | null;
  licenseNumber?: string | null;
}) {
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
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      {/* Detailed review opens a dedicated page with all financial
          fields. Use this for proper reviews; the one-click approve
          below is for obvious renewals where signup data is complete. */}
      <Link
        href={`/platform/verifications/${userId}/review`}
        className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-md text-sm font-medium border border-accent/40 bg-accent/5 text-accent hover:bg-accent/10 transition-colors"
      >
        Review in detail →
      </Link>
      <form action={approveAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="decision" value="approve" />
        {/* Snapshot the BM's signup-captured facts so the server can
            create a complete ManagerVerification row. Defaults applied
            when fields are missing (legacy signups predate capture). */}
        <input type="hidden" name="companyName" value={company || "Not provided"} />
        <input type="hidden" name="managerType" value={managerType || "incorporated"} />
        <input type="hidden" name="businessNumber" value={businessNumber || ""} />
        <input type="hidden" name="licenseNumber" value={licenseNumber || ""} />
        <input type="hidden" name="validForMonths" value="12" />
        <button
          type="submit"
          disabled={pending || !company}
          title={!company ? "BM hasn't provided a company name — ask them to update before approving." : "Quick-approve with current signup facts only. Use 'Review in detail' to capture financial-management facts."}
          className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {approvePending ? "Saving…" : company ? "Quick approve" : "Need company info"}
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
          className="px-4 py-2 sm:px-3 sm:py-1.5 rounded-md text-sm font-medium border border-border hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-60"
        >
          {rejectPending ? "Saving…" : "Reject"}
        </button>
      </form>
      {dialog}
    </div>
  );
}
