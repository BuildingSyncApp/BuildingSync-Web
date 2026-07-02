"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { registerUser } from "@/lib/auth-actions";
import { AuthShell } from "@/components/AuthShell";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { validatePostalAgainstRegion } from "@/lib/postal";

function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

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

type Step = 1 | 2 | 3 | 4;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Account" },
  { n: 2, label: "About you" },
  { n: 3, label: "Location" },
  { n: 4, label: "Verify" },
];

type RoleIntent = "resident_or_tenant" | "building_manager" | "other";

const DEFAULT_LOCATION: LocationValue = {
  postalCode: "",
  city: "",
  region: "CA-ON",
  latitude: null,
  longitude: null,
};

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Invite links land here as /signup?code=XXXXXX — prefill from the URL.
  const [inviteCode, setInviteCode] = useState(() => normalizeInviteCode(searchParams.get("code") ?? ""));
  const [roleIntent, setRoleIntent] = useState<RoleIntent>("resident_or_tenant");

  // BM-only verification fields
  const [companyName, setCompanyName] = useState("");
  const [managerType, setManagerType] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Location
  const [location, setLocation] = useState<LocationValue>(DEFAULT_LOCATION);

  // Verify
  const [isHuman, setIsHuman] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [companyHoneypot, setCompanyHoneypot] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const postalIssue = useMemo(
    () => (location.postalCode ? validatePostalAgainstRegion(location.postalCode, location.region) : null),
    [location.postalCode, location.region],
  );

  const isBM = roleIntent === "building_manager";

  const canStepOneNext = email.trim().length > 0 && strength.score >= 1;
  const canStepTwoNext =
    name.trim().length > 0 &&
    (!isBM || (companyName.trim().length > 0 && managerType.length > 0));
  // Location: required for BMs (verification needs an address); optional
  // for residents who joined via invite code (they inherit the building's
  // address). Required for residents without an invite code.
  const canStepThreeNext = isBM || inviteCode
    ? (isBM ? location.postalCode.trim().length > 0 && location.city.trim().length > 0 : true)
    : location.postalCode.trim().length > 0;
  const canSubmit = isHuman && agreedTerms && companyHoneypot === "";

  function next() {
    if (step === 1 && canStepOneNext) setStep(2);
    else if (step === 2 && canStepTwoNext) setStep(3);
    else if (step === 3 && canStepThreeNext) setStep(4);
  }
  function back() {
    if (step > 1) setStep((step - 1) as Step);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const code = inviteCode ? normalizeInviteCode(inviteCode) : null;
    const result = await registerUser({
      email,
      password,
      name,
      phone: phone || null,
      inviteCode: code && code.length === 6 ? code : null,
      region: location.region,
      postalCode: location.postalCode || null,
      city: location.city || null,
      latitude: location.latitude,
      longitude: location.longitude,
      // BM verification fields — admin reviews these in
      // /platform/verifications before flipping verifiedAt. The server
      // always creates the row as `resident`; role_intent is advisory.
      ...(isBM
        ? {
            company: companyName,
            managerType,
            businessNumber: businessNumber || null,
            licenseNumber: licenseNumber || null,
          }
        : {}),
    });
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }
    // Session is set server-side; land the user in the app. The portal
    // resolver routes by role from there.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      back={{ href: "/", label: "Home" }}
      rightSlot={
        <Link href="/signin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign in
        </Link>
      }
      width="wide"
    >
      <div>
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
          <Stepper current={step} />

          <AnimatePresence mode="wait">
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  {step === 1 && (
                    <StepAccount
                      email={email} setEmail={setEmail}
                      password={password} setPassword={setPassword}
                      showPassword={showPassword} setShowPassword={setShowPassword}
                      strength={strength}
                    />
                  )}
                  {step === 2 && (
                    <StepProfile
                      name={name} setName={setName}
                      phone={phone} setPhone={setPhone}
                      inviteCode={inviteCode} setInviteCode={setInviteCode}
                      roleIntent={roleIntent} setRoleIntent={setRoleIntent}
                      companyName={companyName} setCompanyName={setCompanyName}
                      managerType={managerType} setManagerType={setManagerType}
                      businessNumber={businessNumber} setBusinessNumber={setBusinessNumber}
                      licenseNumber={licenseNumber} setLicenseNumber={setLicenseNumber}
                    />
                  )}
                  {step === 3 && (
                    <StepLocation
                      location={location} setLocation={setLocation}
                      postalIssue={postalIssue}
                      isBM={isBM}
                      hasInviteCode={!!inviteCode}
                    />
                  )}
                  {step === 4 && (
                    <StepVerify
                      isHuman={isHuman} setIsHuman={setIsHuman}
                      agreedTerms={agreedTerms} setAgreedTerms={setAgreedTerms}
                      companyHoneypot={companyHoneypot} setCompanyHoneypot={setCompanyHoneypot}
                      email={email}
                      isBM={isBM}
                    />
                  )}

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

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={back}
                      disabled={step === 1}
                      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      ← Back
                    </button>
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={next}
                        disabled={
                          (step === 1 && !canStepOneNext) ||
                          (step === 2 && !canStepTwoNext) ||
                          (step === 3 && !canStepThreeNext)
                        }
                        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Continue →
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || !canSubmit}
                        className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? "Creating…" : "Create account"}
                      </button>
                    )}
                  </div>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Already have an account?{" "}
                    <Link href="/signin" className="text-accent hover:underline font-medium">
                      Sign in
                    </Link>
                  </p>
                </form>
              </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-2">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-2">Privacy Policy</Link>.
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/enterprise"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Need data residency or your own infrastructure? Advanced setup →
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Sign-up progress">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <li key={s.n} className="flex-1 flex items-center gap-2">
            <div
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                done
                  ? "bg-accent border-accent text-accent-foreground"
                  : active
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted-foreground bg-card"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? "✓" : s.n}
            </div>
            <span
              className={`hidden sm:inline text-xs font-medium ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${current > s.n ? "bg-accent" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

const inputClass =
  "w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors";

function StepAccount(props: {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  strength: { score: number; label: string };
}) {
  const { email, setEmail, password, setPassword, showPassword, setShowPassword, strength } = props;
  return (
    <>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
      <p className="text-sm text-muted-foreground -mt-1">Start with the Essential plan — $2.50 / unit / month.</p>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
        <input
          id="email" type="email" autoComplete="email" required placeholder="you@company.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
        <div className="relative">
          <input
            id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8}
            placeholder="At least 8 characters"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-14`}
          />
          <button
            type="button" onClick={() => setShowPassword(!showPassword)}
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
            <p className="text-xs text-muted-foreground">{strength.label && `Strength: ${strength.label}`}</p>
          </motion.div>
        )}
      </div>
    </>
  );
}

function StepProfile(props: {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  inviteCode: string; setInviteCode: (v: string) => void;
  roleIntent: RoleIntent; setRoleIntent: (v: RoleIntent) => void;
  companyName: string; setCompanyName: (v: string) => void;
  managerType: string; setManagerType: (v: string) => void;
  businessNumber: string; setBusinessNumber: (v: string) => void;
  licenseNumber: string; setLicenseNumber: (v: string) => void;
}) {
  const {
    name, setName, phone, setPhone, inviteCode, setInviteCode,
    roleIntent, setRoleIntent,
    companyName, setCompanyName, managerType, setManagerType,
    businessNumber, setBusinessNumber, licenseNumber, setLicenseNumber,
  } = props;
  const isBM = roleIntent === "building_manager";
  return (
    <>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Tell us about you</h1>
      <p className="text-sm text-muted-foreground -mt-1">This shows up on the requests and announcements you create.</p>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
        <input
          id="name" type="text" required maxLength={100} placeholder="Pat Doe"
          value={name} onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
          Phone <span className="text-muted-foreground/85 font-normal">(optional)</span>
        </label>
        <input
          id="phone" type="tel" maxLength={40} placeholder="+1 555 555 5555"
          value={phone} onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">I&apos;m signing up as</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              { value: "resident_or_tenant", label: "Resident / tenant", hint: "I live in the building" },
              { value: "building_manager", label: "Building manager", hint: "I manage the building" },
              { value: "other", label: "Other", hint: "Vendor, contractor, etc." },
            ] as Array<{ value: RoleIntent; label: string; hint: string }>
          ).map((opt) => (
            <label
              key={opt.value}
              className={`block cursor-pointer border rounded-md p-3 transition-colors ${
                roleIntent === opt.value
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="roleIntent"
                value={opt.value}
                checked={roleIntent === opt.value}
                onChange={() => setRoleIntent(opt.value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{opt.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {isBM ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
        >
          <p className="text-sm text-foreground">
            <strong>Building Manager accounts are verified by our admin team</strong> against
            the Ontario Business Registry (and CMRAO for condo managers) before activation.
            Provide the details below — they help us turn around the review faster.
          </p>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-1.5">
              Management company name
            </label>
            <input
              id="companyName" type="text" required maxLength={120} placeholder="Acme Property Management Inc."
              value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="managerType" className="block text-sm font-medium text-foreground mb-1.5">
              Manager type
            </label>
            <select
              id="managerType" required
              value={managerType} onChange={(e) => setManagerType(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose one…</option>
              <option value="cmrao_licensed">Licensed condo manager (CMRAO, Ontario)</option>
              <option value="management_firm">Incorporated property management firm</option>
              <option value="incorporated">Incorporated landlord (own buildings)</option>
              <option value="self_managed">Self-managing landlord (small portfolio)</option>
            </select>
          </div>
          <div>
            <label htmlFor="businessNumber" className="block text-sm font-medium text-foreground mb-1.5">
              Business Number (BN) <span className="text-muted-foreground/85 font-normal">(if incorporated)</span>
            </label>
            <input
              id="businessNumber" type="text" maxLength={20}
              placeholder="123456789RC0001"
              value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)}
              className={`${inputClass} font-mono`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Federal 9-digit Business Number. Verifiable at corporations.ic.gc.ca.
            </p>
          </div>
          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-foreground mb-1.5">
              CMRAO licence number <span className="text-muted-foreground/85 font-normal">(condo managers in Ontario)</span>
            </label>
            <input
              id="licenseNumber" type="text" maxLength={20}
              placeholder="L1234567"
              value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
              className={`${inputClass} font-mono`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Required under the Condominium Management Services Act, 2015. Verifiable at cmrao.ca.
            </p>
          </div>
        </motion.div>
      ) : (
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-foreground mb-1.5">
            Building invite code <span className="text-muted-foreground/85 font-normal">(optional)</span>
          </label>
          <input
            id="inviteCode" type="text" maxLength={6} placeholder="e.g. ABCDEF"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            autoCapitalize="characters"
            autoComplete="off"
            className={`${inputClass} font-mono tracking-widest uppercase`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Got a code from your Building Manager? Enter it to auto-link your account. Otherwise leave blank
            and your BM can add you manually later.
          </p>
        </div>
      )}
    </>
  );
}

function StepLocation({
  location,
  setLocation,
  postalIssue,
  isBM,
  hasInviteCode,
}: {
  location: LocationValue;
  setLocation: (v: LocationValue) => void;
  postalIssue: ReturnType<typeof validatePostalAgainstRegion>;
  isBM: boolean;
  hasInviteCode: boolean;
}) {
  return (
    <>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
        {isBM ? "Where do you operate?" : "Where do you live?"}
      </h1>
      <p className="text-sm text-muted-foreground -mt-1">
        {isBM
          ? "We verify your management company's address against the Ontario Business Registry. Drop a pin or type below."
          : hasInviteCode
          ? "Optional — your invite code already links you to a building. Add your location to help your building team confirm you."
          : "Tap on the map to mark your address, or fill the fields below. We'll match this to a building once your manager adds you."}
      </p>

      <LocationPicker value={location} onChange={setLocation} />

      {postalIssue && postalIssue.kind === "region_mismatch" && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-400">{postalIssue.message}</p>
          <button
            type="button"
            onClick={() => setLocation({ ...location, region: postalIssue.suggestedRegion })}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Switch region to {postalIssue.suggestedRegion} →
          </button>
        </div>
      )}
      {postalIssue && postalIssue.kind === "format" && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
          {postalIssue.message}
        </div>
      )}
    </>
  );
}

function StepVerify(props: {
  isHuman: boolean; setIsHuman: (v: boolean) => void;
  agreedTerms: boolean; setAgreedTerms: (v: boolean) => void;
  companyHoneypot: string; setCompanyHoneypot: (v: string) => void;
  email: string;
  isBM: boolean;
}) {
  const { isHuman, setIsHuman, agreedTerms, setAgreedTerms, companyHoneypot, setCompanyHoneypot, email, isBM } = props;
  return (
    <>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Quick check</h1>
      <p className="text-sm text-muted-foreground -mt-1">
        We&apos;ll send a confirmation link to <span className="text-foreground font-medium">{email}</span> — click it to verify your address.
      </p>

      {isBM && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold text-foreground">One more step for Building Managers</p>
          <p className="mt-1 text-muted-foreground leading-relaxed">
            After you confirm your email, our admin team will verify your management
            company against the Ontario Business Registry (and CMRAO for condo
            managers) before unlocking the staff portal. Typical turnaround: one
            business day.
          </p>
        </div>
      )}

      <div aria-hidden="true" className="absolute -left-2500 top-auto w-px h-px overflow-hidden">
        <label>
          Company website (leave blank)
          <input
            type="text" name="company_website" tabIndex={-1} autoComplete="off"
            value={companyHoneypot} onChange={(e) => setCompanyHoneypot(e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-start gap-3 p-4 rounded-md border border-border bg-background/40 cursor-pointer hover:border-accent/50 transition-colors">
        <input
          type="checkbox" checked={isHuman} onChange={(e) => setIsHuman(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-accent cursor-pointer"
        />
        <span className="text-sm text-foreground leading-relaxed">
          <span className="font-medium">I am human.</span>{" "}
          <span className="text-muted-foreground">Tick to confirm you&apos;re a real person creating this account yourself.</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-accent cursor-pointer"
        />
        <span className="text-sm text-muted-foreground leading-relaxed">
          I agree to the{" "}
          <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
        </span>
      </label>
    </>
  );
}
