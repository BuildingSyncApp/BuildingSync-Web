import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { isImpersonationConfigured } from "@/lib/impersonation";
import { Avatar } from "@/components/Avatar";
import { updateUser } from "./actions";
import { startImpersonation } from "@/app/platform/impersonate/actions";

const ROLES = [
  "resident",
  "tenant",
  "concierge",
  "facility_manager",
  "building_manager",
  "admin",
] as const;

export default async function UsersPage() {
  const { appUser } = await requirePlatformAdmin();
  const canImpersonate = isImpersonationConfigured();

  const [users, buildings] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { email: "asc" }],
      include: {
        building: { select: { name: true } },
        unitRel: { select: { unitNumber: true } },
      },
    }),
    prisma.building.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} total</p>
        </div>
        <Link href="/platform" className="text-sm text-muted-foreground hover:text-foreground">← Overview</Link>
      </div>

      <div className="mt-8 bg-card border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-5 font-semibold">Email</th>
              <th className="text-left py-3 px-5 font-semibold">Role</th>
              <th className="text-left py-3 px-5 font-semibold">Building</th>
              <th className="text-left py-3 px-5 font-semibold">Unit</th>
              <th className="text-left py-3 px-5 font-semibold">View as</th>
              <th className="text-right py-3 px-5 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const isMe = u.id === appUser.id;
              return (
                <tr key={u.id}>
                  <td className="py-3 px-5 align-top">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} email={u.email} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.name || u.email}</div>
                        {u.name && <div className="text-xs text-muted-foreground truncate">{u.email}</div>}
                        {isMe && <div className="text-[10px] uppercase tracking-wider text-accent mt-0.5">that&apos;s you</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 align-top">
                    <form action={updateUser} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="buildingId" value={u.buildingId ?? ""} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="px-2 py-1 rounded-md border border-border bg-input/30 text-sm focus:ring-2 focus:ring-ring outline-none"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="py-3 px-5 align-top">
                    <form action={updateUser} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="role" value={u.role} />
                      <select
                        name="buildingId"
                        defaultValue={u.buildingId ?? ""}
                        className="px-2 py-1 rounded-md border border-border bg-input/30 text-sm focus:ring-2 focus:ring-ring outline-none"
                      >
                        <option value="">— none —</option>
                        {buildings.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="py-3 px-5 align-top text-muted-foreground">
                    {u.unitRel ? `Unit ${u.unitRel.unitNumber}` : u.unit ? `Unit ${u.unit}` : "—"}
                  </td>
                  <td className="py-3 px-5 align-top">
                    {canImpersonate && !isMe && u.role !== "admin" ? (
                      <form action={startImpersonation}>
                        <input type="hidden" name="mode" value="user" />
                        <input type="hidden" name="targetUserId" value={u.id} />
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded-md border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
                          title="Open this user's portal as them (full act-as)"
                        >
                          View as
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-5 align-top text-right text-xs text-muted-foreground tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Unit assignment, invite-by-email, and CSV bulk-onboarding land post-launch.
      </p>
    </main>
  );
}
