import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getImpersonationContext } from "@/lib/impersonation-server";

interface LogAuditArgs {
  userId: string | null;
  userEmail?: string | null;
  action: string; // free-form verb: "create", "role_change", "status_change", "password_reset", etc.
  resource: "User" | "WorkOrder" | "Announcement" | "Building" | "Unit" | "Lease" | "Payment" | string;
  resourceId?: string | null;
  buildingId?: string | null;
  changes?: Record<string, unknown> | null;
  status?: "success" | "error";
  errorMessage?: string | null;
}

// Append-only audit trail. Matches the live DB AuditLog shape (userId/
// resource/resourceId/changes/status). Calls are fire-and-forget —
// a failed audit write must never block the user-facing action.
export async function logAudit(args: LogAuditArgs): Promise<void> {
  try {
    const reqHeaders = await headers().catch(() => null);
    const ipAddress =
      reqHeaders?.get("x-forwarded-for")?.split(",")[0].trim() ||
      reqHeaders?.get("x-real-ip") ||
      null;
    const userAgent = reqHeaders?.get("user-agent") ?? null;

    // When the action ran under an admin impersonation, stamp the real
    // human so the trail never loses who actually acted (data writes still
    // attribute to the impersonated target). Memoized + token-only, so this
    // is cheap and never throws outside a request.
    let changes = args.changes;
    try {
      const imp = await getImpersonationContext();
      if (imp.active) {
        changes = {
          ...(changes ?? {}),
          _actingAdmin: { adminId: imp.adminId, adminEmail: imp.adminEmail, mode: imp.mode },
        };
      }
    } catch {
      /* no request context (e.g. a script) — skip attribution */
    }

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: args.userId,
        userEmail: args.userEmail ?? null,
        buildingId: args.buildingId ?? null,
        action: args.action,
        resource: args.resource,
        resourceId: args.resourceId ?? null,
        changes:
          changes === undefined || changes === null
            ? Prisma.DbNull
            : (changes as Prisma.InputJsonValue),
        ipAddress,
        userAgent,
        status: args.status ?? "success",
        errorMessage: args.errorMessage ?? null,
      },
    });
  } catch (err) {
    // Don't crash the calling action if the audit write fails.
    console.error("[audit] failed to record event", { args, err });
  }
}

// Fire-and-forget wrapper — most callers should use this so a slow
// audit write doesn't block the request.
export function logAuditFireAndForget(args: LogAuditArgs): void {
  void logAudit(args);
}
