import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, getAppBaseUrl, isStripeEnabled } from "@/lib/stripe";
import { logAuditFireAndForget } from "@/lib/audit";

// Creates a Stripe Checkout Session for one month's rent. Server-side
// reads the active Lease to enforce the amount — the client cannot
// override it. Records a pending Payment row keyed by the session id;
// the webhook flips it to succeeded on checkout.session.completed.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: "Online rent payments are pending compliance approval and not yet available." },
        { status: 503 },
      );
    }

    const { authUser, appUser } = await requireUser();

    if (appUser.role !== "tenant") {
      return NextResponse.json({ error: "Only tenants can pay rent here" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { leaseId?: string };
    if (!body.leaseId) {
      return NextResponse.json({ error: "leaseId is required" }, { status: 400 });
    }

    const lease = await prisma.lease.findUnique({
      where: { id: body.leaseId },
      include: { unit: { select: { unitNumber: true } } },
    });
    if (!lease || lease.tenantId !== appUser.id) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }
    if (lease.archivedAt || lease.status === "archived") {
      return NextResponse.json({ error: "Lease is no longer active" }, { status: 409 });
    }
    if (lease.rentAmountMonthly <= 0) {
      return NextResponse.json({ error: "Lease rent amount is invalid" }, { status: 409 });
    }

    const baseUrl = getAppBaseUrl();
    const stripe = getStripe();
    const paymentId = randomUUID();

    // Stripe wants integer minor units (cents).
    const amountInCents = Math.round(lease.rentAmountMonthly * 100);
    // Canadian rent — RTA s.134 forbids passing fees to tenants, so the
    // platform absorbs Stripe fees on the receiving side.
    const currency = "cad";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: authUser.email,
      success_url: `${baseUrl}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/payments/cancel?session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Rent · Unit ${lease.unit.unitNumber}`,
              description: "Monthly rent payment via BuildingSync",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId,
        leaseId: lease.id,
        userId: appUser.id,
        buildingId: lease.buildingId,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
    }

    await prisma.payment.create({
      data: {
        id: paymentId,
        userId: appUser.id,
        buildingId: lease.buildingId,
        amount: lease.rentAmountMonthly,
        currency: currency.toUpperCase(),
        status: "pending",
        method: "card",
        stripeId: session.id,
        metadata: { leaseId: lease.id, sessionUrl: session.url },
      },
    });

    logAuditFireAndForget({
      userId: appUser.id,
      userEmail: authUser.email,
      buildingId: lease.buildingId,
      action: "payment_initiated",
      resource: "Payment",
      resourceId: paymentId,
      changes: { amount: lease.rentAmountMonthly, currency: currency.toUpperCase(), leaseId: lease.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
