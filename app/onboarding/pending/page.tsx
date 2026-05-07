import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Wordmark } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/SignOutButton";

// Hold page for Building Manager accounts awaiting admin verification.
// Other roles get bounced to their portal (FM/concierge to /team,
// resident/tenant to /dashboard, admin to /platform). Verified BMs get
// bounced to /team automatically — only pending BMs see this page.

export default async function PendingPage() {
  const { authUser, appUser } = await requireUser();

  // Anyone who isn't an unverified BM doesn't belong here.
  if (appUser.role !== "building_manager") {
    if (appUser.role === "facility_manager" || appUser.role === "concierge") redirect("/team");
    if (appUser.role === "admin") redirect("/platform");
    redirect("/dashboard");
  }
  if (appUser.verifiedAt) redirect("/team");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <Link href="/" className="flex items-baseline gap-2">
            <Wordmark className="text-base" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 py-12 md:py-20 max-w-2xl mx-auto w-full">
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 mb-5">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-300">
            Pending verification
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
            Your Building Manager account is under review
          </h1>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            BuildingSync verifies every Building Manager before they can manage residents, work orders, and announcements. A platform admin will review your account within one business day.
          </p>

          <dl className="mt-6 inline-block text-left text-sm">
            <div className="flex gap-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-mono">{authUser.email}</dd>
            </div>
            {appUser.name && (
              <div className="mt-1 flex gap-3">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{appUser.name}</dd>
              </div>
            )}
          </dl>

          <p className="mt-6 text-xs text-muted-foreground">
            Questions? Email{" "}
            <a href="mailto:info@buildingsync.app" className="text-accent hover:underline">
              info@buildingsync.app
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
