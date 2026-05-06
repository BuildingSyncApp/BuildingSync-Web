"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function SignUpPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Bring users back to the same host they signed up from so the
        // session cookie is set on the right subdomain.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="max-w-sm space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="opacity-70">We sent a confirmation link to {email}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border bg-transparent"
            style={{ borderColor: "currentColor" }}
          />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border bg-transparent"
            style={{ borderColor: "currentColor" }}
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-md font-medium disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-sm opacity-70">
          Have an account? <Link href="/signin" className="underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
