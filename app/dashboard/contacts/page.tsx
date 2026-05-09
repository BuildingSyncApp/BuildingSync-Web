import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { roleLabel } from "@/components/RoleBadge";

// Building contacts directory — lists the staff a resident can reach
// (BM/FM/concierge in the same building). No new schema; this is a
// User query filtered by buildingId + staff roles.
const STAFF_ROLES = ["building_manager", "facility_manager", "concierge"] as const;

export default async function ContactsPage() {
  const { appUser } = await requireUser();

  const staff = appUser.buildingId
    ? await prisma.user
        .findMany({
          where: {
            buildingId: appUser.buildingId,
            role: { in: [...STAFF_ROLES] },
            archivedAt: null,
            isActive: true,
          },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true, email: true, role: true, phone: true },
        })
        .catch((err) => {
          console.error("[contacts] user.findMany failed", err);
          return [];
        })
    : [];

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your building&apos;s staff. Email or call them directly for anything urgent that isn&apos;t a maintenance request.
      </p>

      {staff.length === 0 ? (
        <div className="mt-6 bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          No staff contacts yet. Once your building manager activates their account, they&apos;ll appear here.
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {staff.map((s) => (
            <li key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Avatar name={s.name} email={s.email} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{s.name || s.email}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                  {roleLabel(s.role)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground truncate">{s.email}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`mailto:${s.email}`}
                  aria-label={`Email ${s.name || s.email}`}
                  className="w-9 h-9 rounded-md bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </a>
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    aria-label={`Call ${s.name || s.email}`}
                    className="w-9 h-9 rounded-md bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
