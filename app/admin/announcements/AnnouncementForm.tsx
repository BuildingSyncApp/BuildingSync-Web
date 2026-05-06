"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnnouncementForm({ hasBuilding }: { hasBuilding: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!hasBuilding) {
    return <p className="mt-3 text-sm opacity-70">Link your account to a building before posting.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Failed");
      return;
    }
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <input
        required
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full px-3 py-2 rounded-md border bg-transparent"
        style={{ borderColor: "currentColor" }}
      />
      <textarea
        required
        rows={4}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body"
        className="w-full px-3 py-2 rounded-md border bg-transparent"
        style={{ borderColor: "currentColor" }}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-md font-medium disabled:opacity-50"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {submitting ? "Posting…" : "Post announcement"}
      </button>
    </form>
  );
}
