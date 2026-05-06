import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AnnouncementsPage() {
  const { appUser } = await requireUser();

  const announcements = appUser.buildingId
    ? await prisma.announcement.findMany({
        where: { buildingId: appUser.buildingId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <main className="min-h-[100dvh] px-6 py-10 max-w-3xl mx-auto">
      <Link href="/dashboard" className="text-sm opacity-70 hover:opacity-100">← Back</Link>
      <h1 className="mt-4 text-3xl font-semibold">Announcements</h1>

      {!appUser.buildingId ? (
        <p className="mt-6 text-sm opacity-70">
          You'll see announcements once a Building Manager assigns you to a building.
        </p>
      ) : announcements.length === 0 ? (
        <p className="mt-6 text-sm opacity-70">No announcements yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="p-4 rounded-md border"
              style={{ borderColor: "currentColor" }}
            >
              <h2 className="font-medium">{a.title}</h2>
              <p className="mt-1 text-sm opacity-80 whitespace-pre-wrap">{a.body}</p>
              <p className="mt-2 text-xs opacity-50">
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
