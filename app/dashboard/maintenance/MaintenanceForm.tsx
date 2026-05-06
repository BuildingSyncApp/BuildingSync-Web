"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MaintenanceForm({ hasBuilding }: { hasBuilding: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!hasBuilding) {
    return (
      <p className="mt-3 text-sm opacity-70">
        You can submit a request once a Building Manager assigns you to a building.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message || body.error || "Could not submit request.");
      return;
    }
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <label className="block">
        <span className="text-sm">Title</span>
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leaky faucet in kitchen"
          className="mt-1 w-full px-3 py-2 rounded-md border bg-transparent"
          style={{ borderColor: "currentColor" }}
        />
      </label>
      <label className="block">
        <span className="text-sm">Description</span>
        <textarea
          required
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Started yesterday. Constant drip, water pooling under sink."
          className="mt-1 w-full px-3 py-2 rounded-md border bg-transparent"
          style={{ borderColor: "currentColor" }}
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-md font-medium disabled:opacity-50"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {submitting ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
