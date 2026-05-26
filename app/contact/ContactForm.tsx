"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Topic = "pilot" | "enterprise" | "support" | "press" | "other";

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

const TOPICS: { value: Topic; label: string }[] = [
  { value: "pilot", label: "Pilot interest" },
  { value: "enterprise", label: "Enterprise / Government" },
  { value: "support", label: "Support" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

export function ContactForm({ defaultTopic = "other" }: { defaultTopic?: Topic }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>(defaultTopic);
  const [message, setMessage] = useState("");
  // Honeypot field — hidden from real users; spam bots will fill it.
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, company }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "send_failed");
      }
      setDone(true);
      toast.success("Message sent", { description: "We usually reply within a business day." });
    } catch (err) {
      toast.error("Couldn't send", {
        description: err instanceof Error ? err.message : "Try again or email info@buildingsync.app.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-accent/40 bg-accent/5 p-6 text-sm"
      >
        <p className="font-semibold text-accent">Got it — message sent.</p>
        <p className="mt-2 text-muted-foreground">
          A reply will land in <span className="font-medium text-foreground">{email}</span> within
          a business day. For anything urgent, email{" "}
          <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
            info@buildingsync.app
          </a>{" "}
          directly.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            placeholder="Jane Doe"
            className={inputClass}
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            className={inputClass}
            autoComplete="email"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">What&apos;s this about?</span>
        <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className={inputClass}>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          placeholder="A bit about your building, your timeline, what you're trying to solve…"
          className={inputClass + " resize-none"}
        />
        <span className="mt-1 block text-xs text-muted-foreground">{message.length}/4000</span>
      </label>

      {/* Honeypot — visually hidden but still submitted by bots that fill all fields. */}
      <div aria-hidden="true" className="absolute -left-10000 h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
      </div>

      <AnimatePresence>
        <motion.button
          key="submit"
          type="submit"
          disabled={submitting || !name.trim() || !email.trim() || message.trim().length < 10}
          className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Sending…" : "Send message"}
        </motion.button>
      </AnimatePresence>

      <p className="text-xs text-muted-foreground">
        Or email{" "}
        <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
          info@buildingsync.app
        </a>{" "}
        directly. We don&apos;t share your details with anyone.
      </p>
    </form>
  );
}
