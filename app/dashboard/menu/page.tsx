import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { roleLabel } from "@/components/RoleBadge";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getLocale } from "@/lib/locale-server";

// Mobile-only menu surface for resident/tenant. Mirrors what desktop
// gets from the AccountMenu dropdown — identity card, primary actions,
// settings (theme + locale), and sign-out. Bottom-tab nav routes here
// from the "Menu" tab.

type Item = { href: string; label: string; hint?: string; icon: React.ReactNode };

function ItemIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function MenuPage() {
  const { authUser, appUser } = await requireUser();
  const locale = await getLocale();

  const items: Item[] = [
    {
      href: "/dashboard/maintenance",
      label: "Maintenance requests",
      hint: "Submit and track repairs",
      icon: <ItemIcon d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />,
    },
    {
      href: "/dashboard/documents",
      label: "Documents",
      hint: "Bylaws, fire plans, building rules",
      icon: <ItemIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />,
    },
    {
      href: "/dashboard/account",
      label: "Account & profile",
      hint: "Update your name, email, password",
      icon: <ItemIcon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />,
    },
    ...(appUser.role === "tenant"
      ? [
          {
            href: "/dashboard/payments",
            label: "Pay rent",
            hint: "View and pay rent securely",
            icon: <ItemIcon d="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
          },
        ]
      : []),
  ];

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto pb-12">
      <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>

      <section className="mt-6 bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <Avatar name={appUser.name} email={authUser.email!} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{appUser.name || authUser.email}</div>
          <div className="text-xs text-muted-foreground truncate">{authUser.email}</div>
          <div className="mt-0.5 text-[10px] font-mono uppercase tracking-widest text-accent">
            {roleLabel(appUser.role)}
          </div>
        </div>
      </section>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-accent transition-colors"
            >
              <span className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{item.label}</div>
                {item.hint && (
                  <div className="text-xs text-muted-foreground mt-0.5">{item.hint}</div>
                )}
              </div>
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">
          Settings
        </p>
        <div className="mt-2 bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </div>
        <div className="mt-2 bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-sm">Language</span>
          <LocaleSwitcher current={locale} />
        </div>
      </section>

      <div className="mt-6">
        <SignOutButton fullWidth />
      </div>
    </main>
  );
}
