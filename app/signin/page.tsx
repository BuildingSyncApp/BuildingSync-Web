"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { resolvePortalUrl } from "./actions";

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

const primaryButton =
  "w-full inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground py-2.5 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Surface signed-out / reset-success toasts when the redirect lands
  // here from /auth/signout or /auth/reset.
  useEffect(() => {
    if (searchParams.get("signedout") === "1") {
      toast.success("Signed out", { description: "See you next time." });
    }
    if (searchParams.get("reset") === "1") {
      toast.success("Password updated", { description: "Sign in with your new password." });
    }
  }, [searchParams]);

  // Inline reset flow
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "email_not_confirmed") {
        setError("Check your inbox to confirm this email before signing in.");
      } else if (error.message.toLowerCase().includes("invalid login")) {
        setError("Email or password is incorrect. Try again, or use Forgot? to reset.");
      } else {
        setError(error.message);
      }
      return;
    }
    toast.success("Welcome back", { description: email });
    // Resolve destination on the server (knows the user's role + onboarding
    // state) so we navigate directly there instead of flashing through "/".
    let dest: string;
    try {
      dest = await resolvePortalUrl();
    } catch (err) {
      // Surface the real failure (DB connectivity, etc.) instead of silently
      // dumping the user on /dashboard — that masks prod issues.
      console.error("resolvePortalUrl failed", err);
      setError(
        err instanceof Error
          ? `Sign-in succeeded but routing failed: ${err.message}`
          : "Sign-in succeeded but the server couldn't determine your destination. Please refresh and try again.",
      );
      return;
    }
    // Hard navigation in all cases. router.push/refresh can race with the
    // freshly-set Supabase auth cookies, leaving the destination route
    // rendered without the new session and bouncing back to /signin.
    // window.location.href forces a full reload, guaranteeing every
    // subsequent request carries the cookies.
    window.location.href = dest;
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    setResetMessage(`Check ${resetEmail} for a password reset link. It expires in 1 hour.`);
  }

  function startReset() {
    setShowReset(true);
    setResetEmail(email);
    setResetError(null);
    setResetMessage(null);
  }

  return (
    <AuthShell
      back={{ href: "/", label: "Home" }}
      rightSlot={
        <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign up
        </Link>
      }
    >
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
        <AnimatePresence mode="wait" initial={false}>
          {!showReset ? (
            <motion.div
              key="signin"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Sign in</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Welcome back to BuildingSync.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    id="email" type="email" autoComplete="email" required
                    placeholder="you@company.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
                    <button type="button" onClick={startReset} className="text-sm text-accent hover:underline">
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                      required minLength={8} placeholder="Enter your password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-14`}
                    />
                    <button
                      type="button" onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <button type="submit" disabled={loading} className={primaryButton}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-accent hover:underline font-medium">Sign up</Link>
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}
            >
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Reset password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                We&apos;ll email you a one-time link to set a new password.
              </p>

              <form onSubmit={onReset} className="mt-6 space-y-4" noValidate>
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    id="reset-email" type="email" autoComplete="email" required
                    placeholder="you@company.com"
                    value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {resetError && (
                  <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                    {resetError}
                  </div>
                )}
                {resetMessage && (
                  <div role="status" className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent">
                    {resetMessage}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button type="button" onClick={() => setShowReset(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    ← Back to sign in
                  </button>
                  <button
                    type="submit" disabled={resetLoading || !resetEmail}
                    className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? "Sending…" : "Send reset link"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}
