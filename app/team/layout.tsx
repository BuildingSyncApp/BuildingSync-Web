import Link from "next/link";
import { requireTeam } from "@/lib/team";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { authUser, appUser } = await requireTeam();

  return (
    <div className="min-h-[100dvh]">
      <header
        className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: "currentColor" }}
      >
        <div className="flex items-center gap-6">
          <Link href="/team" className="font-semibold">BuildingSync · Team</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/team/work-orders" className="opacity-70 hover:opacity-100">Work orders</Link>
            <Link href="/team/residents" className="opacity-70 hover:opacity-100">Residents</Link>
            {appUser.role === "building_manager" && (
              <Link href="/team/announcements" className="opacity-70 hover:opacity-100">Announcements</Link>
            )}
            {(appUser.role === "concierge" || appUser.role === "building_manager") && (
              <Link href="/team/packages" className="opacity-70 hover:opacity-100">Packages</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-60">{authUser.email} · {appUser.role.replace("_", " ")}</span>
          <form action="/auth/signout" method="post">
            <button className="px-2 py-1 rounded-md border" style={{ borderColor: "currentColor" }}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
