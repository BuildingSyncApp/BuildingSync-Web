"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { addLease, archiveLease } from "./actions";

type Tenant = { id: string; email: string; name: string | null };
type Unit = { id: string; unitNumber: string };
type Lease = {
  id: string;
  tenantLabel: string;
  unitLabel: string;
  rentAmountMonthly: number;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseType: string;
};

type AddResult = { ok: true; leaseId: string } | { ok: false; error: string } | null;

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

export function LeaseSection({
  tenants,
  units,
  leases,
}: {
  tenants: Tenant[];
  units: Unit[];
  leases: Lease[];
}) {
  const router = useRouter();
  const [archivePending, startArchive] = useTransition();
  const [open, setOpen] = useState(false);
  // Toast + collapse live inside the action (not an effect) — actions run
  // in a transition, so setState here doesn't cascade renders.
  const [state, formAction, pending] = useActionState<AddResult, FormData>(
    async (prev, formData) => {
      const result = await addLease(prev, formData);
      if (result?.ok) {
        toast.success("Lease recorded");
        setOpen(false);
        router.refresh();
      }
      if (result && !result.ok) toast.error("Couldn't record lease", { description: result.error });
      return result;
    },
    null,
  );

  function endLease(leaseId: string, label: string) {
    if (!confirm(`End the active lease for ${label}? This unlocks the unit for a new lease.`)) return;
    const fd = new FormData();
    fd.set("leaseId", leaseId);
    startArchive(async () => {
      const res = await archiveLease(null, fd);
      if (res.ok) {
        toast.success("Lease ended", { description: label });
        router.refresh();
      } else {
        toast.error("Couldn't end lease", { description: res.error });
      }
    });
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Active leases · {leases.length}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={tenants.length === 0 || units.length === 0}
          className="text-sm px-3 py-1.5 rounded-md border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {open ? "Cancel" : "+ Record a lease"}
        </button>
      </div>

      {tenants.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Add a resident first; leases attach to a tenant.</p>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <form action={formAction} className="mt-4 bg-card border border-border rounded-md p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Tenant</span>
                  <select name="tenantId" required className={inputClass} defaultValue="">
                    <option value="" disabled>Select tenant…</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name || t.email}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Unit</span>
                  <select name="unitId" required className={inputClass} defaultValue="">
                    <option value="" disabled>Select unit…</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Lease start</span>
                  <input type="date" name="leaseStartDate" required className={inputClass} />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Lease end</span>
                  <input type="date" name="leaseEndDate" required className={inputClass} />
                </label>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Rent / month (CAD)</span>
                  <input type="number" name="rentAmountMonthly" required min="1" step="1" placeholder="2400" className={inputClass} />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Deposit (optional)</span>
                  <input type="number" name="securityDeposit" min="0" step="1" placeholder="2400" className={inputClass} />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Type</span>
                  <select name="leaseType" defaultValue="fixed_term" className={inputClass}>
                    <option value="fixed_term">Fixed term</option>
                    <option value="month_to_month">Month-to-month</option>
                  </select>
                </label>
              </div>

              {state && !state.ok && (
                <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {state.error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Record lease"}
                </button>
                <p className="text-xs text-muted-foreground">
                  Used by rent payments and N-form notices for amount + dates.
                </p>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {leases.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No active leases recorded yet.</p>
      ) : (
        <div className="mt-4 bg-card border border-border rounded-md overflow-hidden">
          <ul className="divide-y divide-border">
            {leases.map((l) => (
              <li key={l.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.tenantLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    Unit {l.unitLabel} · {fmtMoney(l.rentAmountMonthly)}/mo · {fmtDate(l.leaseStartDate)} → {fmtDate(l.leaseEndDate)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => endLease(l.id, l.tenantLabel)}
                  disabled={archivePending}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-red-500/60 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  End lease
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
