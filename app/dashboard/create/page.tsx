import Link from "next/link";
import { requireUser } from "@/lib/auth";

// Center FAB destination — context-sensitive create surface for residents.
// Routes the user to the most common authoring flows. We could open a
// modal sheet on mobile in a later iteration; for now a full page keeps
// the bottom nav consistent.

type Action = {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
};

function ActionIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function CreatePage() {
  const { appUser } = await requireUser();

  const actions: Action[] = [
    {
      href: "/dashboard/maintenance#new",
      label: "Maintenance request",
      hint: "Report a repair or issue in your unit",
      icon: <ActionIcon d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />,
    },
    {
      href: "/dashboard/amenities",
      label: "Amenity reservation",
      hint: "Book a building amenity (pool, party room, BBQ)",
      icon: <ActionIcon d="M2 12h20 M12 12V2 M5 12a7 7 0 0 1 14 0" />,
    },
    {
      href: "/dashboard/posts/new",
      label: "Community post",
      hint: "Share with your neighbours",
      icon: <ActionIcon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    },
  ];

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
      <p className="mt-2 text-sm text-muted-foreground">What would you like to do?</p>

      <ul className="mt-6 space-y-2">
        {actions.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent transition-colors"
            >
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{a.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.hint}</div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>

      {appUser.role === "tenant" && (
        <p className="mt-6 text-xs text-muted-foreground">
          Looking to pay rent?{" "}
          <Link href="/dashboard/payments" className="text-accent hover:underline">
            Open payments
          </Link>
          .
        </p>
      )}
    </main>
  );
}
