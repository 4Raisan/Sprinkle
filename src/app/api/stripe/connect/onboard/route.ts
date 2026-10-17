import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * POST /api/stripe/connect/onboard
 *
 * STUB: in production this would create an Express connected account via
 * `stripe.accounts.create({ type: 'express' })`, then return an account-link
 * URL the washer is redirected to. For the MVP we just stash a fake account
 * id so the rest of the flow can proceed.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "WASHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ error: "Payout onboarding is not available in this demo." }, { status: 503 });
}
