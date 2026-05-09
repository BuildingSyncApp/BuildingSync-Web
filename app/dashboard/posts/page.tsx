import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { formatRelative } from "@/lib/format";

export default async function PostsPage() {
  const { appUser } = await requireUser();

  const posts = appUser.buildingId
    ? await prisma.post
        .findMany({
          where: { buildingId: appUser.buildingId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            author: { select: { name: true, email: true } },
          },
        })
        .catch(() => [])
    : [];

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <Link
          href="/dashboard/posts/new"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          New post
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          No community posts yet. Share lost-and-found items, swaps, or neighbourhood updates with
          your building.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={p.author?.name}
                  email={p.author?.email || ""}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {p.author?.name || p.author?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelative(p.createdAt)}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {p.category}
                </span>
              </div>
              <h2 className="mt-3 font-semibold leading-snug">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
