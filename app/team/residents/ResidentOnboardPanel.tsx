"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AddResidentForm } from "./AddResidentForm";
import { BulkAddForm } from "./BulkAddForm";

// Three-tab onboarding panel for residents. Replaces the old two-equal-
// cards layout (single-add + bulk-CSV) with a clearer hierarchy:
//   1. Share invite link  — lowest friction, residents self-sign up
//   2. Add manually       — one-off, BM enters email
//   3. Bulk import        — CSV for existing rosters
// Defaults to the "share link" tab so the most-frequent action sits up
// front; defaults to expanded when the building has no residents yet.

type Tab = "invite" | "manual" | "bulk";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "invite", label: "Share link", hint: "Residents sign themselves up" },
  { id: "manual", label: "Add manually", hint: "One email at a time" },
  { id: "bulk", label: "Bulk import", hint: "Paste or upload CSV" },
];

export function ResidentOnboardPanel({
  units,
  inviteCode,
  signupBaseUrl,
  defaultOpen,
}: {
  units: Array<{ id: string; unitNumber: string }>;
  inviteCode: string | null;
  signupBaseUrl: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>("invite");

  const inviteLink = inviteCode ? `${signupBaseUrl}/signup?code=${inviteCode}` : null;

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Copy failed — select and copy manually"));
  }

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
        aria-expanded={open}
        aria-controls="onboard-body"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Add residents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Three ways in — share a link, add one at a time, or bulk-import.
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div id="onboard-body" className="border-t border-border">
          <nav
            className="flex items-center gap-2 px-5 pt-4 overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-label="Onboarding method"
          >
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`px-3.5 py-2 rounded-md border text-[11px] font-mono uppercase tracking-widest transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "border-accent text-accent bg-accent/5"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
          <p className="px-5 mt-2 text-[11px] text-muted-foreground">
            {TABS.find((t) => t.id === tab)?.hint}
          </p>

          <div className="px-5 py-5">
            {tab === "invite" && (
              <InviteTab code={inviteCode} link={inviteLink} onCopy={copy} />
            )}
            {tab === "manual" && (
              <div className="-mt-1">
                <AddResidentForm units={units} />
              </div>
            )}
            {tab === "bulk" && (
              <div className="-mt-1">
                <BulkAddForm />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function InviteTab({
  code,
  link,
  onCopy,
}: {
  code: string | null;
  link: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  if (!code) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-5">
        <p className="text-sm text-foreground font-medium">
          No invite code issued yet.
        </p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Generate one on the access-requests page, then share the code or
          link with residents — they enter it during sign-up and are
          auto-linked to your building.
        </p>
        <Link
          href="/team/access-requests"
          className="mt-4 inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          Issue invite code →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Invite code
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl md:text-3xl font-mono font-semibold tracking-widest tabular-nums select-all">
            {code}
          </span>
          <button
            type="button"
            onClick={() => onCopy(code, "Code")}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs transition-colors"
          >
            Copy code
          </button>
          {link && (
            <button
              type="button"
              onClick={() => onCopy(link, "Sign-up link")}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-muted text-xs transition-colors"
            >
              Copy sign-up link
            </button>
          )}
        </div>
      </div>
      {link && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Sign-up link
          </p>
          <code className="block bg-muted/40 border border-border rounded-md px-3 py-2 text-[11px] font-mono break-all text-foreground/85">
            {link}
          </code>
        </div>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Each resident enters the code during sign-up and lands in your
        building automatically. Rotate the code on{" "}
        <Link href="/team/access-requests" className="text-accent hover:underline">
          access requests
        </Link>{" "}
        when you want old links to stop working.
      </p>
    </div>
  );
}
