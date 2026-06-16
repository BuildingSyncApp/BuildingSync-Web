import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { isImpersonationConfigured } from "@/lib/impersonation";
import { startImpersonation } from "./actions";

const PREVIEW_ROLES = [
  { value: "building_manager", label: "Building Manager → /team" },
  { value: "facility_manager", label: "Facility Manager → /team" },
  { value: "concierge", label: "Concierge → /team" },
  { value: "resident", label: "Resident → /dashboard" },
  { value: "tenant", label: "Tenant → /dashboard" },
] as const;

export default async function ImpersonatePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  await requirePlatformAdmin();
  const params = (await searchParams) || {};
  const configured = isImpersonationConfigured();
  const buildings = await prisma.building.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-2xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">View as a role</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview a portal as a generic role. <strong>Read-only</strong> — to act
            as a real person, use “View as” on the <Link href="/platform/users" className="text-accent hover:underline">Users</Link> page.
          </p>
        </div>
        <Link href="/platform" className="text-sm text-muted-foreground hover:text-foreground">← Overview</Link>
      </div>

      {params.error && (
        <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {params.error === "not_configured"
            ? "Impersonation isn't configured on this server (IMPERSONATION_SIGNING_SECRET missing)."
            : params.error === "no_building"
            ? "Pick a real building."
            : "Couldn't start the preview."}
        </p>
      )}

      {!configured ? (
        <p className="mt-8 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Set <code className="font-mono">IMPERSONATION_SIGNING_SECRET</code> to enable role preview.
        </p>
      ) : (
        <form action={startImpersonation} className="mt-8 bg-card border border-border rounded-md p-5 space-y-4">
          <input type="hidden" name="mode" value="role" />
          <div>
            <label htmlFor="role" className="block text-sm font-medium mb-1.5">Role</label>
            <select id="role" name="role" required className="w-full px-3 py-2 rounded-md border border-border bg-input/30 text-sm focus:ring-2 focus:ring-ring outline-none">
              {PREVIEW_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="buildingId" className="block text-sm font-medium mb-1.5">Building</label>
            <select id="buildingId" name="buildingId" required className="w-full px-3 py-2 rounded-md border border-border bg-input/30 text-sm focus:ring-2 focus:ring-ring outline-none">
              <option value="">— choose a building —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            Start read-only preview
          </button>
        </form>
      )}
    </main>
  );
}
