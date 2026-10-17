import Stripe from "stripe";

// Env-gated Stripe wrapper. If STRIPE_SECRET_KEY is unset, we return a mock
// that produces deterministic fake PaymentIntent IDs so the rest of the app
// (booking flow, dashboards, webhook handler) can run end-to-end without real
// Stripe credentials.

export type CheckoutResult = {
  paymentIntentId: string;
  clientSecret: string;
  mocked: boolean;
};

const realKey = process.env.DEMO_MODE === "false" ? process.env.STRIPE_SECRET_KEY?.trim() : undefined;
// Don't pin apiVersion — let the SDK use its bundled default to avoid type mismatches across SDK upgrades.
const stripe = realKey ? new Stripe(realKey) : null;
export const paymentsEnabled = !!stripe;

export async function createCheckoutPaymentIntent(args: {
  bookingId: string;
  amountCents: number;
  applicationFeeCents: number;
  connectedAccountId?: string | null;
  customerEmail?: string | null;
}): Promise<CheckoutResult> {
  if (!stripe) {
    // Mock path — no network call.
    const fakeId = `pi_mock_${args.bookingId}`;
    return {
      paymentIntentId: fakeId,
      clientSecret: `${fakeId}_secret_mock`,
      mocked: true,
    };
  }

  const params: Stripe.PaymentIntentCreateParams = {
    amount: args.amountCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { bookingId: args.bookingId },
    application_fee_amount: args.applicationFeeCents,
    receipt_email: args.customerEmail ?? undefined,
  };

  const requestOpts: Stripe.RequestOptions | undefined = args.connectedAccountId
    ? { stripeAccount: args.connectedAccountId }
    : undefined;

  const intent = await stripe.paymentIntents.create(params, requestOpts);

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret ?? "",
    mocked: false,
  };
}

export function verifyAndParseWebhook(rawBody: string, signature: string | null) {
  if (!stripe) {
    if (process.env.NODE_ENV === "production") return null;
    // Mock path: just JSON-parse, trust the body.
    try {
      return JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return null;
    }
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return null;
  }
}

export const stripeMocked = !stripe;
