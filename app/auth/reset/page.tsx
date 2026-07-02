"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { setPasswordWithToken } from "@/lib/auth-actions";
import { AuthShell } from "@/components/AuthShell";

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (pw.length === 0) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["", "Weak", "Fair", "Strong", "Excellent"][score];
  return { score: score as 0 | 1 | 2 | 3 | 4, label };
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetPageInner />
    </Suspense>
  );
}

function ResetPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The reset / invite email carries a signed, self-expiring token in the
  // query string (lib/auth-actions). `invite=1` distinguishes a first-time
  // account activation from a password reset, for copy only.
  const token = searchParams.get("token") ?? "";
  const isInvite = searchParams.get("invite") === "1";
  const ready = token.length > 0;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await setPasswordWithToken(token, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    // Session is set server-side on success; route into the app.
    setTimeout(() => {
      router.push("/?go=1");
      router.refresh();
    }, 1500);
  }

  return (
    <AuthShell back={{ href: "/signin", label: "Sign in" }}>
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent text-2xl">
                ✓
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                {isInvite ? "Account activated" : "Password updated"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Redirecting you to your dashboard…
              </p>
            </motion.div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {isInvite ? "Set your password" : "Set a new password"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {ready
                  ? isInvite
                    ? "Choose a password to activate your account."
                    : "Choose something you haven't used before."
                  : "This link is missing its token. Request a new one from the sign-in page."}
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={!ready}
                      className="w-full bg-background border border-border rounded-md px-3 py-2.5 pr-14 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((tier) => (
                          <div
                            key={tier}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              strength.score >= tier
                                ? strength.score >= 3
                                  ? "bg-accent"
                                  : "bg-yellow-500"
                                : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {strength.label && `Strength: ${strength.label}`}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !ready || strength.score < 1}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground py-2.5 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating…" : "Update password"}
                </button>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  <Link href="/signin" className="text-accent hover:underline font-medium">
                    ← Back to sign in
                  </Link>
                </p>
              </form>
            </>
          )}
      </div>
    </AuthShell>
  );
}
