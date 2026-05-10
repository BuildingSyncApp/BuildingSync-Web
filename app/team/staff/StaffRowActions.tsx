"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { roleLabel } from "@/components/RoleBadge";
import { archiveStaff, changeStaffRole } from "./actions";

type StaffRole = "facility_manager" | "concierge";

type Props = {
  userId: string;
  email: string;
  name: string | null;
  role: StaffRole;
};

const OTHER_ROLE: Record<StaffRole, StaffRole> = {
  facility_manager: "concierge",
  concierge: "facility_manager",
};

export function StaffRowActions({ userId, email, name, role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLabel = name || email;
  const otherRole = OTHER_ROLE[role];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmArchive(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function flipRole() {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", otherRole);
    startTransition(async () => {
      const res = await changeStaffRole(null, fd);
      if (res.ok) {
        toast.success("Role updated", { description: `${targetLabel} → ${roleLabel(otherRole)}` });
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Couldn't change role", { description: res.error });
      }
    });
  }

  function archive() {
    const fd = new FormData();
    fd.set("userId", userId);
    if (reason.trim()) fd.set("reason", reason.trim());
    startTransition(async () => {
      const res = await archiveStaff(null, fd);
      if (res.ok) {
        toast.success("Staff deactivated", { description: targetLabel });
        setOpen(false);
        setConfirmArchive(false);
        setReason("");
        router.refresh();
      } else {
        toast.error("Couldn't deactivate", { description: res.error });
      }
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Manage ${targetLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-accent/60 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-10 z-20 w-72 bg-card border border-border rounded-md shadow-lg p-2"
          >
            {!confirmArchive ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={flipRole}
                  disabled={pending}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted/40 transition-colors disabled:opacity-60"
                >
                  Change role to <span className="font-medium">{roleLabel(otherRole)}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setConfirmArchive(true)}
                  disabled={pending}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                >
                  Deactivate staff member…
                </button>
              </>
            ) : (
              <div className="p-1 space-y-3">
                <div>
                  <p className="text-sm font-medium">Deactivate {targetLabel}?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    They’ll lose access immediately. You can re-add them later by email.
                  </p>
                </div>
                <label className="block">
                  <span className="block text-xs text-muted-foreground mb-1">Reason (optional)</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={280}
                    placeholder="e.g. Left the building"
                    className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors"
                  />
                </label>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmArchive(false);
                      setReason("");
                    }}
                    className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={archive}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors disabled:opacity-60"
                  >
                    {pending ? "Deactivating…" : "Deactivate"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
