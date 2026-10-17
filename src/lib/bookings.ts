import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcPlatformFeeCents } from "@/lib/utils";

export type CreateBookingInput = {
  customerId: string;
  serviceId: string;
  startsAt: Date;
  addressLine: string;
  latitude?: number;
  longitude?: number;
  idempotencyKey?: string | null;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string; deduped: boolean }
  | { ok: false; code: "SLOT_TAKEN" | "SERVICE_NOT_FOUND" | "OUTSIDE_AVAILABILITY" | "INVALID_INPUT" | "UNKNOWN"; message: string };

/**
 * Create a booking transactionally.
 *
 * Concurrency model:
 * - The Postgres EXCLUDE constraint on Booking (see migrations/.../no_overlap.sql)
 *   makes it physically impossible for two non-cancelled bookings on the same
 *   washer to overlap. We catch the constraint-violation error (SQLSTATE 23P01)
 *   and translate it to a clean SLOT_TAKEN result.
 * - An idempotency key (typically from the request header) lets retries return
 *   the same booking instead of creating duplicates.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  if (!Number.isFinite(input.startsAt.getTime()) || input.startsAt <= new Date() || input.addressLine.trim().length < 3) {
    return { ok: false, code: "INVALID_INPUT", message: "Choose a future time and enter a valid address." };
  }
  // 1. Idempotency short-circuit.
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existing && existing.userId === input.customerId && existing.resource === "booking" && existing.resultId) {
      return { ok: true, bookingId: existing.resultId, deduped: true };
    }
  }

  // 2. Look up service + washer.
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    include: { washer: true },
  });
  if (!service || !service.active) {
    return { ok: false, code: "SERVICE_NOT_FOUND", message: "Service not found or inactive" };
  }

  const startsAt = input.startsAt;
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60 * 1000);

  // 3. Optional sanity check: starts within washer availability for that day.
  if (startsAt.toISOString().slice(0, 10) !== endsAt.toISOString().slice(0, 10)) {
    return { ok: false, code: "OUTSIDE_AVAILABILITY", message: "The whole booking must fit within one availability slot." };
  }
  const dow = startsAt.getUTCDay();
  const hh = startsAt.getUTCHours().toString().padStart(2, "0");
  const mm = startsAt.getUTCMinutes().toString().padStart(2, "0");
  const startHM = `${hh}:${mm}`;
  const endHM = endsAt.toISOString().slice(11, 16);
  const avail = await prisma.availability.findFirst({
    where: {
      washerId: service.washerId,
      dayOfWeek: dow,
      startTime: { lte: startHM },
      endTime: { gte: endHM },
    },
  });
  if (!avail || endsAt > new Date(`${startsAt.toISOString().slice(0, 10)}T${avail.endTime}:00Z`)) {
    return { ok: false, code: "OUTSIDE_AVAILABILITY", message: "Washer is not available at that time" };
  }

  const platformFeeCents = calcPlatformFeeCents(service.priceCents);

  // 4. Insert + record idempotency key in one transaction.
  try {
    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          customerId: input.customerId,
          washerId: service.washerId,
          serviceId: service.id,
          startsAt,
          endsAt,
          status: "PENDING",
          addressLine: input.addressLine,
          latitude: input.latitude,
          longitude: input.longitude,
          priceCents: service.priceCents,
          platformFeeCents,
        },
      });

      if (input.idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            key: input.idempotencyKey,
            userId: input.customerId,
            resource: "booking",
            resultId: created.id,
          },
        });
      }
      return created;
    });

    return { ok: true, bookingId: booking.id, deduped: false };
  } catch (err) {
    if (input.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key: input.idempotencyKey } });
      if (existing?.userId === input.customerId && existing.resource === "booking" && existing.resultId) {
        return { ok: true, bookingId: existing.resultId, deduped: true };
      }
    }
    // Prisma wraps Postgres errors. The exclusion-constraint violation surfaces
    // as P2010 with `code: '23P01'` in meta, OR (depending on Prisma version)
    // as PrismaClientKnownRequestError with that meta.
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = (err.meta ?? {}) as Record<string, unknown>;
      const sqlstate = (meta.code as string | undefined) ?? "";
      const msg = String(err.message ?? "");
      if (sqlstate === "23P01" || msg.includes("bookings_no_overlap") || msg.includes("23P01")) {
        return { ok: false, code: "SLOT_TAKEN", message: "That slot was just taken. Please pick another time." };
      }
    }
    console.error("createBooking failed:", err);
    return { ok: false, code: "UNKNOWN", message: "Could not create booking" };
  }
}
