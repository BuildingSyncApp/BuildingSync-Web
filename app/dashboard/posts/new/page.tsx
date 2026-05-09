import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PostForm } from "./PostForm";

// Resident-authored community post — title, body, category. Posts a
// soft-deletable Post row scoped to the user's building. Author is
// the current user (server-side); the form does not let it be spoofed.

export default async function NewPostPage() {
  const { appUser } = await requireUser();
  if (!appUser.buildingId) redirect("/dashboard");

  return (
    <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto pb-12">
      <Link
        href="/dashboard/posts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to posts
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">New post</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Share with your neighbours. Posts are visible to everyone in your building.
      </p>

      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <PostForm />
      </div>
    </main>
  );
}
