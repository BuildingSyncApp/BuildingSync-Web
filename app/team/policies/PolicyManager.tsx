"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { savePolicy, setPolicyStatus } from "./actions";

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "pets", label: "Pets" },
  { value: "noise", label: "Noise / quiet hours" },
  { value: "amenities", label: "Amenities" },
  { value: "parking", label: "Parking" },
  { value: "smoking", label: "Smoking" },
  { value: "short_term_rental", label: "Short-term rentals" },
  { value: "safety", label: "Safety" },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export interface PolicyView {
  id: string;
  title: string;
  category: string;
  body: string;
  status: string;
  aiAssisted: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

type SaveResult = { ok: true; message: string } | { ok: false; error: string } | null;

export function PolicyManager({ policies, aiEnabled }: { policies: PolicyView[]; aiEnabled: boolean }) {
  const [editing, setEditing] = useState<PolicyView | null>(null);
  const [showForm, setShowForm] = useState(false);

  function startCreate() {
    setEditing(null);
    setShowForm(true);
  }
  function startEdit(p: PolicyView) {
    setEditing(p);
    setShowForm(true);
  }

  return (
    <div className="space-y-8">
      {!showForm && (
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          + New policy
        </button>
      )}

      {showForm && (
        <PolicyForm
          key={editing?.id ?? "new"}
          policy={editing}
          aiEnabled={aiEnabled}
          onDone={() => setShowForm(false)}
        />
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Policies · {policies.length}
        </h2>
        {policies.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            No policies yet. Create your building&apos;s first policy above — pets, quiet hours, parking, amenities, and more.
          </div>
        ) : (
          <ul className="space-y-3">
            {policies.map((p) => (
              <PolicyRow key={p.id} policy={p} onEdit={() => startEdit(p)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PolicyForm({
  policy,
  aiEnabled,
  onDone,
}: {
  policy: PolicyView | null;
  aiEnabled: boolean;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<SaveResult, FormData>(savePolicy, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState(policy?.body ?? "");
  const [title, setTitle] = useState(policy?.title ?? "");
  const [category, setCategory] = useState(policy?.category ?? "general");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(policy?.aiAssisted ?? false);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      onDone();
    }
    if (state && !state.ok) toast.error("Couldn't save policy", { description: state.error });
  }, [state, onDone]);

  async function runAiAssist() {
    if (!aiPrompt.trim()) {
      toast.error("Describe what the policy should cover first.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/policy-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim(), category, existing: body.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        draft?: { title: string; body: string; notes?: string[] };
        error?: string;
      };
      if (!res.ok || !data.draft) {
        toast.error("AI assist failed", { description: data.error || `HTTP ${res.status}` });
        return;
      }
      if (!title.trim()) setTitle(data.draft.title);
      setBody(data.draft.body);
      setAiAssisted(true);
      if (data.draft.notes && data.draft.notes.length > 0) {
        toast.message("AI notes to review", { description: data.draft.notes.join(" · ") });
      } else {
        toast.success("Draft ready — review and edit before publishing.");
      }
    } catch {
      toast.error("AI assist failed", { description: "Network error." });
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="bg-card border border-border rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{policy ? "Edit policy" : "New policy"}</h2>
        <button type="button" onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      {policy && <input type="hidden" name="id" value={policy.id} />}
      <input type="hidden" name="aiAssisted" value={String(aiAssisted)} />

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium mb-1.5">Title</span>
          <input
            name="title"
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quiet hours policy"
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium mb-1.5">Category</span>
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>

      {aiEnabled && (
        <div className="rounded-md border border-accent/30 bg-accent/5 p-3 space-y-2">
          <p className="text-xs font-medium text-accent uppercase tracking-wider">AI assist · Insight</p>
          <p className="text-xs text-muted-foreground">
            Describe the policy in a sentence — AI drafts it (metered usage). You own the final text.
          </p>
          <div className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. quiet hours 10pm–8am, no power tools on weekends before 9am"
              className={inputClass}
            />
            <button
              type="button"
              onClick={runAiAssist}
              disabled={aiBusy}
              className="shrink-0 inline-flex items-center px-3 py-2 rounded-md border border-accent text-accent text-sm font-medium hover:bg-accent/10 transition-colors disabled:opacity-60"
            >
              {aiBusy ? "Drafting…" : body.trim() ? "Refine" : "Draft"}
            </button>
          </div>
        </div>
      )}

      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Policy text</span>
        <textarea
          name="body"
          required
          minLength={20}
          maxLength={8000}
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the policy, or use AI assist above to draft it."
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : policy ? "Save changes" : "Create policy"}
        </button>
        {aiAssisted && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-accent/40 text-accent">
            AI-assisted
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state && !state.ok && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function PolicyRow({ policy, onEdit }: { policy: PolicyView; onEdit: () => void }) {
  const [statusState, statusAction, statusPending] = useActionState<SaveResult, FormData>(setPolicyStatus, null);

  useEffect(() => {
    if (statusState?.ok) toast.success(statusState.message);
    if (statusState && !statusState.ok) toast.error("Action failed", { description: statusState.error });
  }, [statusState]);

  const statusStyle =
    policy.status === "published"
      ? "border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/5"
      : policy.status === "archived"
      ? "border-border text-muted-foreground bg-muted/30"
      : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5";

  return (
    <li className="rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{policy.title}</h3>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${statusStyle}`}>
              {policy.status}
            </span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border text-muted-foreground">
              {CATEGORY_LABEL[policy.category] ?? policy.category}
            </span>
            {policy.aiAssisted && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-accent/40 text-accent">
                AI-assisted
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{policy.body}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button onClick={onEdit} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
          Edit
        </button>
        <form action={statusAction} className="contents">
          <input type="hidden" name="id" value={policy.id} />
          {policy.status !== "published" && (
            <button name="status" value="published" disabled={statusPending} className="text-xs px-3 py-1.5 rounded-md border border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-60">
              Publish
            </button>
          )}
          {policy.status === "published" && (
            <button name="status" value="draft" disabled={statusPending} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-60">
              Unpublish
            </button>
          )}
          {policy.status !== "archived" && (
            <button name="status" value="archived" disabled={statusPending} className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60">
              Archive
            </button>
          )}
        </form>
      </div>
    </li>
  );
}
