"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

const ALLOWED_CATEGORIES = new Set([
  "general",
  "lost_and_found",
  "free_stuff",
  "swap",
  "recommendation",
]);

export type PostResult = { ok: false; error: string };

export async function createPost(formData: FormData): Promise<PostResult | void> {
  const { authUser, appUser } = await requireUser();

  if (!appUser.buildingId) {
    return { ok: false, error: "Your account isn't linked to a building yet." };
  }

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const category = String(formData.get("category") || "general").trim();

  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > 140) return { ok: false, error: "Title must be 140 characters or fewer." };
  if (!body) return { ok: false, error: "Add some details to your post." };
  if (body.length > 4000) return { ok: false, error: "Post body must be 4000 characters or fewer." };
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { ok: false, error: "Pick a valid category." };
  }

  const postId = randomUUID();
  await prisma.post.create({
    data: {
      id: postId,
      buildingId: appUser.buildingId,
      authorId: appUser.id,
      title,
      body,
      category,
    },
  });

  logAuditFireAndForget({
    userId: appUser.id,
    userEmail: authUser.email,
    buildingId: appUser.buildingId,
    action: "post_create",
    resource: "Post",
    resourceId: postId,
    changes: { title, category },
  });

  revalidatePath("/dashboard/posts");
  redirect("/dashboard/posts");
}
