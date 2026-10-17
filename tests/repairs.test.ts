import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { createBooking } from "../src/lib/bookings";
import { availabilitySlotSchema, serviceSchema } from "../src/lib/validation";

const restore: (() => void)[] = [];
function stub(object: any, name: string, implementation: (...args: any[]) => any) {
  const original = object[name];
  const fn = mock.fn(implementation);
  object[name] = fn;
  restore.push(() => { object[name] = original; });
  return fn;
}
afterEach(() => { while (restore.length) restore.pop()!(); mock.restoreAll(); });

const future = () => {
  const date = new Date(Date.now() + 7 * 86400000);
  date.setUTCHours(10, 0, 0, 0);
  return date;
};
const input = () => ({ customerId: "customer", serviceId: "service", startsAt: future(), addressLine: "123 Demo Street" });
const service = { id: "service", washerId: "washer", active: true, durationMin: 60, priceCents: 3000 };

test("booking rejects past and invalid dates before querying the database", async () => {
  const query = stub(prisma.service, "findUnique", async () => { throw Error("Unexpected database query"); });
  for (const startsAt of [new Date(0), new Date("invalid")]) {
    const result = await createBooking({ ...input(), startsAt });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_INPUT");
  }
  assert.equal(query.mock.callCount(), 0);
});

test("the complete service duration must fit within availability", async () => {
  stub(prisma.service, "findUnique", async () => service);
  stub(prisma.availability, "findFirst", async () => ({ endTime: "10:30" }));
  const tx = stub(prisma, "$transaction", async () => { throw Error("Unexpected booking insert"); });
  const result = await createBooking(input());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "OUTSIDE_AVAILABILITY");
  assert.equal(tx.mock.callCount(), 0);
});

test("booking checks availability in UTC and creates a pending reservation", async () => {
  const data = input();
  stub(prisma.service, "findUnique", async () => service);
  const availability = stub(prisma.availability, "findFirst", async () => ({ endTime: "18:00" }));
  let inserted: any;
  stub(prisma, "$transaction", async (callback: any) => callback({
    booking: { create: async (args: any) => { inserted = args.data; return { id: "new-booking" }; } },
  }));
  assert.deepEqual(await createBooking(data), { ok: true, bookingId: "new-booking", deduped: false });
  assert.equal(inserted.status, "PENDING");
  assert.equal(inserted.endsAt.getTime() - inserted.startsAt.getTime(), 3600000);
  const args = availability.mock.calls[0].arguments[0] as any;
  assert.equal(args.where.dayOfWeek, data.startsAt.getUTCDay());
  assert.equal(args.where.endTime.gte, "11:00");
});

test("overlapping bookings return a friendly conflict", async () => {
  stub(prisma.service, "findUnique", async () => service);
  stub(prisma.availability, "findFirst", async () => ({ endTime: "18:00" }));
  stub(prisma, "$transaction", async () => {
    throw new Prisma.PrismaClientKnownRequestError("bookings_no_overlap", {
      code: "P2004", clientVersion: "5.22.0", meta: { code: "23P01" },
    });
  });
  const result = await createBooking(input());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "SLOT_TAKEN");
});

test("a concurrent retry recovers the already created booking", async () => {
  let queries = 0;
  stub(prisma.idempotencyKey, "findUnique", async () => ++queries === 1 ? null : {
    userId: "customer", resource: "booking", resultId: "original-booking",
  });
  stub(prisma.service, "findUnique", async () => service);
  stub(prisma.availability, "findFirst", async () => ({ endTime: "18:00" }));
  stub(prisma, "$transaction", async () => {
    throw new Prisma.PrismaClientKnownRequestError("duplicate key", { code: "P2002", clientVersion: "5.22.0" });
  });
  assert.deepEqual(await createBooking({ ...input(), idempotencyKey: "same-request" }), {
    ok: true, bookingId: "original-booking", deduped: true,
  });
});

test("invalid availability and negative services are rejected", () => {
  for (const slot of [
    { dayOfWeek: 1, startTime: "25:00", endTime: "26:00" },
    { dayOfWeek: 1, startTime: "18:00", endTime: "09:00" },
    { dayOfWeek: 7, startTime: "09:00", endTime: "18:00" },
  ]) assert.equal(availabilitySlotSchema.safeParse(slot).success, false);
  assert.equal(serviceSchema.safeParse({ name: "Wash", durationMin: -1, priceCents: -100 }).success, false);
});

test("production demo rejects forged payment webhooks", async () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    const { verifyAndParseWebhook, paymentsEnabled } = await import("../src/lib/stripe");
    assert.equal(paymentsEnabled, false);
    assert.equal(verifyAndParseWebhook(JSON.stringify({ type: "payment_intent.succeeded" }), null), null);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});
