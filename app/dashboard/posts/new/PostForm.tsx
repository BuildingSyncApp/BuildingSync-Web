"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPost } from "../actions";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "lost_and_found", label: "Lost & found" },
  { value: "free_stuff", label: "Free stuff" },
  { value: "swap", label: "Swap" },
  { value: "recommendation", label: "Recommendation" },
];

export function PostForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createPost(formData);
      if (res && res.ok === false) {
        setError(res.error);
        toast.error("Could not post", { description: res.error });
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="text-sm font-medium block mb-1">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={140}
          placeholder="Found: keys near the elevator"
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
        />
      </div>

      <div>
        <label htmlFor="category" className="text-sm font-medium block mb-1">Category</label>
        <select
          id="category"
          name="category"
          defaultValue="general"
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="body" className="text-sm font-medium block mb-1">Details</label>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          maxLength={4000}
          placeholder="Share the details — when, where, anything else neighbours should know."
          className="w-full px-3 py-2 rounded-md border border-border bg-background resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-700 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {pending ? "Posting…" : "Post to building"}
      </button>
    </form>
  );
}
