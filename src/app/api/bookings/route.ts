import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/bookings";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.string().datetime(),
  addressLine: z.string().min(3),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const idempotencyKey = req.headers.get("idempotency-key");

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createBooking({
    customerId: session.user.id,
    serviceId: parsed.data.serviceId,
    startsAt: new Date(parsed.data.startsAt),
    addressLine: parsed.data.addressLine,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    idempotencyKey,
  });

  if (!result.ok) {
    const status = result.code === "SLOT_TAKEN" ? 409 : result.code === "SERVICE_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  return NextResponse.json({ bookingId: result.bookingId, deduped: result.deduped }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where:
      session.user.role === "WASHER"
        ? { washer: { userId: session.user.id } }
        : { customerId: session.user.id },
    include: { service: true, washer: { select: { id: true, user: { select: { name: true } } } } },
    orderBy: { startsAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ bookings });
}
