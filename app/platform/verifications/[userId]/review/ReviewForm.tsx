"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { decideVerification } from "../../actions";

type Result = { ok: true; decision: "approve" | "reject" } | { ok: false; error: string } | null;

type Defaults = {
  companyName: string | null;
  managerType: string | null;
  businessNumber: string | null;
  licenseNumber: string | null;
  licenseExpiresAt: Date | null;
  trustAccountBank: string | null;
  insuranceCarrier: string | null;
  insurancePolicyNum: string | null;
  insuranceExpiresAt: Date | null;
  managesReserveFund: boolean;
  fidelityBondAmount: number | null;
  notes: string | null;
  evidenceUrl: string | null;
};

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function ReviewForm({
  userId,
  email,
  defaults,
}: {
  userId: string;
  email: string;
  defaults: Defaults;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<Result, FormData>(decideVerification, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(`${state.decision === "approve" ? "Approved" : "Rejected"}`, { description: email });
      router.push("/platform");
    }
    if (state && !state.ok) toast.error("Couldn't save", { description: state.error });
  }, [state, email, router]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="decision" value="approve" />

      <Section title="Company">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Company name" required>
            <input
              name="companyName"
              type="text"
              required
              defaultValue={defaults.companyName ?? ""}
              maxLength={120}
              className={inputClass}
            />
          </Field>
          <Field label="Manager type" required>
            <select
              name="managerType"
              required
              defaultValue={defaults.managerType ?? ""}
              className={inputClass}
            >
              <option value="">Choose…</option>
              <option value="cmrao_licensed">CMRAO-licensed condo manager</option>
              <option value="management_firm">Incorporated property management firm</option>
              <option value="incorporated">Incorporated landlord</option>
              <option value="self_managed">Self-managing landlord</option>
            </select>
          </Field>
          <Field label="Business Number">
            <input
              name="businessNumber"
              type="text"
              defaultValue={defaults.businessNumber ?? ""}
              maxLength={20}
              placeholder="123456789RC0001"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="CMRAO licence number">
            <input
              name="licenseNumber"
              type="text"
              defaultValue={defaults.licenseNumber ?? ""}
              maxLength={20}
              placeholder="L1234567"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="CMRAO licence expires">
            <input
              name="licenseExpiresAt"
              type="date"
              defaultValue={toDateInputValue(defaults.licenseExpiresAt)}
              className={inputClass}
            />
          </Field>
          <Field label="Validity (months)" hint="How long until next review. Default 12.">
            <input
              name="validForMonths"
              type="number"
              min={1}
              max={36}
              defaultValue={12}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Financial-management facts"
        subtitle="Ontario RTA + CMSA compliance. Captured per review so the building's records hold up at the LTB or with insurers."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Trust account bank" hint="Where rent / condo fees are held separately from operating funds.">
            <input
              name="trustAccountBank"
              type="text"
              defaultValue={defaults.trustAccountBank ?? ""}
              maxLength={120}
              placeholder="e.g. RBC Royal Bank, Trust Account #..."
              className={inputClass}
            />
          </Field>
          <Field label="Insurance carrier">
            <input
              name="insuranceCarrier"
              type="text"
              defaultValue={defaults.insuranceCarrier ?? ""}
              maxLength={120}
              placeholder="e.g. Aviva, Intact, Liberty Mutual"
              className={inputClass}
            />
          </Field>
          <Field label="Insurance policy number">
            <input
              name="insurancePolicyNum"
              type="text"
              defaultValue={defaults.insurancePolicyNum ?? ""}
              maxLength={80}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Insurance expires">
            <input
              name="insuranceExpiresAt"
              type="date"
              defaultValue={toDateInputValue(defaults.insuranceExpiresAt)}
              className={inputClass}
            />
          </Field>
          <Field label="Fidelity bond amount (USD)">
            <input
              name="fidelityBondAmount"
              type="number"
              step="1000"
              min={0}
              defaultValue={defaults.fidelityBondAmount ?? ""}
              placeholder="e.g. 250000"
              className={inputClass}
            />
          </Field>
          <Field label="Manages reserve fund?">
            <label className="flex items-center gap-2 mt-2.5 text-sm">
              <input
                name="managesReserveFund"
                type="checkbox"
                defaultChecked={defaults.managesReserveFund}
                className="w-4 h-4 accent-accent"
              />
              <span>Yes — manages condo reserve fund accounting</span>
            </label>
          </Field>
        </div>
      </Section>

      <Section title="Reviewer notes">
        <Field label="Notes" hint="Internal — visible to the BM in their verification history.">
          <textarea
            name="notes"
            rows={3}
            defaultValue={defaults.notes ?? ""}
            maxLength={500}
            placeholder="e.g. Confirmed CMRAO licence active. Insurance renewed Jan 2026. No outstanding complaints on file."
            className={inputClass}
          />
        </Field>
        <Field label="Evidence URL" hint="Optional — link to uploaded scan / external record.">
          <input
            name="evidenceUrl"
            type="url"
            defaultValue={defaults.evidenceUrl ?? ""}
            maxLength={500}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </Section>

      <AnimatePresence mode="wait">
        {state && !state.ok && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Approval writes a snapshot to verification history + updates the BM&apos;s next-due date.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Approve & record"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
