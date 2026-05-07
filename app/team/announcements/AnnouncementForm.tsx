"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

type Audience = "all" | "tenants_only" | "specific_units";
type Unit = { id: string; unitNumber: string };

export function AnnouncementForm({ hasBuilding, units }: { hasBuilding: boolean; units: Unit[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [targetUnitIds, setTargetUnitIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ count: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!hasBuilding) {
    return <p className="mt-3 text-sm text-muted-foreground">Link your account to a building before posting.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (audience === "specific_units" && targetUnitIds.length === 0) {
      setError("Pick at least one unit, or change the audience.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        audience,
        targetUnitIds: audience === "specific_units" ? targetUnitIds : [],
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      const msg = b.error || "Failed to post announcement.";
      setError(msg);
      toast.error("Couldn't post", { description: msg });
      return;
    }
    const data = await res.json().catch(() => ({}));
    setTitle("");
    setBody("");
    setAudience("all");
    setTargetUnitIds([]);
    setSuccess({ count: data.recipientCount ?? 0 });
    toast.success("Announcement posted", {
      description: `Email sent to ${data.recipientCount ?? 0} recipient${data.recipientCount === 1 ? "" : "s"}.`,
    });
    router.refresh();
    setTimeout(() => setSuccess(null), 4000);
  }

  function toggleUnit(id: string) {
    setTargetUnitIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-1.5">Title</span>
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Elevator maintenance — Saturday 10am"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-1.5">Body</span>
        <textarea
          required
          rows={4}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details — what residents need to know."
          className={`${inputClass} resize-none`}
        />
        <span className="mt-1 block text-xs text-muted-foreground">{body.length}/5000</span>
      </label>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground mb-2">Audience</legend>
        <div className="space-y-2">
          <AudienceOption
            value="all"
            checked={audience === "all"}
            onChange={setAudience}
            title="All residents and tenants"
            description="Default — everyone in this building."
          />
          <AudienceOption
            value="tenants_only"
            checked={audience === "tenants_only"}
            onChange={setAudience}
            title="Tenants only"
            description="Use for rent or lease comms; excludes condo residents."
          />
          <AudienceOption
            value="specific_units"
            checked={audience === "specific_units"}
            onChange={setAudience}
            title="Specific units"
            description="Pick the units below."
          />
        </div>
      </fieldset>

      <AnimatePresence>
        {audience === "specific_units" && (
          <motion.div
            key="units"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {units.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No units in this building yet. Add units under{" "}
                <a href="/team/units" className="text-accent hover:underline">/team/units</a> first.
              </p>
            ) : (
              <div className="rounded-md border border-border p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {units.map((u) => {
                    const checked = targetUnitIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                          checked ? "bg-accent/10 text-accent" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUnit(u.id)}
                          className="accent-accent"
                        />
                        <span className="font-mono">{u.unitNumber}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {targetUnitIds.length} of {units.length} selected
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent flex items-center gap-2"
          >
            <span aria-hidden="true">✓</span>
            <span>Announcement posted. Email sent to {success.count} recipient{success.count === 1 ? "" : "s"}.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={submitting || !title.trim() || !body.trim()}
        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Posting…" : "Post announcement"}
      </button>
    </form>
  );
}

function AudienceOption({
  value,
  checked,
  onChange,
  title,
  description,
}: {
  value: Audience;
  checked: boolean;
  onChange: (v: Audience) => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
        checked ? "border-accent bg-accent/5" : "border-border hover:border-border/80"
      }`}
    >
      <input
        type="radio"
        name="audience"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 accent-accent"
      />
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </label>
  );
}
