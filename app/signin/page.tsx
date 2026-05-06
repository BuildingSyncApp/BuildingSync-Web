"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const isAdminHost =
      typeof window !== "undefined" && window.location.host.startsWith("admin.");
    router.push(isAdminHost ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
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
            autoComplete="current-password"
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm opacity-70">
          New here? <Link href="/signup" className="underline">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
