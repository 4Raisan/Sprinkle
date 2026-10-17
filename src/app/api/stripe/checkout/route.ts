import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutPaymentIntent, paymentsEnabled } from "@/lib/stripe";

/**
 * POST /api/stripe/checkout { bookingId }
 *
 * Creates a PaymentIntent for the given booking, splitting platform fee.
 * If STRIPE_SECRET_KEY is unset, returns a mocked PaymentIntent so the rest
 * of the flow (and the webhook handler) can run.
 */
export async function POST(req: NextRequest) {
  if (!paymentsEnabled) return NextResponse.json({ error: "Payments are disabled in this demo." }, { status: 503 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { washer: true, customer: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.customerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: `Booking is ${booking.status}` }, { status: 400 });
  }

  const result = await createCheckoutPaymentIntent({
    bookingId: booking.id,
    amountCents: booking.priceCents,
    applicationFeeCents: booking.platformFeeCents,
    connectedAccountId: booking.washer.stripeAccountId,
    customerEmail: booking.customer.email,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripePaymentIntentId: result.paymentIntentId },
  });

  return NextResponse.json({
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
    mocked: result.mocked,
  });
}
