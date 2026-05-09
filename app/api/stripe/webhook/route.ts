import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logAuditFireAndForget } from "@/lib/audit";

// Stripe webhook endpoint. Verifies the signature, then handles only
// the events we care about for R1 rent (checkout.session.completed,
// checkout.session.expired, payment_intent.payment_failed). Idempotent:
// each handler only mutates a Payment row when its current status is
// "pending", so retries are safe.

export const dynamic = "force-dynamic";
// Don't let Next.js parse the body — Stripe needs the raw bytes for
// signature verification.
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    // 410 Gone — the webhook is intentionally disabled while compliance
    // review is pending. Stripe won't be sending us anything anyway since
    // the merchant account isn't live, but reject defensively.
    return NextResponse.json(
      { error: "Webhook is disabled while compliance review is pending." },
      { status: 410 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await handleExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await handleFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        // Ignore other events for R1.
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler failed", { type: event.type, err });
    // Return 500 so Stripe retries — they back off automatically.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCompleted(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) {
    console.warn("[stripe/webhook] checkout.session.completed missing paymentId metadata");
    return;
  }
  // updateMany lets us scope to status:'pending' for idempotency.
  const result = await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "succeeded", paidAt: new Date() },
  });
  if (result.count === 0) {
    // Already processed — common in webhook retries.
    return;
  }
  logAuditFireAndForget({
    userId: session.metadata?.userId || null,
    userEmail: session.customer_details?.email ?? null,
    buildingId: session.metadata?.buildingId || null,
    action: "payment_succeeded",
    resource: "Payment",
    resourceId: paymentId,
    changes: { stripeSessionId: session.id, amountTotal: session.amount_total },
  });
}

async function handleExpired(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;
  const result = await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "failed" },
  });
  if (result.count === 0) return;
  logAuditFireAndForget({
    userId: session.metadata?.userId || null,
    buildingId: session.metadata?.buildingId || null,
    action: "payment_expired",
    resource: "Payment",
    resourceId: paymentId,
    status: "error",
  });
}

async function handleFailed(intent: Stripe.PaymentIntent) {
  // PaymentIntent doesn't have our paymentId metadata directly; pull
  // it from the related session via the latest_charge if available.
  // Cheapest path: skip if we can't link, since checkout.session.expired
  // covers user-side failures already.
  const paymentId = intent.metadata?.paymentId;
  if (!paymentId) return;
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "failed" },
  });
}
