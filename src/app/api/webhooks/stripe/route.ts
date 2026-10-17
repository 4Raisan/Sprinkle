import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAndParseWebhook, paymentsEnabled } from "@/lib/stripe";

export const runtime = "nodejs"; // signature verification needs the raw body

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. We only act on payment_intent.succeeded:
 * mark the matching booking CONFIRMED.
 *
 * In mock mode (no STRIPE_WEBHOOK_SECRET) the body is JSON-parsed without
 * signature verification — useful for local testing with curl.
 */
export async function POST(req: NextRequest) {
  if (!paymentsEnabled) return NextResponse.json({ error: "Payments are disabled in this demo." }, { status: 503 });
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const event = verifyAndParseWebhook(rawBody, signature);
  if (!event) return NextResponse.json({ error: "Invalid signature or body" }, { status: 400 });

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as { id: string; metadata?: { bookingId?: string } };
      const bookingId = intent.metadata?.bookingId;
      if (bookingId) {
        await prisma.booking.updateMany({
          where: { id: bookingId, stripePaymentIntentId: intent.id, status: "PENDING" },
          data: { status: "CONFIRMED" },
        }).catch(() => null);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as { id: string; metadata?: { bookingId?: string } };
      const bookingId = intent.metadata?.bookingId;
      if (bookingId) {
        // Could mark a payment_failed sub-state; for MVP, leave as PENDING.
        console.log(`Payment failed for booking ${bookingId}`);
      }
      break;
    }
    default:
      // ignore others
      break;
  }

  return NextResponse.json({ received: true });
}
