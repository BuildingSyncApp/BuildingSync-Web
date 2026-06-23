import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { isFeatureEnabled } from "@/lib/ai-metering";
import { PolicyManager, type PolicyView } from "./PolicyManager";

// BM-facing per-building policy management. The building authors and controls
// its own policies; AI assists (metered) when the Insight tier is enabled. Only
// policy.manage (BM) may write; others get a read-only view of published ones.

export default async function TeamPoliciesPage() {
  const { appUser } = await requireTeam();

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Policies</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const canManage = can(appUser, "policy.manage");

  const building = await prisma.building.findUnique({
    where: { id: appUser.buildingId },
    select: { enabledModules: true },
  });
  const aiEnabled = isFeatureEnabled("policy_assist", building?.enabledModules);

  const policies = await prisma.policy.findMany({
    where: canManage
      ? { buildingId: appUser.buildingId }
      : { buildingId: appUser.buildingId, status: "published" },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const views: PolicyView[] = policies.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    body: p.body,
    status: p.status,
    aiAssisted: p.aiAssisted,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Policies</h1>
        {!canManage && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-border bg-muted/30 text-muted-foreground">
            View only
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your building&apos;s house rules — pets, quiet hours, parking, amenities, and more.
        {canManage
          ? aiEnabled
            ? " Draft with AI assist (metered), then review and publish."
            : " AI assist (Insight tier) isn’t enabled for this building."
          : " Published policies are shown below."}
      </p>

      <div className="mt-8">
        {canManage ? (
          <PolicyManager policies={views} aiEnabled={aiEnabled} />
        ) : views.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            No published policies yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {views.map((p) => (
              <li key={p.id} className="rounded-md border border-border bg-card p-4">
                <h3 className="font-medium">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
