"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logDelivery } from "./actions";

type Resident = { id: string; label: string; unit: string | null };

export function LogDeliveryForm({ residents }: { residents: Resident[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await logDelivery(formData);
      if (res.ok === false) {
        setError(res.error);
        toast.error("Couldn't log delivery", { description: res.error });
        return;
      }
      toast.success("Logged", {
        description: `Pickup code ${res.pickupCode} sent to recipient.`,
      });
      // Reset is handled by revalidatePath redirecting back to a clean form.
      const form = document.getElementById("log-delivery-form") as HTMLFormElement | null;
      form?.reset();
    });
  }

  return (
    <form id="log-delivery-form" action={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="recipientUserId" className="text-sm font-medium block mb-1">Recipient</label>
        <select
          id="recipientUserId"
          name="recipientUserId"
          required
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
        >
          <option value="">Pick a resident…</option>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}{r.unit ? ` · Unit ${r.unit}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sender" className="text-sm font-medium block mb-1">Sender</label>
        <input
          id="sender"
          name="sender"
          type="text"
          required
          maxLength={120}
          placeholder="Amazon, UPS, FedEx…"
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
        />
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-medium block mb-1">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          maxLength={200}
          placeholder="Small box · 2 lbs"
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
        />
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium block mb-1">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Held behind the desk · ID required"
          className="w-full px-3 py-2 rounded-md border border-border bg-background resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-5 py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Logging…" : "Log delivery & notify resident"}
      </button>
    </form>
  );
}
