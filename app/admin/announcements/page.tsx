import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AnnouncementForm } from "./AnnouncementForm";

export default async function AdminAnnouncementsPage() {
  const { appUser } = await requireAdmin();
  if (appUser.role !== "building_manager") redirect("/admin");

  const announcements = appUser.buildingId
    ? await prisma.announcement.findMany({
        where: { buildingId: appUser.buildingId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Announcements</h1>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Post a new announcement</h2>
        <AnnouncementForm hasBuilding={Boolean(appUser.buildingId)} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Posted</h2>
        {announcements.length === 0 ? (
          <p className="mt-2 text-sm opacity-70">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className="p-3 rounded-md border" style={{ borderColor: "currentColor" }}>
                <h3 className="font-medium">{a.title}</h3>
                <p className="mt-1 text-sm opacity-80 whitespace-pre-wrap">{a.body}</p>
                <p className="mt-2 text-xs opacity-50">{new Date(a.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
