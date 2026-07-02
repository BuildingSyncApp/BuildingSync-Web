import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { toWirePayment } from "@/lib/me-mappers";

// GET /api/me/payments — the caller's current payment status. Matches the
// PaymentInfo schema in public/openapi.yaml. Returns the most recent unpaid
// payment if any, else the latest record, else a zeroed status.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getApiUser(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { userId: session.appUser.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    toWirePayment(payment) ?? { amountDue: 0, currency: "CAD", dueDate: null, daysUntilDue: null, autopay: false },
  );
}
