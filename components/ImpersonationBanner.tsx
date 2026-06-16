import { getImpersonationContext } from "@/lib/impersonation-server";
import { stopImpersonation } from "@/app/platform/impersonate/actions";

// Persistent "you are viewing as someone else" bar. Server component so it
// can read the HttpOnly impersonation cookie; renders nothing for normal
// visitors (and on public pages), so it's safe to mount in the root layout.
export async function ImpersonationBanner() {
  const ctx = await getImpersonationContext();
  if (!ctx.active) return null;

  return (
    <div className="sticky top-0 z-80 bg-red-600 text-white" role="status" aria-live="polite">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-1.5 sm:py-2 flex items-center justify-center gap-3 text-center text-xs sm:text-sm">
        <span className="leading-snug">
          <strong className="font-semibold">Viewing as {ctx.targetLabel}</strong>
          <span className="opacity-90">
            {ctx.readOnly ? " — read-only preview" : " — acting as this user"}
          </span>
        </span>
        <form action={stopImpersonation}>
          <button
            type="submit"
            className="shrink-0 rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1 font-semibold transition-colors"
          >
            Exit
          </button>
        </form>
      </div>
    </div>
  );
}
