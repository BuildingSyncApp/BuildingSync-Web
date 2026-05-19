"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { updateProfile, updatePassword, updateRegion } from "./actions";

type Result = { ok: true; message: string } | { ok: false; error: string } | null;

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

const buttonClass =
  "inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

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

export function ProfileForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string | null;
  defaultPhone: string | null;
}) {
  const [state, formAction, pending] = useActionState<Result, FormData>(updateProfile, null);

  useEffect(() => {
    if (state?.ok) toast.success("Profile saved");
    if (state && !state.ok) toast.error("Couldn't save profile", { description: state.error });
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-1.5">Display name</span>
        <input
          name="name"
          defaultValue={defaultName ?? ""}
          maxLength={100}
          placeholder="Your name"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-1.5">Phone</span>
        <input
          name="phone"
          type="tel"
          defaultValue={defaultPhone ?? ""}
          maxLength={40}
          placeholder="+1 555 555 5555"
          className={inputClass}
        />
      </label>

      <FormFeedback state={state} />

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

// Region + address (postal, city). Editable post-signup so users
// can correct what they entered or update after moving. Postal
// format + province cross-check applies; mismatch returns an error
// from the server action.
export function RegionForm({
  defaultRegion,
  defaultPostalCode,
  defaultCity,
}: {
  defaultRegion: string | null;
  defaultPostalCode: string | null;
  defaultCity: string | null;
}) {
  const [state, formAction, pending] = useActionState<Result, FormData>(updateRegion, null);

  useEffect(() => {
    if (state?.ok) toast.success("Region updated");
    if (state && !state.ok) toast.error("Couldn't save", { description: state.error });
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-foreground mb-1.5">Postal code</span>
          <input
            name="postalCode"
            type="text"
            defaultValue={defaultPostalCode ?? ""}
            maxLength={10}
            placeholder="M5V 3A8"
            autoCapitalize="characters"
            className={`${inputClass} font-mono uppercase`}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-foreground mb-1.5">City</span>
          <input
            name="city"
            type="text"
            defaultValue={defaultCity ?? ""}
            maxLength={80}
            placeholder="Toronto"
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-foreground mb-1.5">Region</span>
          <select
            name="region"
            defaultValue={defaultRegion ?? "CA-ON"}
            className={inputClass}
          >
            <option value="CA-ON">Ontario</option>
            <option value="CA-QC">Québec</option>
            <option value="CA-BC">British Columbia</option>
            <option value="CA-AB">Alberta</option>
            <option value="CA-MB">Manitoba</option>
            <option value="CA-SK">Saskatchewan</option>
            <option value="CA-NS">Nova Scotia</option>
            <option value="CA-NB">New Brunswick</option>
            <option value="CA-NL">Newfoundland &amp; Labrador</option>
            <option value="CA-PE">Prince Edward Island</option>
            <option value="CA-YT">Yukon</option>
            <option value="CA-NT">Northwest Territories</option>
            <option value="CA-NU">Nunavut</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Your region drives which laws and notice formats apply on the{" "}
        <a href="/legal" className="text-accent hover:underline">Legal &amp; compliance</a>{" "}
        page. Currently Ontario is fully supported; other regions are coming.
      </p>

      <FormFeedback state={state} />

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save region"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<Result, FormData>(updatePassword, null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Password updated", { description: "You'll use the new password next time." });
      setCurrentPassword("");
      setPassword("");
    }
    if (state && !state.ok) toast.error("Couldn't update password", { description: state.error });
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="account-current-password" className="block text-sm font-medium text-foreground mb-1.5">
          Current password
        </label>
        <input
          id="account-current-password"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Your existing password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="account-password" className="block text-sm font-medium text-foreground mb-1.5">
          New password
        </label>
        <div className="relative">
          <input
            id="account-password"
            name="password"
            type={showPassword ? "text" : "password"}
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-14`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 space-y-1.5"
          >
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
          </motion.div>
        )}
      </div>

      <FormFeedback state={state} />

      <button
        type="submit"
        disabled={pending || currentPassword.length === 0 || strength.score < 1}
        className={buttonClass}
      >
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

function FormFeedback({ state }: { state: Result }) {
  return (
    <AnimatePresence mode="wait">
      {state && state.ok === false && (
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
      {state && state.ok === true && (
        <motion.div
          key="ok"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          role="status"
          className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-accent"
        >
          {state.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
