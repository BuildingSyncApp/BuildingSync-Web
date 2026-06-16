import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import { StatusPill } from "@/components/StatusPill";
import { roleLabel } from "@/components/RoleBadge";
import { can } from "@/lib/permissions";
import { AddStaffForm } from "./AddStaffForm";
import { StaffRowActions } from "./StaffRowActions";

const STAFF_ROLES = ["facility_manager", "concierge"] as const;

export default async function TeamStaffPage() {
  const { appUser } = await requireTeam();

  // BM-only page. Other team roles get bumped back to /team.
  if (!can(appUser, "staff.manage")) redirect("/team");

  if (!appUser.buildingId) {
    return (
      <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">Staff</h1>
        <p className="mt-3 text-sm text-muted-foreground">No building assigned to your account.</p>
      </main>
    );
  }

  const staff = await prisma.user.findMany({
    where: {
      buildingId: appUser.buildingId,
      role: { in: [...STAFF_ROLES] },
      archivedAt: null,
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <main className="px-4 md:px-6 py-8 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Staff</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {staff.length} facility manager{staff.length === 1 ? "" : "s"} and concierge{staff.length === 1 ? "" : "s"} in this building
      </p>

      <section className="mt-8 bg-card border border-border rounded-md p-5">
        <h2 className="text-base font-semibold">Hire a staff member</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates an account and links it to this building. They sign in at /signin.
        </p>
        <AddStaffForm />
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Building team</h2>
        {staff.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon="users"
              title="No staff yet"
              description="Add a facility manager or concierge above with their email — they'll get a welcome with sign-in instructions."
            />
          </div>
        ) : (
          <div className="mt-3 bg-card border border-border rounded-md overflow-hidden">
            <ul className="divide-y divide-border">
              {staff.map((s) => (
                <li key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={s.name} email={s.email} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name || s.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!s.lastLoginAt && (
                      <span className="hidden sm:inline text-xs text-muted-foreground">
                        Hasn&apos;t signed in yet
                      </span>
                    )}
                    <StatusPill
                      label={roleLabel(s.role)}
                      tone={s.role === "facility_manager" ? "blue" : "violet"}
                    />
                    <StaffRowActions
                      userId={s.id}
                      email={s.email}
                      name={s.name}
                      role={s.role as "facility_manager" | "concierge"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
