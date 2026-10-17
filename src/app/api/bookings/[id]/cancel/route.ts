import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { washer: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCustomer = booking.customerId === session.user.id;
  const isWasher = booking.washer.userId === session.user.id;
  if (!isCustomer && !isWasher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot cancel a completed/cancelled booking" }, { status: 400 });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });

  // TODO: trigger Stripe refund here (mocked).
  return NextResponse.json({ ok: true });
}
